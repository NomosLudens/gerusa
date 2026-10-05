import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type InferUIMessageChunk,
  type ModelMessage,
  type UIMessage,
} from "ai";
import {
  chatProviderTimeoutMs,
  createOpenRouterProvider,
  providerFailureMessage,
} from "@/lib/openrouter.server";
import {
  distributedChatRateLimit,
  distributedPreAuthChatRateLimit,
  requestIdFor,
} from "@/lib/rate-limit";
import { ChatEnvelope, readBoundedJson, validationStatus } from "@/lib/chat-request-contract";
import { requireUser } from "@/lib/require-user.server";
import { createLocalChatRuntime } from "@/server/local-core/chat-runtime";
import {
  createKallistisTools,
  KALLISTIS_MAX_TOOL_CALLS_PER_TURN,
} from "@/server/chat/kallistis-tools";
import {
  KallistisChatError,
  inspectKallistisTurn,
  persistKallistisAssistant,
  prepareKallistisTurn,
} from "@/server/chat/kallistis-chat-runtime";

export {
  INJECTION_GUARD,
  buildKallistisSystem,
  inspectKallistisTurn,
  isAllowedKallistisThread,
  isInvalidKallistisRuntime,
  selectChatModelForCurrentTurn,
  toModelMessages,
} from "@/server/chat/kallistis-chat-runtime";

function kallistisChatErrorResponse(error: unknown, requestId: string): Response | null {
  if (!(error instanceof KallistisChatError)) return null;
  console.error(
    JSON.stringify({
      level: "error",
      type: "chat_contract_error",
      code: error.code,
      stage: error.stage,
      request_id: requestId,
    }),
  );
  if (error.code === "invalid_surface") {
    return Response.json(
      {
        error: "invalid_surface",
        reason: "O chat da Kallistis Clean aceita somente a faceta Kallistis.",
        stage: "boundary",
        requestId,
      },
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }
  const reasons: Record<string, string> = {
    thread_unavailable: "Não foi possível abrir a conversa.",
    thread_not_found: "Conversa não encontrada.",
    forbidden: "Acesso não permitido para esta conversa.",
    payload_too_large: error.message,
    message_not_persisted:
      "Não consegui salvar sua mensagem. Nenhuma chamada ao provider foi feita.",
    history_unavailable: "A mensagem foi salva, mas o contexto recuperável não pôde ser carregado.",
    context_unavailable: "O contexto local não pôde ser carregado.",
    assistant_message_not_persisted: "A resposta foi produzida, mas não pôde ser salva.",
    provider_failed: "A resposta não pôde ser concluída.",
    provider_timeout: "A resposta demorou além do limite permitido.",
    identity_canon_unavailable: "A identidade canônica não pôde ser carregada.",
  };
  return Response.json(
    {
      error: error.code,
      reason: reasons[error.code] ?? error.message,
      stage: error.stage,
      requestId,
    },
    { status: error.status, headers: { "x-request-id": requestId } },
  );
}

export function requireAssistantPersistenceBeforeFinish(
  stream: ReadableStream<InferUIMessageChunk<UIMessage>>,
  persist: (content: string) => Promise<void>,
  requestId: string,
): ReadableStream<InferUIMessageChunk<UIMessage>> {
  let content = "";
  let failed = false;
  let finished = false;
  let chunkCount = 0;

  return stream.pipeThrough(
    new TransformStream<InferUIMessageChunk<UIMessage>, InferUIMessageChunk<UIMessage>>({
      async transform(chunk, controller) {
        chunkCount += 1;
        if (chunk.type === "text-delta") content += chunk.delta;
        if (chunk.type === "error") failed = true;

        if (chunk.type !== "finish") {
          controller.enqueue(chunk);
          return;
        }
        finished = true;

        const rawContent = content.trim();
        if (failed || !rawContent) {
          controller.enqueue({
            type: "error",
            errorText: `A resposta não foi concluída nem salva. Referência: ${requestId}`,
          });
          return;
        }
        try {
          await persist(rawContent);
          controller.enqueue(chunk);
        } catch (error) {
          console.error(
            JSON.stringify({
              level: "error",
              type: "chat_assistant_persist_failed",
              request_id: requestId,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          controller.enqueue({
            type: "error",
            errorText: `A resposta apareceu, mas não foi salva. Referência: ${requestId}`,
          });
        }
      },
      flush(controller) {
        if (!finished) {
          controller.enqueue({
            type: "error",
            errorText: `A resposta foi interrompida antes de concluir e salvar. Referência: ${requestId}`,
          });
        }
        console.info(
          JSON.stringify({
            level: "info",
            type: "chat_stream_finished",
            request_id: requestId,
            chunks: chunkCount,
            text_chars: content.trim().length,
          }),
        );
      },
    }),
  );
}

export async function handleChatRoute(request: Request): Promise<Response> {
  const requestId = requestIdFor(request);
  // ── 1. Auth: cookie de sessão local é a única autoridade ──
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const userId = auth.userId;
  const preAuthLimited = await distributedPreAuthChatRateLimit(request);
  if (preAuthLimited) return preAuthLimited;
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) {
    return Response.json(
      {
        error: "database_unavailable",
        reason: "O banco local está indisponível.",
        requestId,
      },
      { status: 503 },
    );
  }

  const limited = await distributedChatRateLimit(request, userId);
  if (limited) return limited;

  // ── 2. Corpo limitado antes de parse e contrato Zod estrito ──
  const raw = await readBoundedJson(request);
  if (!raw.ok) {
    return Response.json(
      {
        error: raw.status === 413 ? "payload_too_large" : "chat_bad_request",
        reason: raw.status === 413 ? "Payload acima do limite permitido." : "JSON inválido.",
        stage: "parsing",
        requestId,
      },
      { status: raw.status },
    );
  }
  const parsed = ChatEnvelope.safeParse(raw.value);
  if (!parsed.success) {
    const status = validationStatus(parsed.error);
    return Response.json(
      {
        error: "chat_bad_request",
        reason: status === 413 ? "Payload acima dos limites do chat." : "Estrutura inválida.",
        stage: "validation",
        requestId,
      },
      { status },
    );
  }
  const body = parsed.data;

  const newestUserMessage = body.messages[0] as UIMessage;
  let inspection;
  try {
    const runtime = createLocalChatRuntime(databaseUrl);
    try {
      inspection = await inspectKallistisTurn({
        request,
        runtime,
        userId,
        threadId: body.threadId,
        userMessage: newestUserMessage,
        requestId,
        facet: body.facet,
        surface: body.surface,
        mode: body.mode,
      });
    } finally {
      runtime.close();
    }
  } catch (error) {
    const response = kallistisChatErrorResponse(error, requestId);
    if (response) return response;
    throw error;
  }

  if (inspection.kind === "blocked") {
    return new Response(`0:${JSON.stringify(inspection.message)}\n`, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-vercel-ai-data-stream": "v1",
      },
    });
  }

  let gateway: ReturnType<typeof createOpenRouterProvider>;
  try {
    gateway = createOpenRouterProvider({ requestId });
  } catch (err) {
    console.error("AI provider configuration error", err instanceof Error ? err.message : err);
    return Response.json(
      {
        error: "ai_not_configured",
        reason: "A IA ainda não está configurada neste ambiente.",
        stage: "provider",
        requestId,
      },
      { status: 503 },
    );
  }

  let prepared;
  try {
    const runtime = createLocalChatRuntime(databaseUrl);
    try {
      prepared = await prepareKallistisTurn({
        request,
        runtime,
        userId,
        threadId: body.threadId,
        userMessage: newestUserMessage,
        assistantMessageId: body.assistantMessageId,
        requestId,
        inspection,
        sourceChannel: "C01",
      });
    } finally {
      runtime.close();
    }
  } catch (error) {
    const response = kallistisChatErrorResponse(error, requestId);
    if (response) return response;
    throw error;
  }

  if (prepared.directAssistantReply) {
    const directStream = createUIMessageStream<UIMessage>({
      execute: ({ writer }) => {
        writer.write({ type: "text-start", id: body.assistantMessageId });
        writer.write({
          type: "text-delta",
          id: body.assistantMessageId,
          delta: prepared.directAssistantReply!,
        });
        writer.write({ type: "text-end", id: body.assistantMessageId });
        writer.write({ type: "finish", finishReason: "stop" });
      },
      generateId: () => body.assistantMessageId,
    });
    const persistedStream = requireAssistantPersistenceBeforeFinish(
      directStream,
      async (content) => {
        const runtime = createLocalChatRuntime(databaseUrl);
        try {
          await persistKallistisAssistant({
            request,
            runtime,
            databaseUrl,
            userId,
            threadId: body.threadId,
            assistantMessageId: body.assistantMessageId,
            rawContent: content,
            derivedFrom: prepared.derivedFrom,
            requestId,
            sourceChannel: "C01",
          });
        } finally {
          runtime.close();
        }
      },
      requestId,
    );
    return createUIMessageStreamResponse({ stream: persistedStream });
  }

  const tools = createKallistisTools({
    databaseUrl,
    userId,
    threadId: body.threadId,
    requestId,
    scope: prepared.scope,
    activeCharacterId: prepared.activeCharacterId,
  });
  const result = streamText({
    model: gateway(prepared.model),
    system: prepared.system,
    messages: prepared.modelMessages,
    tools,
    // Reserve one model step after the maximum tool-call budget for the final
    // natural-language answer that is persisted with the completed turn.
    stopWhen: stepCountIs(KALLISTIS_MAX_TOOL_CALLS_PER_TURN + 1),
    temperature: 0.55,
    frequencyPenalty: 0.4,
    presencePenalty: 0.3,
    maxRetries: 0,
    abortSignal: request.signal,
    timeout: { totalMs: chatProviderTimeoutMs() },
    onStepFinish: ({ stepNumber, toolCalls }) => {
      console.info(
        JSON.stringify({
          level: "info",
          type: "chat_step_finished",
          request_id: requestId,
          step_number: stepNumber,
          tool_calls: toolCalls.length,
        }),
      );
    },
    providerOptions: {
      openrouter: {
        reasoning: { effort: "none", exclude: true },
      },
    },
  });

  const uiStream = result.toUIMessageStream<UIMessage>({
    originalMessages: body.messages as UIMessage[],
    generateMessageId: () => body.assistantMessageId,
    onError: (error) => {
      console.error(
        JSON.stringify({
          level: "error",
          type: "chat_stream_error",
          request_id: requestId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return providerFailureMessage(error, requestId);
    },
  });
  const persistedStream = requireAssistantPersistenceBeforeFinish(
    uiStream,
    async (content) => {
      const runtime = createLocalChatRuntime(databaseUrl);
      try {
        await persistKallistisAssistant({
          request,
          runtime,
          databaseUrl,
          userId,
          threadId: body.threadId,
          assistantMessageId: body.assistantMessageId,
          rawContent: content,
          derivedFrom: prepared.derivedFrom,
          requestId,
          sourceChannel: "C01",
        });
      } finally {
        runtime.close();
      }
    },
    requestId,
  );
  return createUIMessageStreamResponse({ stream: persistedStream });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            error: "method_not_allowed",
            reason: "/api/chat aceita apenas POST pelo cliente de chat.",
            stage: "method",
          },
          { status: 405 },
        ),
      POST: async ({ request }) => {
        return handleChatRoute(request);
      },
    },
  },
});
