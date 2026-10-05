export const KAIROS_GUARDIAN_TURN_SYSTEM = [
  "Kairós é um protocolo interno e não deve aparecer na mensagem.",
  "O Guardião iniciou uma travessia entre Kallistis e Khora.",
  "Produza um único turno claro, natural e dirigido à Khora pelo username técnico fornecido.",
  "Faça uma pergunta ou passagem clara que convide outra perspectiva.",
  "Não explique o protocolo, não use marcadores técnicos, não promova memória e não execute ações.",
].join(" ");

export const KAIROS_KHORA_TURN_SYSTEM = [
  "Kairós é um protocolo interno e não deve aparecer na mensagem.",
  "O texto recebido veio da Khora autorizada nesta travessia.",
  "Sintetize a travessia e responda ao Guardião naturalmente, usando somente o texto da Khora",
  "como novo turno.",
  "Não mencione protocolo, marcador ou estado interno.",
  "Não execute ações, não confirme memória automaticamente e produza conteúdo adequado",
  "para revisão.",
].join(" ");

export type TelegramChannelContext =
  | { kind: "private"; text: string }
  | {
      kind: "dialogue";
      sender: "guardian" | "khora";
      text: string;
    }
  | { kind: "ignored"; reason: string }
  | { kind: "misconfigured"; reason: "telegram_dialogue_not_configured" };

type ResolveTelegramChannelContextInput = {
  chatType: string;
  chatId: number;
  fromId: number;
  fromIsBot: boolean;
  text: string;
  hasVoice: boolean;
  allowedHumanIds: ReadonlySet<string>;
  dialogueChatId: string;
  khoraBotId: string;
  khoraBotUsername: string;
};

export function normalizeTelegramUsername(value: string): string {
  const username = value.trim().replace(/^@+/, "");
  return username ? `@${username}` : "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTelegramUsernameMention(text: string, username: string): boolean {
  const normalized = normalizeTelegramUsername(username);
  if (!normalized) return false;
  const bareUsername = normalized.slice(1);
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_])@${escapeRegExp(bareUsername)}(?=$|[^\\p{L}\\p{N}_])`,
    "iu",
  );
  return pattern.test(text);
}

function dialogueCommandPayload(text: string): string | null {
  const trimmed = text.trim();
  const [head = ""] = trimmed.split(/\s+/, 1);
  if (head.split("@", 1)[0].toLowerCase() !== "/dialogo") return null;
  return trimmed.slice(head.length).trim();
}

export function ensureKhoraMention(content: string, khoraBotUsername: string): string {
  const normalized = normalizeTelegramUsername(khoraBotUsername);
  const trimmed = content.trim();
  if (!normalized || !trimmed || hasTelegramUsernameMention(trimmed, normalized)) return trimmed;
  return `${normalized}, ${trimmed}`;
}

export function resolveTelegramChannelContext(
  input: ResolveTelegramChannelContextInput,
): TelegramChannelContext {
  if (input.chatType === "private") {
    if (input.fromIsBot) return { kind: "ignored", reason: "bot_private_ignored" };
    if (!input.allowedHumanIds.has(String(input.fromId))) {
      return { kind: "ignored", reason: "user_not_allowed" };
    }
    return { kind: "private", text: input.text };
  }

  if (input.chatType !== "group" && input.chatType !== "supergroup") {
    return { kind: "ignored", reason: "chat_type_not_supported" };
  }

  if (!input.dialogueChatId) {
    return { kind: "misconfigured", reason: "telegram_dialogue_not_configured" };
  }
  if (String(input.chatId) !== input.dialogueChatId) {
    return { kind: "ignored", reason: "dialogue_chat_not_allowed" };
  }

  if (input.hasVoice) return { kind: "ignored", reason: "dialogue_text_only" };
  if (!input.text) return { kind: "ignored", reason: "dialogue_empty" };

  if (input.fromIsBot) {
    if (!input.khoraBotId) {
      return { kind: "misconfigured", reason: "telegram_dialogue_not_configured" };
    }
    if (String(input.fromId) !== input.khoraBotId) {
      return { kind: "ignored", reason: "dialogue_bot_not_allowed" };
    }
    return { kind: "dialogue", sender: "khora", text: input.text.trim() };
  }

  if (!input.allowedHumanIds.has(String(input.fromId))) {
    return { kind: "ignored", reason: "dialogue_user_not_allowed" };
  }

  const commandText = dialogueCommandPayload(input.text);
  const text = commandText ?? input.text.trim();
  if (!text) return { kind: "ignored", reason: "dialogue_empty" };

  if (!input.khoraBotId || !normalizeTelegramUsername(input.khoraBotUsername)) {
    return { kind: "misconfigured", reason: "telegram_dialogue_not_configured" };
  }

  if (hasTelegramUsernameMention(text, input.khoraBotUsername)) {
    return { kind: "ignored", reason: "dialogue_addressed_to_khora" };
  }

  return { kind: "dialogue", sender: "guardian", text };
}
