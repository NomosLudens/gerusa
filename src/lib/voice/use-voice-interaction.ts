import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_CAPTURE_CONSTRAINTS, getPreferredAudioMimeType } from "./audio-capture";
import {
  isTextUIPart,
  parseJsonEventStream,
  readUIMessageStream,
  uiMessageChunkSchema,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { useTTS } from "@/lib/use-tts";
import { isSTTModel, STT_FALLBACK_MODEL_KEY, STT_MODEL_KEY } from "@/lib/stt-models";
import {
  buildVoiceChatPayload,
  buildVoiceUserMessage,
  lastSentenceBoundary,
  speechProfileForVoice,
  voiceErrorMessage,
  type VoiceChatMessage,
  type VoiceErrorKind,
  type VoiceInteractionOptions,
  type VoiceInteractionState,
} from "./voice-interaction";

const MIN_AUDIO_BYTES = 1024;

export type UseVoiceInteractionResult = {
  state: VoiceInteractionState;
  transcript: string;
  responseText: string;
  error?: string;
  messages: VoiceChatMessage[];
  isBusy: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  sendText: (text: string) => Promise<void>;
  cancelSpeech: () => void;
  reset: () => void;
  reloadMessages: () => Promise<VoiceChatMessage[]>;
};

function voiceMessageToUiMessage(message: VoiceChatMessage): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

// /api/chat devolve um UI message stream (SSE) mesmo sendo consumido fora do
// `useChat` — decodifica os eventos e reconstrói o UIMessageChunk por trás,
// igual o transport padrão do SDK faz.
function toUIMessageChunkStream(body: ReadableStream<Uint8Array>): ReadableStream<UIMessageChunk> {
  const reader = parseJsonEventStream({ stream: body, schema: uiMessageChunkSchema }).getReader();
  return new ReadableStream<UIMessageChunk>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      if (value.success) controller.enqueue(value.value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export function useVoiceInteraction(options: VoiceInteractionOptions): UseVoiceInteractionResult {
  const tts = useTTS();
  const speechProfile = speechProfileForVoice(options);
  const [state, setState] = useState<VoiceInteractionState>("idle");
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRecordingRef = useRef(false);
  const lastSpokenAssistantIdRef = useRef<string | null>(null);

  const setFriendlyError = useCallback((kind: VoiceErrorKind, fallback?: string) => {
    setError(fallback || voiceErrorMessage(kind));
    setState(kind === "microphone-blocked" ? "blocked" : "error");
  }, []);

  const reloadMessages = useCallback(async () => {
    if (!options.threadId) return [];
    const response = await fetch(
      `/api/chat/thread?threadId=${encodeURIComponent(options.threadId)}`,
      {
        credentials: "same-origin",
      },
    );
    if (!response.ok) throw new Error(`thread ${response.status}`);
    const body = (await response.json()) as {
      messages?: Array<{
        id: string;
        role: VoiceChatMessage["role"];
        content: string;
        createdAt: string;
      }>;
    };
    const rows = (body.messages ?? []).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.createdAt,
    })) as VoiceChatMessage[];
    setMessages(rows);
    const lastAssistant = [...rows].reverse().find((m) => m.role === "assistant");
    setResponseText(lastAssistant?.content ?? "");
    return rows;
  }, [options.threadId]);

  useEffect(() => {
    void reloadMessages();
  }, [reloadMessages]);

  useEffect(() => {
    if (!options.autoSpeak) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (last.id === lastSpokenAssistantIdRef.current) return;
    lastSpokenAssistantIdRef.current = last.id;
    setState("speaking");
    void tts.speak(last.id, last.content, { profile: speechProfile });
  }, [messages, options.autoSpeak, speechProfile, tts]);

  useEffect(() => {
    if (!tts.speakingId && state === "speaking") setState("idle");
  }, [state, tts.speakingId]);

  useEffect(() => {
    if (tts.error) setFriendlyError("tts-failed", tts.error);
  }, [setFriendlyError, tts.error]);

  const sendText = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || !options.threadId) return;
      setState("thinking");
      setError(undefined);
      // Sem isto, uma resposta lenta do servidor deixava `state` preso em
      // "thinking" para sempre — sem erro, sem recuperação — mesmo padrão de
      // timeout já usado em ChatView.tsx (ver transport customizado do useChat).
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 60_000);
      const speechId = crypto.randomUUID();
      let spokenChars = 0;
      let latestText = "";
      let speaking = false;
      try {
        const nextUserMessage = buildVoiceUserMessage(clean);
        const payload = buildVoiceChatPayload(options, [
          ...messages.map(voiceMessageToUiMessage),
          nextUserMessage,
        ]);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || `chat ${res.status}`);
        }
        if (!res.body) throw new Error("resposta vazia do chat");

        // Fala cada frase assim que ela chega, sem esperar a resposta inteira
        // ser gerada — corta o silêncio entre "pensando" e a voz começar.
        for await (const message of readUIMessageStream({
          stream: toUIMessageChunkStream(res.body),
        })) {
          latestText = message.parts
            .filter(isTextUIPart)
            .map((p) => p.text)
            .join("");
          if (!options.autoSpeak || latestText.length <= spokenChars) continue;
          const newText = latestText.slice(spokenChars);
          const boundary = lastSentenceBoundary(newText);
          if (boundary > 0) {
            if (!speaking) {
              speaking = true;
              setState("speaking");
              tts.speakStream(speechId, { profile: speechProfile });
            }
            tts.pushStreamText(newText.slice(0, boundary), speechProfile);
            spokenChars += boundary;
          }
        }

        if (options.autoSpeak && latestText.length > spokenChars) {
          if (!speaking) {
            speaking = true;
            setState("speaking");
            tts.speakStream(speechId, { profile: speechProfile });
          }
          tts.pushStreamText(latestText.slice(spokenChars), speechProfile);
        }
        if (speaking) tts.endStream();

        const rows = await reloadMessages();
        if (speaking) {
          // Evita que o useEffect de auto-speak fale de novo a mesma resposta
          // já lida progressivamente assim que `messages` for recarregado.
          const lastAssistant = [...rows].reverse().find((m) => m.role === "assistant");
          if (lastAssistant) lastSpokenAssistantIdRef.current = lastAssistant.id;
        }
        // Se autoSpeak estava ligado mas não havia nada pra falar (resposta
        // vazia), ninguém mais vai tirar o estado de "pensando" — só o efeito
        // que observa `tts.speakingId` faz isso, e ele nunca chegou a rodar.
        if (!options.autoSpeak || !speaking) setState("idle");
      } catch (err) {
        if (speaking) tts.endStream();
        if (controller.signal.aborted) {
          setFriendlyError(
            "chat-failed",
            "Não consegui concluir o processamento a tempo. Tente novamente.",
          );
        } else {
          setFriendlyError("chat-failed", err instanceof Error ? err.message : undefined);
        }
      } finally {
        window.clearTimeout(timeout);
      }
    },
    [messages, options, reloadMessages, setFriendlyError, speechProfile, tts],
  );

  const transcribe = useCallback(
    async (blob: Blob, mediaType: string) => {
      setState("transcribing");
      try {
        const fd = new FormData();
        const ext =
          ({ "audio/webm": "webm", "audio/mp4": "mp4" } as Record<string, string>)[mediaType] ??
          "webm";
        fd.append("file", blob, `recording.${ext}`);
        fd.append("revise", "1");
        const sttModel =
          typeof localStorage === "undefined" ? null : localStorage.getItem(STT_MODEL_KEY);
        if (isSTTModel(sttModel)) fd.append("sttModel", sttModel);
        const sttFallbackModel =
          typeof localStorage === "undefined" ? null : localStorage.getItem(STT_FALLBACK_MODEL_KEY);
        if (isSTTModel(sttFallbackModel)) fd.append("sttFallbackModel", sttFallbackModel);
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error(await res.text());
        const parsed = (await res.json()) as { text?: string };
        const text = (parsed.text ?? "").trim();
        if (!text) {
          setFriendlyError("empty-transcript");
          return;
        }
        setTranscript(text);
        await sendText(text);
      } catch (err) {
        setFriendlyError("transcription-failed", err instanceof Error ? err.message : undefined);
      }
    },
    [sendText, setFriendlyError],
  );

  const start = useCallback(async () => {
    setError(undefined);
    setTranscript("");
    tts.stop();
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setFriendlyError("microphone-blocked");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setFriendlyError("unsupported-recorder");
      return;
    }
    try {
      setState("listening");
      abortRecordingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CAPTURE_CONSTRAINTS);
      const mimeType = getPreferredAudioMimeType();
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        setFriendlyError("unsupported-recorder");
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (abortRecordingRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size < MIN_AUDIO_BYTES) {
          setFriendlyError("short-recording");
          return;
        }
        const mediaType = recorder.mimeType.split(";")[0] || "audio/webm";
        void transcribe(blob, mediaType);
      };
      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setFriendlyError("microphone-blocked");
    }
  }, [setFriendlyError, transcribe, tts]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const cancelSpeech = useCallback(() => {
    tts.stop();
    setState("paused");
  }, [tts]);

  const reset = useCallback(() => {
    abortRecordingRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    tts.stop();
    setState("idle");
    setTranscript("");
    setResponseText("");
    setError(undefined);
  }, [tts]);

  return {
    state,
    transcript,
    responseText,
    error,
    messages,
    isBusy: ["listening", "recording", "transcribing", "thinking", "speaking"].includes(state),
    start,
    stop,
    sendText,
    cancelSpeech,
    reset,
    reloadMessages,
  };
}
