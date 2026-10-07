import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  chatProviderTimeoutMs,
  createChatProviderFetch,
  getOpenRouterApiKey,
} from "@/lib/openrouter.server";
import { getGerusaPersona } from "@/server/gerusa/persona.server";
import { createGerusaPool, isSameOrigin, THREAD_ID_PATTERN } from "@/server/gerusa/store";

const FREE_MODEL_ROUTER = "openrouter/free";
const MAX_MESSAGE_LENGTH = 4000;
const MAX_REQUEST_BYTES = 16_384;
const RECENT_MESSAGE_LIMIT = 16;
const ERROR_MESSAGE = "Gerusa não conseguiu responder agora. Tente novamente.";
const messageSchema = z
  .object({
    threadId: z.string().regex(THREAD_ID_PATTERN),
    content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  })
  .strict();
const encoder = new TextEncoder();

function errorResponse(error: string, status: number, requestId: string): Response {
  return Response.json(
    { error, message: ERROR_MESSAGE, requestId },
    {
      status,
      headers: { "Cache-Control": "no-store", "x-request-id": requestId },
    },
  );
}

function ndjson(value: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}

function modelForGerusa(): string | null {
  const model = process.env.OPENROUTER_MODEL?.trim() || FREE_MODEL_ROUTER;
  return model === FREE_MODEL_ROUTER || model.endsWith(":free") ? model : null;
}

function textFromDelta(delta: unknown): string {
  if (typeof delta === "string") return delta;
  if (!Array.isArray(delta)) return "";
  return delta
    .map((part) =>
      part && typeof part === "object" && "text" in part && typeof part.text === "string"
        ? part.text
        : "",
    )
    .join("");
}

export const Route = createFileRoute("/api/gerusa/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = randomUUID();
        if (!isSameOrigin(request)) return errorResponse("csrf_rejected", 403, requestId);

        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > MAX_REQUEST_BYTES) {
          return errorResponse("payload_too_large", 413, requestId);
        }

        let rawBody: string;
        try {
          rawBody = await request.text();
        } catch {
          return errorResponse("invalid_request", 400, requestId);
        }
        if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
          return errorResponse("payload_too_large", 413, requestId);
        }

        let body: unknown;
        try {
          body = JSON.parse(rawBody);
        } catch {
          return errorResponse("invalid_json", 400, requestId);
        }
        const parsed = messageSchema.safeParse(body);
        if (!parsed.success) return errorResponse("invalid_request", 400, requestId);

        let apiKey: string;
        try {
          apiKey = getOpenRouterApiKey();
        } catch {
          return errorResponse("provider_not_configured", 503, requestId);
        }
        const model = modelForGerusa();
        if (!model) return errorResponse("free_model_required", 503, requestId);

        const persona = getGerusaPersona();

        let pool: Pool | undefined;
        let connection: PoolClient | undefined;
        try {
          const dbPool = createGerusaPool();
          pool = dbPool;
          connection = await dbPool.connect();
          await connection.query("BEGIN");
          const thread = await connection.query(
            "SELECT id FROM gerusa.conversations WHERE id = $1 FOR UPDATE",
            [parsed.data.threadId],
          );
          if (!thread.rowCount) {
            await connection.query("ROLLBACK");
            connection.release();
            await dbPool.end();
            return errorResponse("thread_not_found", 404, requestId);
          }
          await connection.query(
            "INSERT INTO gerusa.messages (conversation_id, role, content) VALUES ($1, 'user', $2)",
            [parsed.data.threadId, parsed.data.content],
          );
          await connection.query(
            "UPDATE gerusa.conversations SET updated_at = now() WHERE id = $1",
            [parsed.data.threadId],
          );
          await connection.query("COMMIT");
          const recent = await connection.query(
            `SELECT role, content
             FROM (
               SELECT role, content, created_at, id
               FROM gerusa.messages
               WHERE conversation_id = $1
               ORDER BY created_at DESC, id DESC
               LIMIT $2
             ) recent
             ORDER BY created_at ASC, id ASC`,
            [parsed.data.threadId, RECENT_MESSAGE_LIMIT],
          );
          connection.release();
          connection = undefined;

          const system = `${persona.trim()}\n\n## Regras desta conversa\n- Responda no idioma usado pela pessoa.\n- Seja observadora, elegante, gentil e curiosa; use humor seco e sarcasmo leve, sem crueldade.\n- Prefira respostas concisas e específicas, com uma boa pergunta quando fizer sentido.\n- Não fale como assistente virtual e não invente memórias fora do histórico fornecido.\n- Não diga que iniciou ações ou recursos que o produto não oferece.`;
          const messages = [
            { role: "system", content: system },
            ...recent.rows.map((message) => ({ role: message.role, content: message.content })),
          ];
          const providerFetch = createChatProviderFetch(fetch, {
            requestId,
            primaryModel: model,
            fallbackModel: model,
            timeoutMs: chatProviderTimeoutMs(),
            maxRetries: 0,
          });
          const abortController = new AbortController();
          const timeoutSignal = AbortSignal.timeout(90_000);
          const signal = AbortSignal.any([request.signal, abortController.signal, timeoutSignal]);
          let providerResponse: Response;
          try {
            providerResponse = await providerFetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": new URL(request.url).origin,
                  "X-Title": "Gerusa Poulain",
                },
                body: JSON.stringify({
                  model,
                  messages,
                  stream: true,
                  temperature: 0.75,
                  max_tokens: 900,
                }),
                signal,
              },
            );
          } catch (error) {
            console.error(
              JSON.stringify({
                type: "gerusa_provider_failed",
                request_id: requestId,
                kind:
                  error instanceof Error && error.name === "ProviderTimeoutError"
                    ? "timeout"
                    : "network",
              }),
            );
            await dbPool.end();
            return errorResponse(
              "provider_unavailable",
              error instanceof Error && error.name === "ProviderTimeoutError" ? 504 : 502,
              requestId,
            );
          }

          if (!providerResponse.ok) {
            const status = providerResponse.status;
            await providerResponse.body?.cancel().catch(() => {});
            console.error(
              JSON.stringify({ type: "gerusa_provider_rejected", request_id: requestId, status }),
            );
            await dbPool.end();
            return errorResponse("provider_rejected", status, requestId);
          }
          if (
            !providerResponse.body ||
            !providerResponse.headers.get("content-type")?.includes("text/event-stream")
          ) {
            await providerResponse.body?.cancel().catch(() => {});
            await pool.end();
            return errorResponse("provider_stream_unavailable", 502, requestId);
          }

          const providerReader = providerResponse.body.getReader();
          const responseBody = new ReadableStream<Uint8Array>({
            start(controller) {
              void (async () => {
                let buffer = "";
                let dataLines: string[] = [];
                let answer = "";
                let sawDone = false;
                let sawFinish = false;
                const decoder = new TextDecoder();
                const streamTimeout = setTimeout(() => {
                  void providerReader.cancel().catch(() => {});
                }, 90_000);

                const dispatch = () => {
                  if (!dataLines.length) return;
                  const data = dataLines.join("\n");
                  dataLines = [];
                  if (data === "[DONE]") {
                    sawDone = true;
                    return;
                  }
                  let event: {
                    error?: unknown;
                    choices?: Array<{
                      finish_reason?: string | null;
                      delta?: { content?: unknown };
                    }>;
                  };
                  try {
                    event = JSON.parse(data);
                  } catch {
                    throw new Error("invalid_provider_event");
                  }
                  if (event?.error) throw new Error("provider_stream_error");
                  const choice = event?.choices?.[0];
                  if (choice?.finish_reason) sawFinish = true;
                  const text = textFromDelta(choice?.delta?.content);
                  if (text) {
                    answer += text;
                    controller.enqueue(ndjson({ type: "delta", text }));
                  }
                };

                const processLine = (rawLine: string) => {
                  const line = rawLine.replace(/\r$/, "");
                  if (!line) dispatch();
                  else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
                };

                try {
                  while (!sawDone) {
                    const { value, done } = await providerReader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";
                    for (const line of lines) processLine(line);
                  }
                  buffer += decoder.decode();
                  if (buffer) processLine(buffer);
                  dispatch();
                  if (!sawDone && !sawFinish) throw new Error("provider_stream_incomplete");
                  if (!answer.trim()) throw new Error("provider_response_empty");

                  const assistantConnection = await dbPool.connect();
                  let transactionOpen = false;
                  let saved: { rows: Array<{ id: string; createdAt: Date }> };
                  try {
                    await assistantConnection.query("BEGIN");
                    transactionOpen = true;
                    saved = await assistantConnection.query(
                      `INSERT INTO gerusa.messages (conversation_id, role, content)
                       VALUES ($1, 'assistant', $2)
                       RETURNING id::text AS id, created_at AS "createdAt"`,
                      [parsed.data.threadId, answer],
                    );
                    await assistantConnection.query(
                      "UPDATE gerusa.conversations SET updated_at = now() WHERE id = $1",
                      [parsed.data.threadId],
                    );
                    await assistantConnection.query("COMMIT");
                    transactionOpen = false;
                  } catch (error) {
                    if (transactionOpen)
                      await assistantConnection.query("ROLLBACK").catch(() => {});
                    throw error;
                  } finally {
                    assistantConnection.release();
                  }
                  controller.enqueue(
                    ndjson({
                      type: "done",
                      message: { ...saved.rows[0], role: "assistant", content: answer },
                    }),
                  );
                } catch {
                  await dbPool.query("ROLLBACK").catch(() => {});
                  console.error(
                    JSON.stringify({ type: "gerusa_stream_failed", request_id: requestId }),
                  );
                  try {
                    controller.enqueue(ndjson({ type: "error", message: ERROR_MESSAGE }));
                  } catch {
                    // The browser may have closed the stream.
                  }
                } finally {
                  clearTimeout(streamTimeout);
                  await providerReader.cancel().catch(() => {});
                  await dbPool.end().catch(() => {});
                  try {
                    controller.close();
                  } catch {
                    // Already closed by a cancelled browser request.
                  }
                }
              })();
            },
            cancel() {
              abortController.abort();
            },
          });

          return new Response(responseBody, {
            headers: {
              "Cache-Control": "no-store, no-transform",
              "Content-Type": "application/x-ndjson; charset=utf-8",
              "X-Accel-Buffering": "no",
              "x-request-id": requestId,
            },
          });
        } catch {
          connection?.release();
          await pool?.end().catch(() => {});
          return errorResponse("chat_unavailable", 503, requestId);
        }
      },
    },
  },
});
