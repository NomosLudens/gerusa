// Hook client para TTS via /api/tts.
// A OpenRouter devolve o áudio (mp3) como bytes crus numa resposta única —
// decodificamos com o AudioContext e tocamos do início ao fim.
// `speak(id, text)` toca; `stop()` interrompe. `speakingId` indica qual bolha
// está falando — usado pelo botão para exibir ícone de stop.
// O texto é naturalizado antes de ser enviado ao TTS (markdown → fala natural).
// Textos longos são divididos em chunks e tocados em sequência.
import { useCallback, useRef, useState } from "react";
import {
  prepareTextForSpeech,
  splitSpeechChunks,
  wait,
  type SpeechProfile,
} from "./tts-naturalize";

export const TTS_MODEL_KEY = "kallistis.tts.model";
export const TTS_MODELS = ["google/gemini-3.1-flash-tts-preview", "hexgrad/kokoro-82m"] as const;
export type TTSModel = (typeof TTS_MODELS)[number];

export const TTS_VOICE_KEY = "kallistis.tts.voice";
export type TTSVoiceOption = { value: string; label: string };
export const TTS_VOICES: Record<TTSModel, TTSVoiceOption[]> = {
  "google/gemini-3.1-flash-tts-preview": [
    { value: "Vindemiatrix", label: "Vindemiatrix (gentil)" },
    { value: "Sulafat", label: "Sulafat (quente)" },
    { value: "Puck", label: "Puck (padrão)" },
    { value: "Kore", label: "Kore (firme)" },
  ],
  "hexgrad/kokoro-82m": [
    { value: "pf_dora", label: "Dora (feminina)" },
    { value: "pm_alex", label: "Alex (masculina)" },
  ],
};

type Opts = { voice?: string; model?: string; speed?: number; profile?: SpeechProfile };

type StreamSession = {
  controller: AbortController;
  queue: string[];
  resolveNext: (() => void) | null;
  done: boolean;
};

export function useTTS() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<StreamSession | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.onended = null;
        sourceRef.current.stop();
      } catch {
        /* já parado */
      }
      sourceRef.current = null;
    }
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
    setSpeakingId(null);
  }, []);

  // Toca um único chunk de áudio (array buffer) usando Audio ou AudioContext.
  // Retorna true se tocou até o fim sem ser abortado.
  async function playChunk(
    bytes: ArrayBuffer,
    controller: AbortController,
    mimeType = "audio/mpeg",
  ): Promise<boolean> {
    if (controller.signal.aborted) return false;

    if (typeof document !== "undefined" && document.hidden) {
      throw new Error("A aba precisa estar visível para tocar áudio.");
    }

    // Tenta com HTMLAudio primeiro (mais leve)
    try {
      const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
      });
      return !controller.signal.aborted;
    } catch {
      if (audioRef.current) {
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
    }

    // Fallback: AudioContext
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const buffer = await ctx.decodeAudioData(bytes);
    if (controller.signal.aborted || ctxRef.current !== ctx) return false;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    sourceRef.current = source;
    await new Promise<void>((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
    return !controller.signal.aborted;
  }

  const speak = useCallback(
    async (id: string, text: string, opts?: Opts) => {
      // Se já tocando o mesmo id → pausar (toggle).
      if (speakingId === id) {
        stop();
        return;
      }
      // Trocar de bolha enquanto outra fala → parar a anterior.
      stop();
      setError(null);

      // Naturaliza o texto antes de enviar ao TTS
      const profile = opts?.profile ?? "kallistis";
      const speechText = prepareTextForSpeech(text, { profile });
      const chunkSize = profile === "klio" ? 620 : profile === "kharis" ? 720 : 900;
      const chunks = splitSpeechChunks(speechText, chunkSize, { profile });
      // Klio fala um pouco mais devagar por padrão — pausa mais natural para
      // quem tem deficiência intelectual, coerente com o modo pedagógico.
      const speed = opts?.speed ?? (profile === "klio" ? 0.9 : undefined);

      const controller = new AbortController();
      abortRef.current = controller;
      setSpeakingId(id);

      try {
        // Toca cada chunk em sequência
        for (let i = 0; i < chunks.length; i++) {
          if (controller.signal.aborted) break;

          const chunk = chunks[i];
          if (!chunk.trim()) continue;

          const rawModel =
            opts?.model ||
            (typeof localStorage === "undefined" ? null : localStorage.getItem(TTS_MODEL_KEY)) ||
            undefined;
          const model =
            rawModel && (TTS_MODELS as readonly string[]).includes(rawModel)
              ? (rawModel as TTSModel)
              : undefined;
          const savedVoice =
            typeof localStorage === "undefined" ? null : localStorage.getItem(TTS_VOICE_KEY);
          const modelVoices = model ? TTS_VOICES[model] : undefined;
          const voice =
            opts?.voice ||
            modelVoices?.find((v) => v.value === savedVoice)?.value ||
            modelVoices?.[0]?.value;
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "same-origin",
            body: JSON.stringify({ text: chunk, ...opts, model, voice, speed }),
            signal: controller.signal,
          });
          if (!res.ok) {
            const msg = await res.text().catch(() => `tts ${res.status}`);
            throw new Error(msg.slice(0, 300) || `tts ${res.status}`);
          }
          const spokenModel = res.headers.get("X-TTS-Model");
          const spokenVoice = res.headers.get("X-TTS-Voice");
          if (spokenModel)
            console.info("Kallistis TTS", { model: spokenModel, voice: spokenVoice });
          const fallbackReason = res.headers.get("X-TTS-Fallback-Reason");
          if (fallbackReason) {
            console.warn("Kallistis TTS caiu no fallback:", fallbackReason);
            setError(`Voz primária indisponível — usando fallback. (${fallbackReason})`);
          }
          const bytes = await res.arrayBuffer();
          if (controller.signal.aborted) return;

          await playChunk(bytes, controller, res.headers.get("content-type") || "audio/mpeg");

          // Pausa curta entre chunks (exceto no último)
          if (i < chunks.length - 1 && !controller.signal.aborted) {
            await wait(180);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "erro de áudio";
        setError(msg);
      } finally {
        if (abortRef.current === controller) {
          stop();
        }
      }
    },
    [speakingId, stop],
  );

  // Variante de `speak` para texto que ainda está sendo gerado (streaming do
  // chat): abre uma sessão de fala vazia e toca cada frase assim que
  // `pushStreamText` a entrega, em vez de esperar o texto inteiro primeiro.
  // `model`/`voice`/`speed` são resolvidos uma única vez no início da sessão.
  const speakStream = useCallback(
    (id: string, opts?: Opts) => {
      if (speakingId === id) {
        stop();
        return;
      }
      stop();
      setError(null);

      const profile = opts?.profile ?? "kallistis";
      const rawModel =
        opts?.model ||
        (typeof localStorage === "undefined" ? null : localStorage.getItem(TTS_MODEL_KEY)) ||
        undefined;
      const model =
        rawModel && (TTS_MODELS as readonly string[]).includes(rawModel)
          ? (rawModel as TTSModel)
          : undefined;
      const savedVoice =
        typeof localStorage === "undefined" ? null : localStorage.getItem(TTS_VOICE_KEY);
      const modelVoices = model ? TTS_VOICES[model] : undefined;
      const voice =
        opts?.voice ||
        modelVoices?.find((v) => v.value === savedVoice)?.value ||
        modelVoices?.[0]?.value;
      const speed = opts?.speed ?? (profile === "klio" ? 0.9 : undefined);

      const controller = new AbortController();
      abortRef.current = controller;
      setSpeakingId(id);
      const session: StreamSession = { controller, queue: [], resolveNext: null, done: false };
      streamRef.current = session;

      void (async () => {
        try {
          while (!controller.signal.aborted) {
            if (session.queue.length === 0) {
              if (session.done) break;
              await new Promise<void>((resolve) => {
                session.resolveNext = resolve;
              });
              continue;
            }
            const chunk = session.queue.shift()!;
            if (!chunk.trim()) continue;

            const res = await fetch("/api/tts", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "same-origin",
              body: JSON.stringify({ text: chunk, model, voice, speed }),
              signal: controller.signal,
            });
            if (!res.ok) {
              const msg = await res.text().catch(() => `tts ${res.status}`);
              throw new Error(msg.slice(0, 300) || `tts ${res.status}`);
            }
            const spokenModel = res.headers.get("X-TTS-Model");
            const spokenVoice = res.headers.get("X-TTS-Voice");
            if (spokenModel)
              console.info("Kallistis TTS", { model: spokenModel, voice: spokenVoice });
            const fallbackReason = res.headers.get("X-TTS-Fallback-Reason");
            if (fallbackReason) {
              console.warn("Kallistis TTS caiu no fallback:", fallbackReason);
              setError(`Voz primária indisponível — usando fallback. (${fallbackReason})`);
            }
            const bytes = await res.arrayBuffer();
            if (controller.signal.aborted) break;

            await playChunk(bytes, controller, res.headers.get("content-type") || "audio/mpeg");

            if (!controller.signal.aborted) await wait(180);
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            const msg = err instanceof Error ? err.message : "erro de áudio";
            setError(msg);
          }
        } finally {
          if (abortRef.current === controller) stop();
          if (streamRef.current === session) streamRef.current = null;
        }
      })();
    },
    [speakingId, stop],
  );

  // Naturaliza e enfileira mais um trecho de texto pra sessão de fala aberta
  // por `speakStream`. Chamar depois de `endStream`/sem sessão ativa não faz nada.
  const pushStreamText = useCallback((text: string, profile: SpeechProfile = "kallistis") => {
    const session = streamRef.current;
    if (!session || session.done) return;
    const speechText = prepareTextForSpeech(text, { profile });
    if (!speechText.trim()) return;
    session.queue.push(speechText);
    session.resolveNext?.();
    session.resolveNext = null;
  }, []);

  // Sinaliza que não vai chegar mais texto pra sessão aberta por `speakStream`
  // — o player termina de tocar o que já está na fila e encerra.
  const endStream = useCallback(() => {
    const session = streamRef.current;
    if (!session) return;
    session.done = true;
    session.resolveNext?.();
    session.resolveNext = null;
  }, []);

  return { speak, speakStream, pushStreamText, endStream, stop, speakingId, error };
}
