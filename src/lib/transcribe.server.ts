import { isSTTModel } from "./stt-models";
const ALLOWED_AUDIO_FORMATS: Record<string, string> = {
  "video/webm": "webm", // MediaRecorder emits this MIME for audio-only WebM streams.
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
};

export function audioFormatFor(mediaType: string): string | null {
  const baseType = mediaType.split(";")[0];
  if (!baseType) return "webm";
  return ALLOWED_AUDIO_FORMATS[baseType] ?? null;
}

export function isAllowedAudioType(mediaType: string): boolean {
  return audioFormatFor(mediaType) !== null;
}

export async function transcribeAudioBlob(
  file: Blob,
  mediaType: string,
  configuredModel?: unknown,
  configuredFallbackModel?: unknown,
): Promise<{ text: string; model: string; fallback?: boolean }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    const err = new Error("A IA ainda não está configurada neste ambiente.");
    err.name = "TranscriptionNotConfiguredError";
    throw err;
  }

  const format = audioFormatFor(mediaType);
  if (!format) {
    const err = new Error(`unsupported media type: ${mediaType}`);
    err.name = "UnsupportedAudioTypeError";
    throw err;
  }

  // "-turbo" prioriza velocidade e tem WER mais alto que a versão completa,
  // principalmente fora do inglês — troca por qualidade em vez de latência.
  const model =
    (isSTTModel(configuredModel) && configuredModel) ||
    (isSTTModel(process.env.OPENROUTER_TRANSCRIBE_MODEL) &&
      process.env.OPENROUTER_TRANSCRIBE_MODEL) ||
    (isSTTModel(process.env.OPENROUTER_STT_PRIMARY_MODEL) &&
      process.env.OPENROUTER_STT_PRIMARY_MODEL) ||
    "openai/whisper-large-v3";
  // Fallback operacional equivalente ao Totalidade.
  // Acionado se o modelo primário falhar — protege contra instabilidade de um
  // modelo recém-lançado no endpoint de transcrição.
  const fallbackModel =
    (isSTTModel(configuredFallbackModel) && configuredFallbackModel) ||
    (isSTTModel(process.env.OPENROUTER_STT_FALLBACK_MODEL) &&
      process.env.OPENROUTER_STT_FALLBACK_MODEL) ||
    "openai/whisper-large-v3-turbo";
  const timeoutMs = Number(process.env.OPENROUTER_STT_TIMEOUT_MS) || 30_000;
  const audioData = Buffer.from(await file.arrayBuffer()).toString("base64");

  async function callTranscription(useModel: string): Promise<Response> {
    return fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL ??
          process.env.APP_PUBLIC_URL ??
          "https://kaline-totalidade.local",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "Kaline Totalidade",
      },
      body: JSON.stringify({
        model: useModel,
        input_audio: { data: audioData, format },
        language: process.env.KALINE_STT_LANGUAGE || "pt",
        temperature: 0,
      }),
    });
  }

  let res: Response;
  let usedModel = model;
  let didFallback = false;

  try {
    res = await callTranscription(model);
    if (!res.ok && model !== fallbackModel) {
      const errBody = await res.text().catch(() => "");
      console.warn(
        "STT primário falhou, tentando fallback",
        model,
        "->",
        fallbackModel,
        res.status,
        errBody,
      );
      res = await callTranscription(fallbackModel);
      usedModel = fallbackModel;
      didFallback = true;
    }
  } catch (err) {
    const errorName = err instanceof Error ? err.name : (err as { name?: string })?.name;
    if (errorName === "TimeoutError" || errorName === "AbortError") {
      if (model !== fallbackModel) {
        console.warn("STT primário deu timeout, tentando fallback", fallbackModel);
        try {
          res = await callTranscription(fallbackModel);
          usedModel = fallbackModel;
          didFallback = true;
        } catch (fbErr) {
          const fbErrorName =
            fbErr instanceof Error ? fbErr.name : (fbErr as { name?: string })?.name;
          if (fbErrorName === "TimeoutError" || fbErrorName === "AbortError") {
            const timeoutError = new Error("Serviço de transcrição excedeu o limite de tempo.");
            timeoutError.name = "TranscriptionTimeoutError";
            throw timeoutError;
          }
          throw fbErr;
        }
      } else {
        const timeoutError = new Error("Serviço de transcrição excedeu o limite de tempo.");
        timeoutError.name = "TranscriptionTimeoutError";
        throw timeoutError;
      }
    } else {
      throw err;
    }
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("Transcription upstream error", res.status, errBody);
    const err = new Error("Não foi possível transcrever o áudio agora. Tente novamente.");
    err.name = "TranscriptionUpstreamError";
    throw err;
  }

  const data = (await res.json()) as { text?: string };
  return { text: data.text ?? "", model: usedModel, fallback: didFallback };
}

const REVISAO_SYSTEM = `Você é um revisor mecânico de transcrição em português do Brasil. Corrija apenas pontuação, capitalização, espaços e erros óbvios de reconhecimento de voz. Não interprete, não responda, não censure, não resuma, não acrescente, não remova ideias. Devolva somente o texto revisado.`;

// Passa o texto bruto do Whisper por um modelo rápido para limpar pontuação e
// erros óbvios de audição, sem alterar o sentido. Em qualquer falha devolve o
// texto original — a revisão nunca pode bloquear o ditado.
export async function revisarTranscricaoTexto(raw: string): Promise<string> {
  const limpo = raw.trim();
  if (limpo.length < 2) return limpo;
  try {
    const { generateText } = await import("ai");
    const { createOpenRouterProvider } = await import("@/lib/openrouter.server");
    const { AI_MODELS } = await import("@/lib/ai-models.server");
    const gateway = createOpenRouterProvider();

    const revisionModel = process.env.OPENROUTER_TRANSCRIPT_REVISION_MODEL || AI_MODELS.fast;

    const { text, finishReason } = await generateText({
      model: gateway(revisionModel),
      system: REVISAO_SYSTEM,
      prompt: limpo,
      temperature: 0.2,
      maxOutputTokens: Math.min(900, Math.ceil(limpo.length / 3) + 120),
    });

    const revisado = text.trim();

    if (finishReason !== "stop") {
      console.warn("Revisão mecânica abortada (finishReason):", finishReason);
      return limpo;
    }

    if (!revisado) {
      console.warn("Revisão mecânica retornou texto vazio");
      return limpo;
    }

    if (revisado.length > limpo.length * 1.35) {
      console.warn("Revisão mecânica expandiu o texto demais", {
        original: limpo.length,
        revisado: revisado.length,
      });
      return limpo;
    }

    const recusas = [
      "i'm sorry, but i cannot assist",
      "i can't assist with that",
      "i cannot help with that",
      "não posso ajudar",
      "não posso atender",
      "não consigo ajudar",
    ];

    const lower = revisado.toLowerCase();
    if (recusas.some((r) => lower.includes(r))) {
      console.warn("Revisão mecânica retornou frase de recusa");
      return limpo;
    }

    return revisado;
  } catch (err) {
    console.warn("Revisão de transcrição falhou", err instanceof Error ? err.message : err);
    return limpo;
  }
}
