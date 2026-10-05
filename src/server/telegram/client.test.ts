import { describe, expect, it, vi } from "vitest";
import {
  downloadTelegramFile,
  getTelegramFile,
  sendTelegramAudio,
  sendTelegramMessage,
  splitTelegramText,
} from "./client";

describe("telegram client", () => {
  it("divide respostas longas preservando ordem", () => {
    const chunks = splitTelegramText("a".repeat(8100));
    expect(chunks).toHaveLength(3);
    expect(chunks.join("")).toBe("a".repeat(8100));
    expect(chunks.every((chunk) => Array.from(chunk).length <= 4000)).toBe(true);
  });

  it("preserva emoji e evita strings vazias", () => {
    const text = `Olá 😄 ${"texto ".repeat(900)}\n\nFim`;
    const chunks = splitTelegramText(text, 100);
    expect(chunks.every(Boolean)).toBe(true);
    expect(chunks.join(" ").replace(/\s+/g, " ")).toContain("Olá 😄");
  });

  it("retorna lista vazia para texto vazio", () => {
    expect(splitTelegramText("")).toEqual([]);
  });

  it("preserva código telegram_not_ok sem expor token", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ ok: false }), { status: 200 }),
    );
    await expect(
      sendTelegramMessage({ token: "SECRET_TOKEN", chatId: 1, text: "oi", fetchImpl }),
    ).rejects.toMatchObject({ code: "telegram_not_ok" });
    try {
      await sendTelegramMessage({ token: "SECRET_TOKEN", chatId: 1, text: "oi", fetchImpl });
    } catch (error) {
      expect(error).toMatchObject({ code: "telegram_not_ok" });
      expect((error as Error).message).not.toContain("SECRET_TOKEN");
      expect((error as { code: string }).code).not.toContain("SECRET_TOKEN");
    }
  });

  it("preserva código telegram_http_500", async () => {
    const fetchImpl = vi.fn(async () => new Response("erro", { status: 500 }));
    await expect(
      sendTelegramMessage({ token: "token", chatId: 1, text: "oi", fetchImpl }),
    ).rejects.toMatchObject({ code: "telegram_http_500" });
  });

  it("preserva código telegram_timeout", async () => {
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          ),
        ),
    );
    await expect(
      sendTelegramMessage({ token: "token", chatId: 1, text: "oi", fetchImpl, timeoutMs: 1 }),
    ).rejects.toMatchObject({ code: "telegram_timeout" });
  });

  it("preserva código telegram_invalid_response sem expor token", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ ok: true, result: {} }));
    await expect(
      sendTelegramMessage({ token: "SECRET_TOKEN", chatId: 1, text: "oi", fetchImpl }),
    ).rejects.toMatchObject({ code: "telegram_invalid_response" });
    try {
      await sendTelegramMessage({ token: "SECRET_TOKEN", chatId: 1, text: "oi", fetchImpl });
    } catch (error) {
      expect((error as Error).message).not.toContain("SECRET_TOKEN");
      expect((error as { code: string }).code).not.toContain("SECRET_TOKEN");
    }
  });

  it("preserva código telegram_invalid_json", async () => {
    const fetchImpl = vi.fn(async () => new Response("{", { status: 200 }));
    await expect(
      sendTelegramMessage({ token: "token", chatId: 1, text: "oi", fetchImpl }),
    ).rejects.toMatchObject({ code: "telegram_invalid_json" });
  });

  it("retorna message_id no sucesso", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ ok: true, result: { message_id: 42 } }));
    await expect(
      sendTelegramMessage({ token: "token", chatId: 1, text: "oi", fetchImpl }),
    ).resolves.toBe(42);
  });
});

describe("telegram file client", () => {
  async function expectSafe(promise: Promise<unknown>, code: string) {
    try {
      await promise;
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toMatchObject({ code });
      expect((error as Error).message).not.toContain("SECRET_TOKEN");
      expect((error as { code: string }).code).not.toContain("SECRET_TOKEN");
    }
  }

  it("getTelegramFile retorna filePath/fileSize e envia file_id", async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({ file_id: "file-id" });
      return Response.json({
        ok: true,
        result: { file_path: "voice/file_1.oga", file_size: 1234 },
      });
    });
    await expect(
      getTelegramFile({ token: "SECRET_TOKEN", fileId: "file-id", fetchImpl }),
    ).resolves.toEqual({ filePath: "voice/file_1.oga", fileSize: 1234 });
  });

  it("getTelegramFile aceita file_size ausente", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ ok: true, result: { file_path: "voice/file_1.oga" } }),
    );
    await expect(
      getTelegramFile({ token: "SECRET_TOKEN", fileId: "file-id", fetchImpl }),
    ).resolves.toEqual({ filePath: "voice/file_1.oga", fileSize: null });
  });

  it.each([
    [async () => new Response("erro", { status: 500 }), "telegram_get_file_http_500"],
    [async () => new Response("{", { status: 200 }), "telegram_get_file_invalid_json"],
    [async () => Response.json({ ok: false }), "telegram_get_file_not_ok"],
    [async () => Response.json({ ok: true, result: {} }), "telegram_get_file_invalid_response"],
    [
      async () => Response.json({ ok: true, result: { file_path: "x", file_size: -1 } }),
      "telegram_get_file_invalid_response",
    ],
    [
      async () => Response.json({ ok: true, result: { file_path: "x", file_size: 1.2 } }),
      "telegram_get_file_invalid_response",
    ],
    [
      async () => Response.json({ ok: true, result: { file_path: "x", file_size: "1" } }),
      "telegram_get_file_invalid_response",
    ],
  ])("getTelegramFile mapeia %s", async (factory, code) => {
    await expectSafe(
      getTelegramFile({ token: "SECRET_TOKEN", fileId: "id", fetchImpl: vi.fn(factory as never) }),
      code,
    );
  });

  it("getTelegramFile timeout", async () => {
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          ),
        ),
    );
    await expectSafe(
      getTelegramFile({ token: "SECRET_TOKEN", fileId: "id", fetchImpl, timeoutMs: 1 }),
      "telegram_get_file_timeout",
    );
  });

  it("downloadTelegramFile baixa chunks com MIME", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3]));
        controller.close();
      },
    });
    const fetchImpl = vi.fn(async () => new Response(stream));
    const blob = await downloadTelegramFile({
      token: "SECRET_TOKEN",
      filePath: "voice/file.oga",
      mediaType: "audio/ogg",
      maxBytes: 10,
      fetchImpl,
    });
    expect(blob.type).toBe("audio/ogg");
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([1, 2, 3]);
  });

  it("downloadTelegramFile rejeita Content-Length excedido antes da leitura limitada", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(null, { headers: { "content-length": "11" } }),
    );
    await expectSafe(
      downloadTelegramFile({
        token: "SECRET_TOKEN",
        filePath: "voice/file.oga",
        mediaType: "audio/ogg",
        maxBytes: 10,
        fetchImpl,
      }),
      "telegram_file_too_large",
    );
  });

  it("downloadTelegramFile cancela reader quando stream excede limite", async () => {
    let canceled = false;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
      },
      cancel() {
        canceled = true;
      },
    });
    const fetchImpl = vi.fn(async () => new Response(stream));
    await expectSafe(
      downloadTelegramFile({
        token: "SECRET_TOKEN",
        filePath: "voice/file.oga",
        mediaType: "audio/ogg",
        maxBytes: 3,
        fetchImpl,
      }),
      "telegram_file_too_large",
    );
    expect(canceled).toBe(true);
  });

  it.each([
    [async () => new Response("erro", { status: 404 }), "telegram_file_download_http_404"],
    [async () => new Response(null), "telegram_file_empty"],
    [
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
        ),
      "telegram_file_empty",
    ],
    [
      async () => {
        throw new Error("network");
      },
      "telegram_file_download_failed",
    ],
  ])("downloadTelegramFile mapeia falhas", async (factory, code) => {
    await expectSafe(
      downloadTelegramFile({
        token: "SECRET_TOKEN",
        filePath: "voice/file.oga",
        mediaType: "audio/ogg",
        maxBytes: 10,
        fetchImpl: vi.fn(factory as never),
      }),
      code,
    );
  });

  it("downloadTelegramFile timeout", async () => {
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          ),
        ),
    );
    await expectSafe(
      downloadTelegramFile({
        token: "SECRET_TOKEN",
        filePath: "voice/file.oga",
        mediaType: "audio/ogg",
        maxBytes: 10,
        fetchImpl,
        timeoutMs: 1,
      }),
      "telegram_file_download_timeout",
    );
  });

  it("sendTelegramAudio envia FormData e retorna message_id", async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      const form = init?.body as FormData;
      expect(form.get("chat_id")).toBe("1");
      expect(form.get("reply_to_message_id")).toBe("9");
      const file = form.get("audio") as File;
      expect(file.name).toBe("voz.mp3");
      expect(file.type).toBe("audio/mpeg");
      return Response.json({ ok: true, result: { message_id: 44 } });
    });
    await expect(
      sendTelegramAudio({
        token: "SECRET_TOKEN",
        chatId: 1,
        audio: new Blob([new Uint8Array([1])], { type: "audio/mpeg" }),
        filename: "voz.mp3",
        replyToMessageId: 9,
        fetchImpl,
      }),
    ).resolves.toBe(44);
  });

  it.each([
    [new Blob([new Uint8Array([1])], { type: "audio/wav" }), "voz.mp3"],
    [new Blob([], { type: "audio/mpeg" }), "voz.mp3"],
    [new Blob([new Uint8Array([1])], { type: "audio/mpeg" }), "voz.wav"],
  ])("sendTelegramAudio valida entrada", async (audio, filename) => {
    await expectSafe(
      sendTelegramAudio({ token: "SECRET_TOKEN", chatId: 1, audio, filename }),
      "telegram_audio_invalid_input",
    );
  });

  it.each([
    [async () => new Response("erro", { status: 500 }), "telegram_audio_http_500"],
    [async () => new Response("{", { status: 200 }), "telegram_audio_invalid_json"],
    [async () => Response.json({ ok: false }), "telegram_audio_not_ok"],
    [async () => Response.json({ ok: true, result: {} }), "telegram_audio_invalid_response"],
  ])("sendTelegramAudio mapeia falhas", async (factory, code) => {
    await expectSafe(
      sendTelegramAudio({
        token: "SECRET_TOKEN",
        chatId: 1,
        audio: new Blob([new Uint8Array([1])], { type: "audio/mpeg" }),
        filename: "voz.mp3",
        fetchImpl: vi.fn(factory as never),
      }),
      code,
    );
  });

  it("sendTelegramAudio timeout", async () => {
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          ),
        ),
    );
    await expectSafe(
      sendTelegramAudio({
        token: "SECRET_TOKEN",
        chatId: 1,
        audio: new Blob([new Uint8Array([1])], { type: "audio/mpeg" }),
        filename: "voz.mp3",
        fetchImpl,
        timeoutMs: 1,
      }),
      "telegram_audio_timeout",
    );
  });
});
