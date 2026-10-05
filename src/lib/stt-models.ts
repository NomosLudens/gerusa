export const STT_MODEL_KEY = "kallistis.stt.model";
export const STT_FALLBACK_MODEL_KEY = "kallistis.stt.fallbackModel";

export const STT_MODELS = [
  "google/gemini-2.5-flash-lite",
  "openai/whisper-large-v3",
  "openai/whisper-large-v3-turbo",
] as const;

export type STTModel = (typeof STT_MODELS)[number];

export function isSTTModel(value: unknown): value is STTModel {
  return typeof value === "string" && (STT_MODELS as readonly string[]).includes(value);
}
