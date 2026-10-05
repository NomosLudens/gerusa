import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UIMessage } from "ai";
import { streamText } from "ai";
import { z } from "zod";
import { runInBackground } from "@/lib/background-task";
import { distributedChatRateLimit, requestIdFor } from "@/lib/rate-limit";
import {
  isAllowedAudioType,
  revisarTranscricaoTexto,
  transcribeAudioBlob,
} from "@/lib/transcribe.server";
import { synthesizeSpeech } from "@/lib/tts.server";
import {
  chatProviderTimeoutMs,
  createOpenRouterProvider,
  providerFailureMessage,
  providerFailureStatus,
} from "@/lib/openrouter.server";
import {
  KallistisChatError,
  inspectKallistisTurn,
  persistKallistisAssistant,
  prepareKallistisTurn,
} from "@/server/chat/kallistis-chat-runtime";
import { createLegacySupabaseChatRuntime } from "@/server/chat/legacy-supabase-runtime";
import {
  downloadTelegramFile,
  getTelegramFile,
  sendTelegramAudio,
  sendTelegramMessage,
  splitTelegramText,
} from "@/server/telegram/client";

const SAFE_ERROR = "Não consegui responder agora. Tente novamente em alguns instantes.";
const START_HELP =
  "Kallistis está conectada. Envie uma mensagem de texto ou uma mensagem de voz para continuar sua conversa.";
const MAX_TELEGRAM_VOICE_BYTES = 10 * 1024 * 1024;
const MAX_TELEGRAM_VOICE_DURATION_SECONDS = 180;
const MAX_TELEGRAM_TRANSCRIPT_CHARS = 4096;
const MAX_TELEGRAM_TTS_BYTES = 10 * 1024 * 1024;
const TELEGRAM_FILE_TIMEOUT_MS = 20_000;
const TELEGRAM_AUDIO_SEND_TIMEOUT_MS = 20_000;
const TELEGRAM_TTS_TIMEOUT_MS = 30_000;

const TelegramChat = z.object({ id: z.number().int(), type: z.string() }).passthrough();
const TelegramFrom = z
  .object({ id: z.number().int(), is_bot: z.boolean().optional() })
  .passthrough();
const TelegramVoice = z
  .object({
    file_id: z.string().min(1).max(512),
    file_unique_id: z.string().min(1).max(512).optional(),
    duration: z.number().int().nonnegative(),
    mime_type: z.string().max(120).optional(),
    file_size: z.number().int().nonnegative().optional(),
  })
  .passthrough();
const TelegramReplyToMessage = z
  .object({
    message_id: z.number().int(),
    from: TelegramFrom.optional(),
    text: z.string().optional(),
  })
  .passthrough()
  .optional();
export const TelegramMessage = z
  .object({
    message_id: z.number().int(),
    text: z.string().optional(),
    voice: TelegramVoice.optional(),
    chat: TelegramChat,
    from: TelegramFrom,
    reply_to_message: TelegramReplyToMessage,
  })
  .passthrough();
export const TelegramUpdate = z
  .object({ update_id: z.number().int(), message: TelegramMessage.optional() })
  .passthrough();

type TelegramUpdateFields = {
  status?: "processing" | "responded" | "failed";
  telegram_response_message_id?: number | null;
  error_code?: string | null;
  user_message_id?: string | null;
  assistant_message_id?: string | null;
};
type TelegramClaimResult =
  | { kind: "claimed" }
  | { kind: "duplicate" }
  | { kind: "error"; code: string };

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}
function ignored(reason?: string) {
  return json(reason ? { ok: true, ignored: true, reason } : { ok: true, ignored: true });
}
function env(name: string) {
  return process.env[name]?.trim() ?? "";
}
function allowedUsers() {
  return new Set(
    env("TELEGRAM_ALLOWED_USER_IDS")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  );
}
function sanitizeCode(error: unknown) {
  return error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code.slice(0, 80)
    : "internal_error";
}
function sanitizeDatabaseError(error: unknown) {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code.slice(0, 80)
    : "database_error";
}

export async function claimTelegramUpdate(input: {
  supabase: SupabaseClient;
  updateId: number;
  telegramUserId: number;
  telegramChatId: number;
  supabaseUserId: string;
  threadId: string;
  userMessageId: string | null;
  assistantMessageId: string | null;
}): Promise<TelegramClaimResult> {
  const { error } = await input.supabase.from("telegram_channel_updates").insert({
    update_id: input.updateId,
    telegram_user_id: input.telegramUserId,
    telegram_chat_id: input.telegramChatId,
    supabase_user_id: input.supabaseUserId,
    thread_id: input.threadId,
    user_message_id: input.userMessageId,
    assistant_message_id: input.assistantMessageId,
    status: "processing",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (!error) return { kind: "claimed" };
  if (error.code === "23505") return { kind: "duplicate" };
  return { kind: "error", code: sanitizeDatabaseError(error) };
}

export async function markTelegramUpdate(
  supabase: SupabaseClient,
  updateId: number,
  fields: TelegramUpdateFields,
) {
  const { error } = await supabase
    .from("telegram_channel_updates")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("update_id", updateId);
  if (error)
    throw Object.assign(new Error("telegram_status_update_failed"), {
      code: "telegram_status_update_failed",
    });
}

async function safeMarkTelegramUpdate(
  supabase: SupabaseClient,
  updateId: number,
  fields: TelegramUpdateFields,
  context: { requestId: string; stage: string },
): Promise<boolean> {
  try {
    await markTelegramUpdate(supabase, updateId, fields);
    return true;
  } catch {
    console.error(
      JSON.stringify({
        level: "error",
        type: "telegram_status_update_failed",
        request_id: context.requestId,
        update_id: updateId,
        stage: context.stage,
      }),
    );
    return false;
  }
}

async function finishRateLimitedUpdate(input: {
  supabase: SupabaseClient;
  updateId: number;
  requestId: string;
  botToken: string;
  chatId: number;
  replyToMessageId: number;
  message: string;
  errorCode: "rate_limited" | "rate_limit_unavailable";
}) {
  try {
    await sendTelegramMessage({
      token: input.botToken,
      chatId: input.chatId,
      text: input.message,
      replyToMessageId: input.replyToMessageId,
    });
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: "warn",
        type: "telegram_rate_limit_notice_failed",
        request_id: input.requestId,
        update_id: input.updateId,
        error_code: sanitizeCode(error),
      }),
    );
  }
  await safeMarkTelegramUpdate(
    input.supabase,
    input.updateId,
    { status: "failed", error_code: input.errorCode },
    { requestId: input.requestId, stage: input.errorCode },
  );
}

async function sendChunks(input: {
  token: string;
  chatId: number;
  text: string;
  replyToMessageId: number;
}) {
  let lastTelegramId: number | null = null;
  for (const chunk of splitTelegramText(input.text)) {
    if (!chunk) continue;
    lastTelegramId = await sendTelegramMessage({
      token: input.token,
      chatId: input.chatId,
      text: chunk,
      replyToMessageId: input.replyToMessageId,
    });
  }
  if (!Number.isInteger(lastTelegramId))
    throw Object.assign(new Error("telegram_invalid_response"), {
      code: "telegram_invalid_response",
    });
  return lastTelegramId;
}

async function finishVoiceInputFailure(input: {
  supabase: SupabaseClient;
  updateId: number;
  requestId: string;
  botToken: string;
  chatId: number;
  replyToMessageId: number;
  errorCode: string;
  userMessage: string;
}): Promise<void> {
  let telegramMessageId: number | null = null;
  try {
    telegramMessageId = await sendTelegramMessage({
      token: input.botToken,
      chatId: input.chatId,
      text: input.userMessage,
      replyToMessageId: input.replyToMessageId,
    });
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: "warn",
        type: "telegram_voice_failure_notice_failed",
        request_id: input.requestId,
        update_id: input.updateId,
        error_code: sanitizeCode(error),
      }),
    );
  }
  await safeMarkTelegramUpdate(
    input.supabase,
    input.updateId,
    {
      status: "failed",
      error_code: input.errorCode,
      telegram_response_message_id: telegramMessageId,
      user_message_id: null,
      assistant_message_id: null,
    },
    { requestId: input.requestId, stage: input.errorCode },
  );
}

function transcriptionErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return "telegram_voice_transcription_failed";
  switch (error.name) {
    case "TranscriptionNotConfiguredError":
      return "telegram_voice_transcription_not_configured";
    case "UnsupportedAudioTypeError":
      return "telegram_voice_unsupported_type";
    case "TranscriptionTimeoutError":
      return "telegram_voice_transcription_timeout";
    case "TranscriptionUpstreamError":
      return "telegram_voice_transcription_failed";
    default:
      return "telegram_voice_transcription_failed";
  }
}

function voiceInputErrorCode(error: unknown): string {
  const code = sanitizeCode(error);
  if (code === "telegram_file_too_large") return "telegram_voice_too_large";
  if (
    code === "telegram_file_empty" ||
    code.startsWith("telegram_get_file_") ||
    code.startsWith("telegram_file_download_")
  ) {
    return code;
  }
  return transcriptionErrorCode(error);
}

function voiceFailureMessage(errorCode: string) {
  switch (errorCode) {
    case "telegram_voice_too_long":
      return "O áudio é longo demais. Envie uma mensagem de voz de até 3 minutos.";
    case "telegram_voice_too_large":
      return "O arquivo de áudio é grande demais. Grave uma mensagem de voz mais curta.";
    case "telegram_voice_unsupported_type":
      return "Não consegui ler esse formato. Envie uma mensagem de voz gravada pelo próprio Telegram.";
    case "telegram_voice_empty_transcript":
      return "Não consegui entender o áudio. Tente gravar novamente com menos ruído.";
    case "telegram_voice_transcript_too_long":
      return "A transcrição ficou longa demais. Envie o conteúdo em partes menores.";
    case "telegram_get_file_timeout":
    case "telegram_file_download_timeout":
      return "O Telegram demorou demais para entregar o áudio. Tente enviar novamente.";
    case "telegram_file_empty":
      return "O áudio recebido está vazio. Grave uma nova mensagem de voz.";
    default:
      if (
        errorCode.startsWith("telegram_get_file_") ||
        errorCode.startsWith("telegram_file_download_")
      ) {
        return "Não consegui baixar o áudio agora. Tente enviar novamente em alguns instantes.";
      }
      return "Não consegui transcrever o áudio agora. Tente novamente em alguns instantes.";
  }
}

async function sendVoiceReplyInBackground(input: {
  requestId: string;
  updateId: number;
  botToken: string;
  chatId: number;
  replyToMessageId: number;
  text: string;
}): Promise<void> {
  let model: string | undefined;
  let contentType: string | undefined;
  try {
    const speech = await synthesizeSpeech({
      text: input.text,
      signal: AbortSignal.timeout(TELEGRAM_TTS_TIMEOUT_MS),
    });
    model = speech.model;
    contentType = speech.contentType;
    if (speech.contentType !== "audio/mpeg") {
      console.warn(
        JSON.stringify({
          level: "warn",
          type: "telegram_tts_non_mp3",
          request_id: input.requestId,
          update_id: input.updateId,
          model: speech.model,
          content_type: speech.contentType,
        }),
      );
      return;
    }
    if (speech.audio.size === 0 || speech.audio.size > MAX_TELEGRAM_TTS_BYTES) {
      console.warn(
        JSON.stringify({
          level: "warn",
          type: "telegram_tts_size_invalid",
          request_id: input.requestId,
          update_id: input.updateId,
          model: speech.model,
          content_type: speech.contentType,
        }),
      );
      return;
    }
    await sendTelegramAudio({
      token: input.botToken,
      chatId: input.chatId,
      audio: speech.audio,
      filename: "kallistis-resposta.mp3",
      replyToMessageId: input.replyToMessageId,
      timeoutMs: TELEGRAM_AUDIO_SEND_TIMEOUT_MS,
    });
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: "warn",
        type: "telegram_tts_background_failed",
        request_id: input.requestId,
        update_id: input.updateId,
        stage: "tts_or_send_audio",
        error_code: sanitizeCode(error),
        model,
        content_type: contentType,
      }),
    );
  }
}

export async function handleTelegramRoute(request: Request): Promise<Response> {
  if (request.method === "GET") return json({ ok: true, channel: "telegram" });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const requestId = requestIdFor(request);
  const secret = env("TELEGRAM_WEBHOOK_SECRET");
  if (!secret) {
    console.error(
      JSON.stringify({
        level: "error",
        type: "telegram_permanent_configuration_error",
        reason: "webhook_secret_missing",
        request_id: requestId,
      }),
    );
    return json({ ok: true });
  }
  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== secret)
    return json({ error: "unauthorized", requestId }, 401);
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "invalid_json", requestId }, 400);
  }
  const parsed = TelegramUpdate.safeParse(raw);
  if (!parsed.success) return ignored();
  const update = parsed.data;
  const msg = update.message;
  if (!msg) return new Response(null, { status: 204 });
  const rawText = msg.text?.trim() ?? "";
  const voice = rawText ? undefined : msg.voice;
  if (!rawText && !voice) return new Response(null, { status: 204 });
  if (rawText.length > 4096) return ignored("text_too_long");
  if (msg.chat.type !== "private") return ignored();
  if (msg.from.is_bot === true) return ignored();
  const allowed = allowedUsers();
  if (allowed.size === 0) {
    console.error(
      JSON.stringify({
        level: "error",
        type: "telegram_permanent_configuration_error",
        reason: "allowed_user_missing",
        request_id: requestId,
        update_id: update.update_id,
      }),
    );
    return json({ ok: true });
  }
  if (!allowed.has(String(msg.from.id))) return ignored();
  const botToken = env("TELEGRAM_BOT_TOKEN");
  const userId = env("TELEGRAM_KALLISTIS_USER_ID");
  const threadId = env("TELEGRAM_KALLISTIS_THREAD_ID");
  if (!botToken || !userId || !threadId) {
    if (!userId || !threadId) {
      console.error(
        JSON.stringify({
          level: "error",
          type: "telegram_permanent_configuration_error",
          reason: "telegram_not_configured",
          request_id: requestId,
          update_id: update.update_id,
          identifiable: false,
        }),
      );
      return json({ ok: true });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claim = await claimTelegramUpdate({
      supabase: supabaseAdmin,
      updateId: update.update_id,
      telegramUserId: msg.from.id,
      telegramChatId: msg.chat.id,
      supabaseUserId: userId,
      threadId,
      userMessageId: null,
      assistantMessageId: null,
    });
    if (claim.kind === "duplicate") return json({ ok: true, duplicate: true });
    if (claim.kind === "error") return json({ error: "telegram_claim_failed", requestId }, 503);
    await safeMarkTelegramUpdate(
      supabaseAdmin,
      update.update_id,
      { status: "failed", error_code: "telegram_not_configured" },
      { requestId, stage: "permanent_configuration_error" },
    );
    return json({ ok: true });
  }
  const command = rawText === "/start" || rawText === "/help";
  const inputKind: "text" | "voice" = voice ? "voice" : "text";
  const userMessageId = command ? null : crypto.randomUUID();
  const assistantMessageId = command ? null : crypto.randomUUID();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const claim = await claimTelegramUpdate({
    supabase: supabaseAdmin,
    updateId: update.update_id,
    telegramUserId: msg.from.id,
    telegramChatId: msg.chat.id,
    supabaseUserId: userId,
    threadId,
    userMessageId: null,
    assistantMessageId: null,
  });
  if (claim.kind === "duplicate") return json({ ok: true, duplicate: true });
  if (claim.kind === "error") return json({ error: "telegram_claim_failed", requestId }, 503);
  const { resolveCanonicalPrivateThread } = await import("@/lib/ensure-thread-legacy");
  const canonical = await resolveCanonicalPrivateThread(supabaseAdmin, userId);
  if (canonical.kind !== "found" || canonical.id !== threadId) {
    const errorCode =
      canonical.kind === "ambiguous"
        ? "canonical_private_thread_ambiguous"
        : "telegram_private_thread_mismatch";
    try {
      await sendTelegramMessage({
        token: botToken,
        chatId: msg.chat.id,
        text: "A conversa privada da Kallistis ainda não está configurada corretamente.",
        replyToMessageId: msg.message_id,
      });
    } catch {
      // O erro seguro já será registrado no update abaixo.
    }
    await safeMarkTelegramUpdate(
      supabaseAdmin,
      update.update_id,
      { status: "failed", error_code: errorCode },
      { requestId, stage: "canonical_private_thread_mismatch" },
    );
    return json({ ok: true });
  }
  if (command) {
    try {
      const telegramMessageId = await sendTelegramMessage({
        token: botToken,
        chatId: msg.chat.id,
        text: START_HELP,
        replyToMessageId: msg.message_id,
      });
      await safeMarkTelegramUpdate(
        supabaseAdmin,
        update.update_id,
        { status: "responded", telegram_response_message_id: telegramMessageId, error_code: null },
        { requestId, stage: "command_responded" },
      );
    } catch (error) {
      await safeMarkTelegramUpdate(
        supabaseAdmin,
        update.update_id,
        { status: "failed", error_code: sanitizeCode(error) },
        { requestId, stage: "command_failed" },
      );
    }
    return json({ ok: true });
  }
  let limited: Response | null;
  try {
    limited = await distributedChatRateLimit(request, `telegram:${msg.from.id}`);
  } catch {
    limited = Response.json({ error: "rate_limit_unavailable" }, { status: 503 });
  }
  if (limited?.status === 429) {
    await finishRateLimitedUpdate({
      supabase: supabaseAdmin,
      updateId: update.update_id,
      requestId,
      botToken,
      chatId: msg.chat.id,
      replyToMessageId: msg.message_id,
      message: "Limite de uso atingido. Tente novamente em instantes.",
      errorCode: "rate_limited",
    });
    return json({ ok: true });
  }
  if (limited) {
    await finishRateLimitedUpdate({
      supabase: supabaseAdmin,
      updateId: update.update_id,
      requestId,
      botToken,
      chatId: msg.chat.id,
      replyToMessageId: msg.message_id,
      message: SAFE_ERROR,
      errorCode: "rate_limit_unavailable",
    });
    return json({ ok: true });
  }
  let canonicalText = rawText;
  if (inputKind === "voice" && voice) {
    const fail = async (errorCode: string) => {
      await finishVoiceInputFailure({
        supabase: supabaseAdmin,
        updateId: update.update_id,
        requestId,
        botToken,
        chatId: msg.chat.id,
        replyToMessageId: msg.message_id,
        errorCode,
        userMessage: voiceFailureMessage(errorCode),
      });
    };
    if (voice.duration > MAX_TELEGRAM_VOICE_DURATION_SECONDS) {
      await fail("telegram_voice_too_long");
      return json({ ok: true });
    }
    if (voice.file_size !== undefined && voice.file_size > MAX_TELEGRAM_VOICE_BYTES) {
      await fail("telegram_voice_too_large");
      return json({ ok: true });
    }
    const originalMediaType = voice.mime_type?.split(";")[0] || "audio/ogg";
    if (!isAllowedAudioType(originalMediaType)) {
      await fail("telegram_voice_unsupported_type");
      return json({ ok: true });
    }
    try {
      const fileInfo = await getTelegramFile({
        token: botToken,
        fileId: voice.file_id,
        timeoutMs: TELEGRAM_FILE_TIMEOUT_MS,
      });
      if (fileInfo.fileSize !== null && fileInfo.fileSize > MAX_TELEGRAM_VOICE_BYTES) {
        await fail("telegram_voice_too_large");
        return json({ ok: true });
      }
      const audioBlob = await downloadTelegramFile({
        token: botToken,
        filePath: fileInfo.filePath,
        mediaType: originalMediaType,
        maxBytes: MAX_TELEGRAM_VOICE_BYTES,
        timeoutMs: TELEGRAM_FILE_TIMEOUT_MS,
      });
      const transcription = await transcribeAudioBlob(audioBlob, originalMediaType);
      const revisedText = transcription.text.trim()
        ? await revisarTranscricaoTexto(transcription.text)
        : "";
      canonicalText = revisedText.trim();
      if (!canonicalText) {
        await fail("telegram_voice_empty_transcript");
        return json({ ok: true });
      }
      if (canonicalText.length > MAX_TELEGRAM_TRANSCRIPT_CHARS) {
        await fail("telegram_voice_transcript_too_long");
        return json({ ok: true });
      }
    } catch (error) {
      const errorCode = voiceInputErrorCode(error);
      await fail(errorCode);
      return json({ ok: true });
    }
  }
  let boundaryBlocked = false;
  let assistantTextForTts = "";
  const runtime = createLegacySupabaseChatRuntime(supabaseAdmin);
  try {
    const userMessage: UIMessage = {
      id: userMessageId!,
      role: "user",
      parts: [{ type: "text", text: canonicalText }],
    };
    const inspection = await inspectKallistisTurn({
      request,
      runtime,
      userId,
      threadId,
      userMessage,
      requestId,
      facet: "kallistis",
      surface: "kallistis",
      mode: "default",
    });
    let content: string;
    if (inspection.kind === "blocked") {
      boundaryBlocked = true;
      content = inspection.message;
    } else {
      const prepared = await prepareKallistisTurn({
        request,
        runtime,
        userId,
        threadId,
        userMessage,
        assistantMessageId: assistantMessageId!,
        requestId,
        inspection,
        sourceChannel: "C02",
      });
      await markTelegramUpdate(supabaseAdmin, update.update_id, {
        user_message_id: userMessageId,
      });
      const gateway = createOpenRouterProvider({ requestId });
      const result = streamText({
        model: gateway(prepared.model),
        system: prepared.system,
        messages: prepared.modelMessages,
        temperature: 0.55,
        frequencyPenalty: 0.4,
        presencePenalty: 0.3,
        maxRetries: 0,
        abortSignal: request.signal,
        timeout: { totalMs: chatProviderTimeoutMs() },
      });
      let rawAnswer = "";
      try {
        for await (const part of result.textStream) rawAnswer += part;
      } catch (error) {
        throw new KallistisChatError({
          code: providerFailureStatus(error) === 504 ? "provider_timeout" : "provider_failed",
          status: providerFailureStatus(error),
          stage: "provider",
          message: providerFailureMessage(error, requestId),
        });
      }
      content = await persistKallistisAssistant({
        request,
        runtime,
        sedimentationTrigger: async () => {
          const { sedimentarThreadCore } = await import("@/lib/sedimentar.functions");
          await sedimentarThreadCore(runtime, userId, threadId);
        },
        userId,
        threadId,
        assistantMessageId: assistantMessageId!,
        rawContent: rawAnswer,
        derivedFrom: prepared.derivedFrom,
        requestId,
        sourceChannel: "C02",
      });
      await markTelegramUpdate(supabaseAdmin, update.update_id, {
        assistant_message_id: assistantMessageId,
      });
    }
    assistantTextForTts = content;
    const lastTelegramId = await sendChunks({
      token: botToken,
      chatId: msg.chat.id,
      text: content,
      replyToMessageId: msg.message_id,
    });
    const markedResponded = await safeMarkTelegramUpdate(
      supabaseAdmin,
      update.update_id,
      {
        status: "responded",
        telegram_response_message_id: lastTelegramId,
        error_code: null,
      },
      { requestId, stage: boundaryBlocked ? "boundary_responded" : "processing_responded" },
    );
    if (markedResponded && inputKind === "voice" && !boundaryBlocked) {
      runInBackground(request, () =>
        sendVoiceReplyInBackground({
          requestId,
          updateId: update.update_id,
          botToken,
          chatId: msg.chat.id,
          replyToMessageId: msg.message_id,
          text: assistantTextForTts,
        }),
      );
    }
  } catch (error) {
    const errorCode = sanitizeCode(error);
    await safeMarkTelegramUpdate(
      supabaseAdmin,
      update.update_id,
      {
        status: "failed",
        error_code: errorCode,
      },
      { requestId, stage: boundaryBlocked ? "boundary_failed" : "processing_failed" },
    );
    if (!boundaryBlocked) {
      try {
        await sendTelegramMessage({
          token: botToken,
          chatId: msg.chat.id,
          text: SAFE_ERROR,
          replyToMessageId: msg.message_id,
        });
      } catch {
        console.warn(
          JSON.stringify({
            level: "warn",
            type: "telegram_safe_error_send_failed",
            request_id: requestId,
          }),
        );
      }
    }
  }
  return json({ ok: true });
}

export const Route = createFileRoute("/api/channels/telegram")({
  server: {
    handlers: {
      GET: ({ request }) => handleTelegramRoute(request),
      POST: ({ request }) => handleTelegramRoute(request),
    },
  },
});
