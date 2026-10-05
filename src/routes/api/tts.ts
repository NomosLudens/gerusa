// TTS via OpenRouter — Kallistis fala.
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { rateLimit } from "@/lib/rate-limit";
import { SpeechSynthesisError, synthesizeSpeech } from "@/lib/tts.server";

type Body = {
  text?: unknown;
  voice?: unknown;
  model?: unknown;
  speed?: unknown;
};

function refererFor(request: Request) {
  const rawReferer =
    request.headers.get("origin") ||
    process.env.OPENROUTER_SITE_URL ||
    process.env.APP_PUBLIC_URL ||
    "https://kallistis.app";
  try {
    const url = new URL(rawReferer);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://kallistis.app";
  }
}

export async function handleTtsRoute(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const limited = rateLimit(auth.userId, "tts", 60, 60);
  if (limited) return limited;

  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  try {
    const speech = await synthesizeSpeech({
      text: typeof payload.text === "string" ? payload.text : "",
      voice: typeof payload.voice === "string" && payload.voice ? payload.voice : undefined,
      model: typeof payload.model === "string" && payload.model ? payload.model : undefined,
      speed: typeof payload.speed === "number" ? payload.speed : undefined,
      referer: refererFor(request),
      signal: request.signal,
    });
    const headers: Record<string, string> = {
      "Cache-Control": "no-cache",
      "Content-Type": speech.contentType,
      "X-TTS-Voice": speech.voice,
      "X-TTS-Model": speech.model,
    };
    if (speech.fallbackReason) {
      headers["X-TTS-Fallback"] = "1";
      headers["X-TTS-Fallback-Reason"] = speech.fallbackReason;
    }
    return new Response(speech.audio, { headers });
  } catch (error) {
    if (error instanceof SpeechSynthesisError) {
      if (error.code === "tts_not_configured") {
        return Response.json(
          {
            error: "ai_not_configured",
            message: "A voz da Kallistis ainda não está configurada neste ambiente.",
          },
          { status: 503 },
        );
      }
      if (error.code === "tts_invalid_input") return new Response(error.message, { status: 400 });
      if (error.code === "tts_aborted") return new Response(null, { status: 499 });
      return new Response(error.message, { status: error.status });
    }
    return new Response("tts network failed", { status: 502 });
  }
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: ({ request }) => handleTtsRoute(request),
    },
  },
});
