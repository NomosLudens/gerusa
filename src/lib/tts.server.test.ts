import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const OLD_ENV = process.env;

async function loadTts() {
  vi.resetModules();
  return import("./tts.server");
}

async function expectSpeechError(promise: Promise<unknown>, code: string, status: number) {
  const { SpeechSynthesisError } = await import("./tts.server");
  await expect(promise).rejects.toBeInstanceOf(SpeechSynthesisError);
  await expect(promise).rejects.toMatchObject({ code, status });
}

describe("synthesizeSpeech", () => {
  beforeEach(() => {
    process.env = { ...OLD_ENV, OPENROUTER_API_KEY: "key" };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("retorna tts_not_configured sem OPENROUTER_API_KEY", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const { synthesizeSpeech } = await loadTts();
    await expectSpeechError(
      synthesizeSpeech({ text: "olá", signal: new AbortController().signal }),
      "tts_not_configured",
      503,
    );
  });

  it("recusa texto vazio e texto vazio após limpeza", async () => {
    const { synthesizeSpeech } = await loadTts();
    await expectSpeechError(
      synthesizeSpeech({ text: "  ", signal: new AbortController().signal }),
      "tts_invalid_input",
      400,
    );
    await expectSpeechError(
      synthesizeSpeech({ text: "```const x = 1```", signal: new AbortController().signal }),
      "tts_invalid_input",
      400,
    );
  });

  it("devolve MP3 com modelo e voz padrão", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "audio/mpeg" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { synthesizeSpeech } = await loadTts();
    const result = await synthesizeSpeech({
      text: "Kallistis responde em voz.",
      signal: new AbortController().signal,
    });
    expect(result.audio.type).toBe("audio/mpeg");
    expect(result.contentType).toBe("audio/mpeg");
    expect(result.model).toBe("hexgrad/kokoro-82m");
    expect(result.voice).toBe("pf_dora");
    expect(result.fallbackUsed).toBe(false);
    expect(result.spokenText).toBe("Kallistis responde em voz.");
  });

  it("normaliza parÃ¢metros do Content-Type do MP3", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "audio/mpeg; charset=binary" },
          }),
      ),
    );
    const { synthesizeSpeech } = await loadTts();
    const result = await synthesizeSpeech({
      text: "Kallistis responde em voz.",
      signal: new AbortController().signal,
    });
    expect(result.contentType).toBe("audio/mpeg");
    expect(result.audio.type).toBe("audio/mpeg");
    expect(result.fallbackUsed).toBe(false);
  });

  it("converte PCM de Gemini em WAV", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(new Uint8Array([0, 1, 2, 3]), {
          status: 200,
          headers: { "content-type": "audio/pcm" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { synthesizeSpeech } = await loadTts();
    const result = await synthesizeSpeech({
      text: "Kallistis responde em voz.",
      model: "google/gemini-3.1-flash-tts-preview",
      voice: "Vindemiatrix",
      signal: new AbortController().signal,
    });
    const bytes = new Uint8Array(await result.audio.arrayBuffer());
    expect(result.contentType).toBe("audio/wav");
    expect(result.audio.type).toBe("audio/wav");
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe("WAVE");
  });

  it("usa fallback quando primário falha", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("erro", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(new Uint8Array([9]), {
          status: 200,
          headers: { "content-type": "audio/pcm" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { synthesizeSpeech } = await loadTts();
    const result = await synthesizeSpeech({
      text: "Kallistis responde em voz.",
      signal: new AbortController().signal,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toContain("HTTP 500");
    expect(result.model).toBe("google/gemini-3.1-flash-tts-preview");
    expect(result.voice).toBe("Vindemiatrix");
  });

  it("retorna tts_upstream_failed quando primário e fallback falham", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("erro", { status: 500 }))
        .mockResolvedValueOnce(new Response("erro", { status: 502 })),
    );
    const { synthesizeSpeech } = await loadTts();
    await expectSpeechError(
      synthesizeSpeech({
        text: "Kallistis responde em voz.",
        signal: new AbortController().signal,
      }),
      "tts_upstream_failed",
      502,
    );
  });

  it("mapeia abort para tts_aborted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }),
    );
    const { synthesizeSpeech } = await loadTts();
    const controller = new AbortController();
    controller.abort();
    await expectSpeechError(
      synthesizeSpeech({ text: "Kallistis responde em voz.", signal: controller.signal }),
      "tts_aborted",
      499,
    );
  });

  it("mapeia erro de rede para tts_network_failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const { synthesizeSpeech } = await loadTts();
    await expectSpeechError(
      synthesizeSpeech({
        text: "Kallistis responde em voz.",
        signal: new AbortController().signal,
      }),
      "tts_network_failed",
      502,
    );
  });

  it("preserva limpeza pública e limite vigente", async () => {
    process.env.MAX_TTS_CHARS = "120";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array([1]), {
            status: 200,
            headers: { "content-type": "audio/mpeg" },
          }),
      ),
    );
    const { synthesizeSpeech } = await loadTts();
    const result = await synthesizeSpeech({
      text: "# **K∧LINE** fala sobre Kuan-Yin no PR. " + "frase longa. ".repeat(30),
      signal: new AbortController().signal,
    });
    expect(result.spokenText).toContain("Kallistis");
    expect(result.spokenText).toContain("Kuan Yin");
    expect(result.spokenText).toContain("pull request");
    expect(result.spokenText).not.toContain("**");
    expect(result.spokenText.length).toBeLessThanOrEqual(120);
  });
});
