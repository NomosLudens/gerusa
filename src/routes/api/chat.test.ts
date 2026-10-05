import { afterEach, describe, expect, it, vi } from "vitest";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const THREAD_ID = "22222222-2222-4222-8222-222222222222";
const USER_MESSAGE_ID = "33333333-3333-4333-8333-333333333333";
const ASSISTANT_MESSAGE_ID = "44444444-4444-4444-8444-444444444444";

function envelope() {
  return {
    threadId: THREAD_ID,
    facet: "kallistis",
    surface: "kallistis",
    mode: "default",
    messages: [{ id: USER_MESSAGE_ID, role: "user", parts: [{ type: "text", text: "oi" }] }],
    assistantMessageId: ASSISTANT_MESSAGE_ID,
  };
}

function chatRequest() {
  return new Request("https://example.test/api/chat", {
    method: "POST",
    headers: { cookie: "kallistis_session=token", "content-type": "application/json" },
    body: JSON.stringify(envelope()),
  });
}

afterEach(() => {
  vi.doUnmock("@/server/chat/kallistis-chat-runtime");
  vi.doUnmock("@/lib/openrouter.server");
  vi.doUnmock("@/lib/rate-limit");
  vi.doUnmock("@supabase/supabase-js");
  vi.resetModules();
  vi.restoreAllMocks();
});

async function setupChat(input: {
  inspection?: { kind: "ready"; latestUserText: string } | { kind: "blocked"; message: string };
  prepareError?: { code: string; status: number; stage: string };
  providerThrows?: boolean;
  directAssistantReply?: string;
}) {
  const inspectKallistisTurn = vi.fn(
    async () => input.inspection ?? { kind: "ready", latestUserText: "oi" },
  );
  class KallistisChatError extends Error {
    code: string;
    status: number;
    stage: string;
    constructor(error: { code: string; status: number; stage: string; message?: string }) {
      super(error.message ?? error.code);
      this.code = error.code;
      this.status = error.status;
      this.stage = error.stage;
    }
  }
  const prepareKallistisTurn = vi.fn(async () => {
    if (input.prepareError) {
      throw new KallistisChatError(input.prepareError);
    }
    return {
      kind: "ready",
      model: "model",
      system: "system",
      modelMessages: [{ role: "user", content: [{ type: "text", text: "oi" }] }],
      derivedFrom: [USER_MESSAGE_ID],
      safeMessages: [],
      directAssistantReply: input.directAssistantReply ?? null,
    };
  });
  const persistKallistisAssistant = vi.fn(async () => undefined);
  vi.doMock("@/server/chat/kallistis-chat-runtime", () => ({
    KallistisChatError,
    INJECTION_GUARD: "guard",
    buildKallistisSystem: vi.fn(),
    inspectKallistisTurn,
    isAllowedKallistisThread: vi.fn(),
    isInvalidKallistisRuntime: vi.fn(),
    persistKallistisAssistant,
    prepareKallistisTurn,
    selectChatModelForCurrentTurn: vi.fn(),
    toModelMessages: vi.fn(),
  }));
  const gateway = vi.fn(() => "gateway-model");
  const createOpenRouterProvider = vi.fn(() => {
    if (input.providerThrows) throw new Error("missing_key");
    return gateway;
  });
  vi.doMock("@/lib/openrouter.server", () => ({
    chatProviderTimeoutMs: () => 1000,
    createOpenRouterProvider,
    providerFailureMessage: () => "provider failed",
    providerFailureStatus: () => 502,
  }));
  vi.doMock("@/lib/rate-limit", () => ({
    distributedChatRateLimit: vi.fn(async () => null),
    distributedPreAuthChatRateLimit: vi.fn(async () => null),
    requestIdFor: () => "req-chat",
  }));
  const runtime = { close: vi.fn() };
  vi.doMock("@/lib/require-user.server", () => ({
    requireUser: vi.fn(async (request: Request) =>
      request.headers.get("cookie")
        ? { userId: USER_ID }
        : { error: Response.json({ error: "unauthorized", stage: "auth" }, { status: 401 }) },
    ),
  }));
  vi.doMock("@/server/local-core/chat-runtime", () => ({
    createLocalChatRuntime: vi.fn(() => runtime),
  }));
  process.env.KALLISTIS_DATABASE_URL = "postgresql://localhost/kallistis_test";
  const mod = await import("./chat");
  return {
    ...mod,
    inspectKallistisTurn,
    prepareKallistisTurn,
    createOpenRouterProvider,
    gateway,
    persistKallistisAssistant,
  };
}

describe("/api/chat contract regressions", () => {
  it("sem Authorization retorna 401 JSON", async () => {
    const { handleChatRoute } = await setupChat({});
    const response = await handleChatRoute(
      new Request("https://example.test/api/chat", { method: "POST" }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({ error: "unauthorized", stage: "auth" });
  });

  it("message_not_persisted do prepare retorna 503 controlado", async () => {
    const { handleChatRoute } = await setupChat({
      prepareError: { code: "message_not_persisted", status: 503, stage: "persistence" },
    });
    const response = await handleChatRoute(chatRequest());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "message_not_persisted",
      stage: "persistence",
    });
  });

  it("history_unavailable do prepare retorna 503 controlado", async () => {
    const { handleChatRoute } = await setupChat({
      prepareError: { code: "history_unavailable", status: 503, stage: "persistence" },
    });
    const response = await handleChatRoute(chatRequest());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "history_unavailable",
      stage: "persistence",
    });
  });

  it("provider ausente não chama prepareKallistisTurn", async () => {
    const { handleChatRoute, prepareKallistisTurn } = await setupChat({ providerThrows: true });
    const response = await handleChatRoute(chatRequest());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "ai_not_configured" });
    expect(prepareKallistisTurn).not.toHaveBeenCalled();
  });

  it("boundary bloqueado preserva UI data stream sem provider nem prepare", async () => {
    const { handleChatRoute, prepareKallistisTurn, createOpenRouterProvider } = await setupChat({
      inspection: { kind: "blocked", message: "fora da fronteira" },
    });
    const response = await handleChatRoute(chatRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("x-vercel-ai-data-stream")).toBe("v1");
    await expect(response.text()).resolves.toBe('0:"fora da fronteira"\n');
    expect(createOpenRouterProvider).not.toHaveBeenCalled();
    expect(prepareKallistisTurn).not.toHaveBeenCalled();
  });

  it("confirma escolha explícita já gravada sem gerar outra mutação e persiste a resposta", async () => {
    const { handleChatRoute, gateway, persistKallistisAssistant } = await setupChat({
      directAssistantReply: "Readback: Povo Dóreos, Ofício Atirador, versão 7.",
    });
    const response = await handleChatRoute(chatRequest());
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain("Povo Dóreos, Ofício Atirador, versão 7.");
    expect(gateway).not.toHaveBeenCalled();
    expect(persistKallistisAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        assistantMessageId: ASSISTANT_MESSAGE_ID,
        rawContent: "Readback: Povo Dóreos, Ofício Atirador, versão 7.",
      }),
    );
  });
});

describe("requireAssistantPersistenceBeforeFinish", () => {
  async function readChunks(stream: ReadableStream<unknown>) {
    const chunks: unknown[] = [];
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return chunks;
  }

  it("persist callback resolve e finish é enviado", async () => {
    const { requireAssistantPersistenceBeforeFinish } = await import("./chat");
    let persisted = "";
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "text-delta", delta: " resposta bruta " });
        controller.enqueue({ type: "finish" });
        controller.close();
      },
    }) as never;
    const chunks = await readChunks(
      requireAssistantPersistenceBeforeFinish(
        stream,
        async (content) => {
          persisted = content;
        },
        "req",
      ),
    );
    expect(persisted).toBe("resposta bruta");
    expect(chunks).toContainEqual({ type: "finish" });
  });

  it("persist callback rejeita e finish não é enviado", async () => {
    const { requireAssistantPersistenceBeforeFinish } = await import("./chat");
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "text-delta", delta: "resposta" });
        controller.enqueue({ type: "finish" });
        controller.close();
      },
    }) as never;
    const chunks = await readChunks(
      requireAssistantPersistenceBeforeFinish(
        stream,
        async () => Promise.reject(new Error("db")),
        "req",
      ),
    );
    expect(chunks).not.toContainEqual({ type: "finish" });
    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: "error",
        errorText: expect.stringContaining("não foi salva"),
      }),
    );
  });

  it("resposta vazia gera erro e não chama persist", async () => {
    const { requireAssistantPersistenceBeforeFinish } = await import("./chat");
    const persist = vi.fn(async () => undefined);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "finish" });
        controller.close();
      },
    }) as never;
    const chunks = await readChunks(
      requireAssistantPersistenceBeforeFinish(stream, persist, "req"),
    );
    expect(persist).not.toHaveBeenCalled();
    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: "error",
        errorText: expect.stringContaining("não foi concluída"),
      }),
    );
  });

  it("stream encerrado sem finish sinaliza resposta incompleta", async () => {
    const { requireAssistantPersistenceBeforeFinish } = await import("./chat");
    const persist = vi.fn(async () => undefined);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "text-delta", delta: "Vou consultar o estado." });
        controller.close();
      },
    }) as never;
    const chunks = await readChunks(
      requireAssistantPersistenceBeforeFinish(stream, persist, "req"),
    );
    expect(persist).not.toHaveBeenCalled();
    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: "error",
        errorText: expect.stringContaining("interrompida antes de concluir e salvar"),
      }),
    );
  });
});
