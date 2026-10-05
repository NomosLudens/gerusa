export const AI_MODELS = {
  chat:
    process.env.OPENROUTER_CHAT_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "deepseek/deepseek-v4-flash-0731",
  // Acionado automaticamente (via fetch wrapper em openrouter.server.ts) quando
  // a chamada ao modelo de chat primário falha antes do streaming começar.
  chatFallback:
    process.env.OPENROUTER_CHAT_MODEL_FALLBACK ||
    process.env.OPENROUTER_MODEL_FALLBACK_1 ||
    "poolside/laguna-s-2.1",
  fast:
    process.env.OPENROUTER_FAST_MODEL ||
    process.env.OPENROUTER_TRIAGE_MODEL ||
    process.env.OPENROUTER_TEXT_MODEL_FALLBACK_2 ||
    "openai/gpt-4o-mini",
  reasoning:
    process.env.OPENROUTER_REASONING_MODEL ||
    process.env.OPENROUTER_TEXT_MODEL_FALLBACK_1 ||
    process.env.OPENROUTER_MODEL_FALLBACK_2 ||
    "openai/gpt-4o",
  vision:
    process.env.OPENROUTER_VISION_MODEL_PRIMARY ||
    process.env.KUANYIN_IMAGE_READING_MODEL ||
    "openai/gpt-4o-mini",
  visionFallback: process.env.OPENROUTER_VISION_MODEL_FALLBACK_1 || "qwen/qwen3.7-plus",
  // Leitura nativa de documentos (PDF). Gemini lê PDF anexado de fato, ao
  // contrário do modelo de chat texto-only. Env-overridável.
  documents:
    process.env.OPENROUTER_PDF_MODEL ||
    process.env.OPENROUTER_DOCUMENT_MODEL ||
    "google/gemini-2.5-flash",
  documentsFallback:
    process.env.OPENROUTER_DOCUMENT_MODEL_FALLBACK || "google/gemini-2.5-flash-lite",
  tts: process.env.OPENROUTER_TTS_MODEL || process.env.OPENROUTER_TTS_PRIMARY_MODEL || "",
  ttsVoice: process.env.OPENROUTER_TTS_VOICE || "",
} as const;
