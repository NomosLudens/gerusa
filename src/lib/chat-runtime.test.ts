import { describe, expect, it, vi } from "vitest";
import type { InferUIMessageChunk, UIMessage } from "ai";
import {
  handleChatRoute,
  isAllowedKallistisThread,
  isInvalidKallistisRuntime,
  requireAssistantPersistenceBeforeFinish,
  selectChatModelForCurrentTurn,
  toModelMessages,
} from "../routes/api/chat";
import { AI_MODELS } from "@/lib/ai-models.server";
import { discardUnpersistedAssistant } from "@/lib/chat-persistence-client";

async function readChunks(stream: ReadableStream<InferUIMessageChunk<UIMessage>>) {
  const chunks: InferUIMessageChunk<UIMessage>[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return chunks;
}

function completedAssistantStream(): ReadableStream<InferUIMessageChunk<UIMessage>> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({ type: "text-start", id: "text-1" });
      controller.enqueue({ type: "text-delta", id: "text-1", delta: "Resposta real" });
      controller.enqueue({ type: "text-end", id: "text-1" });
      controller.enqueue({ type: "finish", finishReason: "stop" });
      controller.close();
    },
  });
}

describe("/api/chat runtime guards", () => {
  it("responde 401 sem token antes de tocar serviços externos", async () => {
    const response = await handleChatRoute(
      new Request("https://example.com/api/chat", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "unauthorized", stage: "auth" });
  });

  it("recusa thread de outro usuário e thread não-Kallistis", () => {
    expect(
      isAllowedKallistisThread(
        { user_id: "other", facet: "kallistis", surface: "kallistis" },
        "user-1",
      ),
    ).toBe(false);
    expect(
      isAllowedKallistisThread(
        { user_id: "user-1", facet: "kharis", surface: "kallistis" },
        "user-1",
      ),
    ).toBe(false);
    expect(isInvalidKallistisRuntime({ facet: "kuanyin" })).toBe(true);
  });

  it("seleciona modelo multimodal somente pelos arquivos do turno atual", () => {
    expect(selectChatModelForCurrentTurn([], AI_MODELS.chat)).toBe(AI_MODELS.chat);
    expect(selectChatModelForCurrentTurn([{ mediaType: "image/png" }], AI_MODELS.chat)).toBe(
      AI_MODELS.vision,
    );
    expect(selectChatModelForCurrentTurn([{ mediaType: "application/pdf" }], AI_MODELS.chat)).toBe(
      AI_MODELS.documents,
    );
  });

  it("não reenvia bytes de anexos antigos ao provider", () => {
    const messages: UIMessage[] = [
      {
        id: "old",
        role: "user",
        parts: [{ type: "file", mediaType: "image/png", filename: "old.png", url: "base64-old" }],
      },
      { id: "new", role: "user", parts: [{ type: "text", text: "texto" }] },
    ];

    const modelMessages = JSON.stringify(toModelMessages(messages, "new"));
    expect(modelMessages).not.toContain("base64-old");
    expect(modelMessages).toContain("[Anexo anterior já processado: old.png]");
  });

  it("só emite finish depois de confirmar a persistência da assistente", async () => {
    const persisted = vi.fn().mockResolvedValue(undefined);
    const chunks = await readChunks(
      requireAssistantPersistenceBeforeFinish(completedAssistantStream(), persisted, "req-1"),
    );

    expect(persisted).toHaveBeenCalledWith("Resposta real");
    expect(chunks.at(-1)?.type).toBe("finish");
  });

  it("não apresenta o turno como concluído quando salvar a assistente falha", async () => {
    const chunks = await readChunks(
      requireAssistantPersistenceBeforeFinish(
        completedAssistantStream(),
        vi.fn().mockRejectedValue(new Error("database unavailable")),
        "req-2",
      ),
    );

    expect(chunks.some((chunk) => chunk.type === "finish")).toBe(false);
    expect(chunks.at(-1)).toMatchObject({ type: "error" });
  });

  it("não persiste mensagem vazia da assistente", async () => {
    const persist = vi.fn();
    const emptyStream = new ReadableStream<InferUIMessageChunk<UIMessage>>({
      start(controller) {
        controller.enqueue({ type: "finish", finishReason: "stop" });
        controller.close();
      },
    });
    const chunks = await readChunks(
      requireAssistantPersistenceBeforeFinish(emptyStream, persist, "req-empty"),
    );

    expect(persist).not.toHaveBeenCalled();
    expect(chunks).toEqual([expect.objectContaining({ type: "error" })]);
  });

  it("remove a resposta parcial quando a persistência falha, sem duplicar a pessoa", () => {
    const messages = [
      { id: "user-1", role: "user", text: "pergunta" },
      { id: "assistant-1", role: "assistant", text: "resposta parcial" },
    ];

    expect(discardUnpersistedAssistant(messages, "assistant-1")).toEqual([
      { id: "user-1", role: "user", text: "pergunta" },
    ]);
  });
});
