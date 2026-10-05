import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const rateLimit = vi.fn();
const synthesizeSpeech = vi.fn();

vi.mock("@/lib/require-user.server", () => ({ requireUser }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/tts.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tts.server")>("@/lib/tts.server");
  return { ...actual, synthesizeSpeech };
});

async function post(request: Request) {
  const { handleTtsRoute } = await import("./tts");
  return handleTtsRoute(request);
}

function jsonRequest(body: unknown) {
  return new Request("https://example.test/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://app.test/path" },
    body: JSON.stringify(body),
  });
}

describe("/api/tts", () => {
  beforeEach(() => {
    vi.resetModules();
    requireUser.mockResolvedValue({ userId: "user" });
    rateLimit.mockReturnValue(null);
    synthesizeSpeech.mockResolvedValue({
      audio: new Blob([new Uint8Array([1])], { type: "audio/mpeg" }),
      contentType: "audio/mpeg",
      model: "modelo",
      voice: "voz",
      fallbackUsed: false,
      fallbackReason: null,
      spokenText: "texto",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserva erro de autenticação", async () => {
    const authError = new Response("unauthorized", { status: 401 });
    requireUser.mockResolvedValue({ error: authError });
    const response = await post(jsonRequest({ text: "oi" }));
    expect(response).toBe(authError);
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it("preserva rate limit", async () => {
    const limited = new Response("rate", { status: 429 });
    rateLimit.mockReturnValue(limited);
    const response = await post(jsonRequest({ text: "oi" }));
    expect(response).toBe(limited);
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON inválido", async () => {
    const response = await post(
      new Request("https://example.test/api/tts", { method: "POST", body: "{" }),
    );
    expect(response.status).toBe(400);
  });

  it("mapeia input inválido para 400", async () => {
    const { SpeechSynthesisError } = await import("@/lib/tts.server");
    synthesizeSpeech.mockRejectedValue(
      new SpeechSynthesisError({
        code: "tts_invalid_input",
        status: 400,
        message: "text obrigatório",
      }),
    );
    const response = await post(jsonRequest({ text: "" }));
    expect(response.status).toBe(400);
  });

  it("mapeia configuração ausente para ai_not_configured", async () => {
    const { SpeechSynthesisError } = await import("@/lib/tts.server");
    synthesizeSpeech.mockRejectedValue(
      new SpeechSynthesisError({
        code: "tts_not_configured",
        status: 503,
        message: "not configured",
      }),
    );
    const response = await post(jsonRequest({ text: "oi" }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "ai_not_configured" });
  });

  it("retorna MP3 com headers públicos", async () => {
    const response = await post(jsonRequest({ text: "oi" }));
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(response.headers.get("x-tts-voice")).toBe("voz");
    expect(response.headers.get("x-tts-model")).toBe("modelo");
  });

  it("retorna WAV", async () => {
    synthesizeSpeech.mockResolvedValue({
      audio: new Blob([new Uint8Array([1])], { type: "audio/wav" }),
      contentType: "audio/wav",
      model: "modelo",
      voice: "voz",
      fallbackUsed: false,
      fallbackReason: null,
      spokenText: "texto",
    });
    const response = await post(jsonRequest({ text: "oi" }));
    expect(response.headers.get("content-type")).toBe("audio/wav");
  });

  it("expõe fallback quando informado", async () => {
    synthesizeSpeech.mockResolvedValue({
      audio: new Blob([new Uint8Array([1])], { type: "audio/mpeg" }),
      contentType: "audio/mpeg",
      model: "fallback",
      voice: "fallback-voice",
      fallbackUsed: true,
      fallbackReason: "primary HTTP 500",
      spokenText: "texto",
    });
    const response = await post(jsonRequest({ text: "oi" }));
    expect(response.headers.get("x-tts-fallback")).toBe("1");
    expect(response.headers.get("x-tts-fallback-reason")).toBe("primary HTTP 500");
  });

  it("preserva abort e upstream", async () => {
    const { SpeechSynthesisError } = await import("@/lib/tts.server");
    synthesizeSpeech.mockRejectedValueOnce(
      new SpeechSynthesisError({ code: "tts_aborted", status: 499, message: "aborted" }),
    );
    expect((await post(jsonRequest({ text: "oi" }))).status).toBe(499);
    synthesizeSpeech.mockRejectedValueOnce(
      new SpeechSynthesisError({ code: "tts_upstream_failed", status: 504, message: "upstream" }),
    );
    expect((await post(jsonRequest({ text: "oi" }))).status).toBe(504);
  });
});
