import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { AI_MODELS } from "@/lib/ai-models.server";

const DEFAULT_CHAT_TIMEOUT_MS = 30_000;
const DEFAULT_CHAT_MAX_RETRIES = 1;

export class ProviderTimeoutError extends Error {
  readonly code = "provider_timeout";

  constructor() {
    super("O provider não respondeu dentro do tempo limite.");
    this.name = "ProviderTimeoutError";
  }
}

export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  return key;
}

export function isTransientProviderStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export function chatProviderTimeoutMs(): number {
  const configured = Number(process.env.OPENROUTER_CHAT_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 1_000
    ? Math.min(configured, 120_000)
    : DEFAULT_CHAT_TIMEOUT_MS;
}

export function chatProviderMaxRetries(): number {
  const configured = Number(process.env.OPENROUTER_CHAT_MAX_RETRIES);
  return Number.isInteger(configured) && configured >= 0
    ? Math.min(configured, 2)
    : DEFAULT_CHAT_MAX_RETRIES;
}

function providerLog(input: {
  requestId: string;
  model: string;
  attempt: number;
  status: number | "network_error" | "timeout";
}) {
  console.info(
    JSON.stringify({
      level: "info",
      type: "provider_attempt",
      provider: "openrouter",
      model: input.model,
      attempt: input.attempt,
      status: input.status,
      request_id: input.requestId,
    }),
  );
}

async function fetchWithTimeout(
  baseFetch: typeof fetch,
  input: Parameters<typeof fetch>[0],
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const sourceSignal = init.signal;
  const forwardAbort = () => controller.abort(sourceSignal?.reason);
  if (sourceSignal?.aborted) forwardAbort();
  else sourceSignal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new ProviderTimeoutError());
  }, timeoutMs);

  try {
    return await baseFetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new ProviderTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
    sourceSignal?.removeEventListener("abort", forwardAbort);
  }
}

export function createChatProviderFetch(
  baseFetch: typeof fetch,
  options: {
    requestId: string;
    primaryModel?: string;
    fallbackModel?: string;
    timeoutMs?: number;
    maxRetries?: number;
  },
): typeof fetch {
  const primaryModel = options.primaryModel ?? AI_MODELS.chat;
  const fallbackModel = options.fallbackModel ?? AI_MODELS.chatFallback;
  const timeoutMs = options.timeoutMs ?? chatProviderTimeoutMs();
  const maxRetries = options.maxRetries ?? chatProviderMaxRetries();

  return async (input, init = {}) => {
    if (typeof init.body !== "string") {
      return fetchWithTimeout(baseFetch, input, init, timeoutMs);
    }

    let parsed: { model?: string } & Record<string, unknown>;
    try {
      parsed = JSON.parse(init.body);
    } catch {
      return fetchWithTimeout(baseFetch, input, init, timeoutMs);
    }

    const initialModel = parsed.model;
    if (!initialModel) return fetchWithTimeout(baseFetch, input, init, timeoutMs);
    const fallbackForModel =
      initialModel === AI_MODELS.vision
        ? AI_MODELS.visionFallback
        : initialModel === AI_MODELS.documents
          ? AI_MODELS.documentsFallback
          : fallbackModel;
    const attempts = maxRetries + 1;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const model = attempt === 1 ? initialModel : fallbackForModel;
      const headers = new Headers(init.headers);
      headers.set("x-request-id", options.requestId);

      try {
        const response = await fetchWithTimeout(
          baseFetch,
          input,
          {
            ...init,
            headers,
            body: JSON.stringify({ ...parsed, model }),
          },
          timeoutMs,
        );
        providerLog({ requestId: options.requestId, model, attempt, status: response.status });
        if (response.ok || !isTransientProviderStatus(response.status) || attempt === attempts) {
          return response;
        }
        await response.body?.cancel();
      } catch (error) {
        const timeout = error instanceof ProviderTimeoutError;
        providerLog({
          requestId: options.requestId,
          model,
          attempt,
          status: timeout ? "timeout" : "network_error",
        });
        if (init.signal?.aborted || attempt === attempts) throw error;
      }
    }

    throw new Error("Provider retry loop ended unexpectedly");
  };
}

export function providerFailureStatus(error: unknown): 502 | 503 | 504 {
  if (error instanceof ProviderTimeoutError) return 504;
  const statusCode =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number(error.statusCode)
      : undefined;
  if (statusCode === 408 || statusCode === 504) return 504;
  if (statusCode === 429) return 503;
  return 502;
}

export function providerFailureMessage(error: unknown, requestId: string): string {
  const status = providerFailureStatus(error);
  const reason =
    status === 504
      ? "O provider excedeu o tempo limite."
      : status === 503
        ? "O provider está temporariamente indisponível."
        : "O provider recusou ou interrompeu a resposta.";
  return `${reason} Referência: ${requestId}`;
}

export function createOpenRouterProvider(options: { requestId?: string } = {}) {
  const requestId = options.requestId ?? crypto.randomUUID();
  return createOpenAICompatible({
    name: "openrouter",
    apiKey: getOpenRouterApiKey(),
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer":
        process.env.OPENROUTER_SITE_URL ??
        process.env.APP_PUBLIC_URL ??
        "https://kallistis-kallistis.local",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "Kallistis Totalidade",
      "X-Request-ID": requestId,
    },
    fetch: createChatProviderFetch(fetch, { requestId }),
  });
}
