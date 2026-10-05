export const CHAT_MODEL_KEY = "kallistis.chat.model";
export const CHAT_MODELS = ["google/gemini-2.5-flash-lite", "poolside/laguna-xs-2.1"] as const;
export type ChatModel = (typeof CHAT_MODELS)[number];

export function isChatModel(value: unknown): value is ChatModel {
  return typeof value === "string" && (CHAT_MODELS as readonly string[]).includes(value);
}
