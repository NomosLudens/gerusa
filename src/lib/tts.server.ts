const DEFAULT_MODEL = "hexgrad/kokoro-82m";
const DEFAULT_VOICE = "pf_dora";
const FALLBACK_MODEL =
  process.env.OPENROUTER_TTS_FALLBACK_MODEL || "google/gemini-3.1-flash-tts-preview";
const FALLBACK_VOICE = process.env.OPENROUTER_TTS_FALLBACK_VOICE || "Vindemiatrix";
const DEFAULT_MAX_TTS_CHARS = 320;
const GEMINI_PCM_SAMPLE_RATE = 24000;
const GEMINI_PCM_BITS = 16;
const GEMINI_PCM_CHANNELS = 1;

export type SpeechSynthesisResult = {
  audio: Blob;
  contentType: string;
  model: string;
  voice: string;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  spokenText: string;
};

export class SpeechSynthesisError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(input: { code: string; status: number; message: string }) {
    super(input.message);
    this.name = "SpeechSynthesisError";
    this.code = input.code;
    this.status = input.status;
  }
}

function getMaxTtsChars() {
  const value = Number(process.env.MAX_TTS_CHARS);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MAX_TTS_CHARS;
  return Math.min(600, Math.max(120, value));
}

function isGeminiTts(model: string) {
  return model.startsWith("google/gemini-") && model.includes("tts");
}

function limparTextoParaTTS(texto: string) {
  return texto
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[|>_]/g, " ")
    .replace(/→/g, ". ")
    .replace(/#/g, " número ")
    .replace(/\bPR\b/g, "pull request")
    .replace(/K∧LINE/g, "Kallistis")
    .replace(/Kuan-Yin/g, "Kuan Yin")
    .replace(/\s+/g, " ")
    .trim();
}

function fraseFalavel(frase: string) {
  const f = frase.trim();
  if (!f) return false;
  if (f.length < 12) return false;
  if (f.includes("{") || f.includes("}")) return false;
  if (f.includes("[") || f.includes("]")) return false;
  if (f.includes("|")) return false;
  if (/^(const|function|import|export|select|insert|update|delete|drop)\b/i.test(f)) return false;
  return true;
}

function prepararTextoFalado(texto: string) {
  const maxChars = getMaxTtsChars();
  const limpo = limparTextoParaTTS(texto);
  if (limpo.length <= maxChars) return limpo;
  const frases = limpo
    .split(/(?<=[.!?])\s+/)
    .map((f) => f.trim())
    .filter(fraseFalavel);
  const escolhidas: string[] = [];
  for (const frase of frases) {
    const proxima = [...escolhidas, frase].join(" ");
    if (proxima.length > maxChars) break;
    escolhidas.push(frase);
    if (escolhidas.length >= 2) break;
  }
  const falado = escolhidas.join(" ").trim();
  if (falado) return falado.replace(/[,;:]\s*$/g, ".");
  return limpo
    .slice(0, maxChars)
    .replace(/[,;:]\s*$/g, ".")
    .trim();
}

function isRawPcmContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const t = contentType.toLowerCase();
  return (
    t.includes("audio/pcm") ||
    t.includes("audio/l16") ||
    t.includes("application/octet-stream") ||
    t.includes("audio/x-raw")
  );
}

function normalizeAudioContentType(contentType: string | null): string {
  return contentType?.split(";")[0]?.trim().toLowerCase() || "audio/mpeg";
}

function pcmToWav(
  pcm: ArrayBuffer,
  opts: { sampleRate: number; bitsPerSample: number; channels: number },
): ArrayBuffer {
  const { sampleRate, bitsPerSample, channels } = opts;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(new Uint8Array(pcm));
  return buffer;
}

function safeUpstreamStatus(status: number) {
  return status >= 400 && status <= 599 ? status : 502;
}

export async function synthesizeSpeech(input: {
  text: string;
  signal: AbortSignal;
  referer?: string;
  model?: string;
  voice?: string;
  speed?: number;
}): Promise<SpeechSynthesisResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new SpeechSynthesisError({
      code: "tts_not_configured",
      status: 503,
      message: "A voz da Kallistis ainda não está configurada neste ambiente.",
    });
  }
  const rawText = input.text.trim();
  if (!rawText) {
    throw new SpeechSynthesisError({
      code: "tts_invalid_input",
      status: 400,
      message: "text obrigatório",
    });
  }
  const spokenText = prepararTextoFalado(rawText);
  if (!spokenText) {
    throw new SpeechSynthesisError({
      code: "tts_invalid_input",
      status: 400,
      message: "text vazio após limpeza",
    });
  }
  let finalVoice = input.voice || process.env.OPENROUTER_TTS_VOICE || DEFAULT_VOICE;
  let finalModel =
    input.model ||
    process.env.OPENROUTER_TTS_MODEL ||
    process.env.OPENROUTER_TTS_PRIMARY_MODEL ||
    DEFAULT_MODEL;
  const speed =
    typeof input.speed === "number" && Number.isFinite(input.speed)
      ? Math.min(1.2, Math.max(0.75, input.speed))
      : undefined;
  let finalSpeed = speed;
  if (finalSpeed === undefined && finalModel === "hexgrad/kokoro-82m") finalSpeed = 0.95;
  const referer = input.referer || "https://kallistis.app";

  async function callSpeech(useModel: string, useVoice: string, useSpeed?: number) {
    const speechBody: Record<string, unknown> = {
      model: useModel,
      voice: useVoice,
      input: spokenText,
    };
    speechBody.response_format = isGeminiTts(useModel) ? "pcm" : "mp3";
    if (useSpeed !== undefined && !isGeminiTts(useModel)) speechBody.speed = useSpeed;
    return fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": referer,
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "Kallistis Totalidade",
      },
      body: JSON.stringify(speechBody),
      signal: input.signal,
    });
  }

  let fallbackReason: string | null = null;
  let fallbackUsed = false;
  let upstream: Response;
  try {
    upstream = await callSpeech(finalModel, finalVoice, finalSpeed);
  } catch {
    throw new SpeechSynthesisError({
      code: input.signal.aborted ? "tts_aborted" : "tts_network_failed",
      status: input.signal.aborted ? 499 : 502,
      message: input.signal.aborted ? "tts aborted" : "tts network failed",
    });
  }
  if (!upstream.ok && finalModel !== FALLBACK_MODEL) {
    fallbackReason = `${finalModel} HTTP ${upstream.status}`.slice(0, 180);
    finalModel = FALLBACK_MODEL;
    finalVoice = FALLBACK_VOICE;
    finalSpeed = speed;
    fallbackUsed = true;
    try {
      upstream = await callSpeech(finalModel, finalVoice, finalSpeed);
    } catch {
      throw new SpeechSynthesisError({
        code: input.signal.aborted ? "tts_aborted" : "tts_network_failed",
        status: input.signal.aborted ? 499 : 502,
        message: input.signal.aborted ? "tts aborted" : "tts network failed",
      });
    }
  }
  if (!upstream.ok) {
    throw new SpeechSynthesisError({
      code: "tts_upstream_failed",
      status: safeUpstreamStatus(upstream.status),
      message: "Não foi possível gerar o áudio agora. Tente novamente.",
    });
  }
  const upstreamContentType = upstream.headers.get("content-type");
  if (isGeminiTts(finalModel) || isRawPcmContentType(upstreamContentType)) {
    const pcm = await upstream.arrayBuffer();
    const wav = pcmToWav(pcm, {
      sampleRate: GEMINI_PCM_SAMPLE_RATE,
      bitsPerSample: GEMINI_PCM_BITS,
      channels: GEMINI_PCM_CHANNELS,
    });
    return {
      audio: new Blob([wav], { type: "audio/wav" }),
      contentType: "audio/wav",
      model: finalModel,
      voice: finalVoice,
      fallbackUsed,
      fallbackReason,
      spokenText,
    };
  }
  const contentType = normalizeAudioContentType(upstreamContentType);
  return {
    audio: new Blob([await upstream.arrayBuffer()], { type: contentType }),
    contentType,
    model: finalModel,
    voice: finalVoice,
    fallbackUsed,
    fallbackReason,
    spokenText,
  };
}
