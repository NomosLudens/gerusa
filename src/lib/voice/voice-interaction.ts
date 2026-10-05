import type { UIMessage } from "ai";

export type VoiceInteractionState =
  | "idle"
  | "listening"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "paused"
  | "error"
  | "blocked";

export type VoiceDomain = "kallistis" | "kharis" | "kuanyin";
export type VoiceSurface = "kallistis" | "klio" | "kharis" | "kuanyin";
export type VoiceMode = "default" | "pedagogical" | "meeting" | "commercial";

export type VoiceChatFacet = "kallistis" | "kharis" | "kuanyin";

export type VoiceInteractionOptions = {
  domain: VoiceDomain;
  surface?: VoiceSurface;
  mode?: VoiceMode;
  threadId?: string;
  autoSpeak?: boolean;
};

export type VoiceChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type VoiceErrorKind =
  | "microphone-blocked"
  | "unsupported-recorder"
  | "short-recording"
  | "empty-transcript"
  | "transcription-failed"
  | "chat-failed"
  | "tts-failed"
  | "offline"
  | "unknown";

const STATE_LABELS: Record<VoiceInteractionState, string> = {
  idle: "Pronto",
  listening: "Estou ouvindo",
  recording: "Gravando",
  transcribing: "Transcrevendo",
  thinking: "Pensando",
  speaking: "Falando",
  paused: "Pausado",
  error: "Algo deu errado",
  blocked: "Microfone bloqueado",
};

const ERROR_MESSAGES: Record<VoiceErrorKind, string> = {
  "microphone-blocked":
    "Nao consegui usar o microfone. Toque no cadeado do navegador e permita o microfone.",
  "unsupported-recorder": "Este navegador nao conseguiu gravar audio aqui.",
  "short-recording": "A gravacao ficou curta demais.",
  "empty-transcript": "Nao ouvi nada com clareza.",
  "transcription-failed": "Nao consegui transcrever agora.",
  "chat-failed": "Nao consegui responder agora.",
  "tts-failed": "Nao consegui falar agora, mas voce ainda pode ler a resposta na tela.",
  offline: "Parece que a conexao caiu. Tente de novo em instantes.",
  unknown: "Algo deu errado. Tente de novo.",
};

export function voiceStateLabel(state: VoiceInteractionState): string {
  return STATE_LABELS[state];
}

export function voiceErrorMessage(kind: VoiceErrorKind): string {
  return ERROR_MESSAGES[kind];
}

export function facetForVoiceDomain(domain: VoiceDomain): VoiceChatFacet {
  if (domain === "kuanyin") return "kuanyin";
  if (domain === "kharis") return "kharis";
  return "kallistis";
}

export function speechProfileForVoice(
  options: VoiceInteractionOptions,
): "kallistis" | "klio" | "kharis" {
  if (options.surface === "klio" || options.mode === "pedagogical") return "klio";
  if (options.domain === "kharis") return "kharis";
  return "kallistis";
}

export function buildVoiceUserMessage(text: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: text.trim() }],
  };
}

// Posição logo após a última pontuação de fim de frase em `text`, ou 0 se não
// achar nenhuma — usado para só falar frases completas enquanto o texto ainda
// está chegando (streaming), sem cortar no meio de uma ideia.
export function lastSentenceBoundary(text: string): number {
  let idx = -1;
  for (const mark of [".", "!", "?"]) {
    const found = text.lastIndexOf(mark);
    if (found > idx) idx = found;
  }
  return idx === -1 ? 0 : idx + 1;
}

export function buildVoiceChatPayload(options: VoiceInteractionOptions, messages: UIMessage[]) {
  if (!options.threadId) throw new Error("threadId required");
  const currentMessage = messages[messages.length - 1];
  if (!currentMessage || currentMessage.role !== "user") {
    throw new Error("current user message required");
  }
  return {
    facet: facetForVoiceDomain(options.domain),
    surface: options.surface,
    mode: options.mode ?? "default",
    threadId: options.threadId,
    messages: [currentMessage],
    assistantMessageId: crypto.randomUUID(),
  };
}
