import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UIMessage } from "ai";
import { streamText } from "ai";
import { distributedChatRateLimit, requestIdFor } from "@/lib/rate-limit";
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
  KAIROS_GUARDIAN_TURN_SYSTEM,
  KAIROS_KHORA_TURN_SYSTEM,
  ensureKhoraMention,
  resolveTelegramChannelContext,
} from "@/server/telegram/dialogue";
import { sendTelegramMessage, splitTelegramText } from "@/server/telegram/client";
import {
  claimTelegramUpdate,
  handleTelegramRoute,
  markTelegramUpdate,
  TelegramMessage,
  TelegramUpdate,
} from "./telegram";

const SAFE_ERROR = "Não consegui responder agora. Tente novamente em alguns instantes.";

function env(name: string): string {
  const value = (typeof process !== "undefined" ? process.env : {})[name];
  return typeof value === "string" ? value.trim() : "";
}

let supabaseAdminPromise: Promise<SupabaseClient> | undefined;

function getSupabaseAdmin(): Promise<SupabaseClient> {
  return (supabaseAdminPromise ??= import("@/integrations/supabase/client.server").then(
    ({ supabaseAdmin }) => supabaseAdmin,
  ));
}

const DIALOGUE_EXPIRY_MS = 15 * 60 * 1000;

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function ignored(reason: string, metadata?: { requestId: string; updateId: number }): Response {
  if (metadata) {
    console.info(
      JSON.stringify({
        type: "telegram_dialogue_ignored",
        reason,
        request_id: metadata.requestId,
        update_id: metadata.updateId,
      }),
    );
  }
  return json({ ok: true, ignored: true, reason });
}

function allowedUsers(): Set<string> {
  return new Set(
    env("TELEGRAM_ALLOWED_USER_IDS")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function sanitizeCode(error: unknown): string {
  return error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code.slice(0, 80)
    : "internal_error";
}

async function safeMarkTelegramUpdate(
  supabase: SupabaseClient,
  updateId: number,
  fields: Parameters<typeof markTelegramUpdate>[2],
  requestId: string,
): Promise<void> {
  try {
    await markTelegramUpdate(supabase, updateId, fields);
  } catch {
    console.error(
      JSON.stringify({
        level: "error",
        type: "telegram_dialogue_status_update_failed",
        request_id: requestId,
        update_id: updateId,
      }),
    );
  }
}

async function sendChunks(input: {
  token: string;
  chatId: number;
  text: string;
  replyToMessageId: number;
}): Promise<{ firstMessageId: number; lastMessageId: number }> {
  let firstTelegramId: number | null = null;
  let lastTelegramId: number | null = null;
  for (const chunk of splitTelegramText(input.text)) {
    if (!chunk) continue;
    lastTelegramId = await sendTelegramMessage({
      token: input.token,
      chatId: input.chatId,
      text: chunk,
      replyToMessageId: input.replyToMessageId,
    });
    if (firstTelegramId === null) {
      firstTelegramId = lastTelegramId;
    }
  }
  if (!Number.isInteger(firstTelegramId) || !Number.isInteger(lastTelegramId)) {
    throw Object.assign(new Error("telegram_invalid_response"), {
      code: "telegram_invalid_response",
    });
  }
  return { firstMessageId: firstTelegramId!, lastMessageId: lastTelegramId! };
}

type TelegramDialogueRow = {
  id: string;
  status: "open" | "processing" | "completed" | "failed";
  expires_at: string;
  created_at: string;
};

type DialogueReservationResult =
  | { kind: "reserved"; dialogueId: string }
  | { kind: "already_open" };

async function expireOpenDialogues(input: {
  supabase: SupabaseClient;
  chatId: number;
  userId: string;
  threadId: string;
  nowIso: string;
}): Promise<void> {
  const { error } = await input.supabase
    .from("telegram_dialogues")
    .update({ status: "failed", error_code: "dialogue_expired" })
    .eq("chat_id", input.chatId)
    .eq("user_id", input.userId)
    .eq("thread_id", input.threadId)
    .in("status", ["open", "processing"])
    .lt("expires_at", input.nowIso);
  if (error) {
    throw Object.assign(new Error("dialogue_state_unavailable"), {
      code: "dialogue_state_unavailable",
    });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505",
  );
}

async function reserveDialogue(input: {
  supabase: SupabaseClient;
  dialogueId: string;
  chatId: number;
  userId: string;
  threadId: string;
  expiresAt: string;
}): Promise<DialogueReservationResult> {
  const { error } = await input.supabase.from("telegram_dialogues").insert({
    id: input.dialogueId,
    chat_id: input.chatId,
    kallistis_message_id: null,
    user_id: input.userId,
    thread_id: input.threadId,
    status: "open",
    expires_at: input.expiresAt,
  });
  if (!error) return { kind: "reserved", dialogueId: input.dialogueId };
  if (isUniqueViolation(error)) return { kind: "already_open" };
  throw Object.assign(new Error("dialogue_state_failed"), {
    code: "dialogue_state_failed",
  });
}

async function failDialogue(input: {
  supabase: SupabaseClient;
  dialogueId: string;
  errorCode: string;
}): Promise<void> {
  const { data, error } = await input.supabase
    .from("telegram_dialogues")
    .update({ status: "failed", error_code: input.errorCode })
    .eq("id", input.dialogueId)
    .in("status", ["open", "processing"])
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error(
      JSON.stringify({
        level: "error",
        type: "telegram_dialogue_state_update_failed",
        reason: "dialogue_state_failed",
      }),
    );
  }
}

async function findActiveDialogues(input: {
  supabase: SupabaseClient;
  chatId: number;
  userId: string;
  threadId: string;
  nowIso: string;
  statuses: Array<"open" | "processing">;
}): Promise<TelegramDialogueRow[]> {
  const { data, error } = await input.supabase
    .from("telegram_dialogues")
    .select("id, status, expires_at, created_at")
    .eq("chat_id", input.chatId)
    .eq("user_id", input.userId)
    .eq("thread_id", input.threadId)
    .in("status", input.statuses)
    .gt("expires_at", input.nowIso)
    .order("created_at", { ascending: true });
  if (error) {
    throw Object.assign(new Error("dialogue_state_unavailable"), {
      code: "dialogue_state_unavailable",
    });
  }
  return (data ?? []) as TelegramDialogueRow[];
}

async function completeDialogueWithCandidate(input: {
  supabase: SupabaseClient;
  dialogueId: string;
  userId: string;
  threadId: string;
  assistantMessageId: string;
}) {
  const { data, error } = await input.supabase.rpc("complete_telegram_dialogue_with_candidate", {
    p_dialogue_id: input.dialogueId,
    p_user_id: input.userId,
    p_thread_id: input.threadId,
    p_assistant_message_id: input.assistantMessageId,
  });
  if (error) {
    throw Object.assign(new Error("dialogue_state_failed"), {
      code: "dialogue_state_failed",
    });
  }
  const result = data as {
    dialogue_id?: string;
    candidate_id?: string;
    already_completed?: boolean;
  } | null;
  if (!result?.dialogue_id || !result.candidate_id) {
    throw Object.assign(new Error("dialogue_completion_invalid"), {
      code: "dialogue_state_failed",
    });
  }
  return result;
}

export async function handleTelegramDialogueRoute(request: Request): Promise<Response> {
  if (request.method === "GET") return json({ ok: true, channel: "telegram-dialogue" });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const requestId = requestIdFor(request);
  const secret = env("TELEGRAM_WEBHOOK_SECRET");
  if (!secret) {
    console.error(
      JSON.stringify({
        level: "error",
        type: "telegram_dialogue_permanent_configuration_error",
        reason: "webhook_secret_missing",
        request_id: requestId,
      }),
    );
    return json({ ok: true });
  }
  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== secret) {
    return json({ error: "unauthorized", requestId }, 401);
  }

  const bodyRequest = request.clone();
  let raw: unknown;
  try {
    raw = await bodyRequest.json();
  } catch {
    return json({ error: "invalid_json", requestId }, 400);
  }

  const parsed = TelegramUpdate.safeParse(raw);
  if (!parsed.success) return ignored("invalid_update", { requestId, updateId: 0 });
  const update = parsed.data;
  const msgResult = update.message ? TelegramMessage.safeParse(update.message) : null;
  if (!msgResult) {
    ignored("update_without_message", { requestId, updateId: update.update_id });
    return new Response(null, { status: 204 });
  }
  if (!msgResult.success)
    return ignored("invalid_message", { requestId, updateId: update.update_id });
  const msg = msgResult.data;

  // Mensagens privadas são delegadas integralmente ao handler antigo
  if (msg.chat.type === "private") return handleTelegramRoute(request);

  const text = msg.text?.trim() ?? "";
  if (text.length > 4096)
    return ignored("text_too_long", { requestId, updateId: update.update_id });

  const allowed = allowedUsers();
  if (allowed.size === 0) {
    console.error(
      JSON.stringify({
        level: "error",
        type: "telegram_dialogue_permanent_configuration_error",
        reason: "allowed_guardian_missing",
        request_id: requestId,
        update_id: update.update_id,
      }),
    );
    return json({ ok: true });
  }

  const botToken = env("TELEGRAM_BOT_TOKEN");
  const userId = env("TELEGRAM_KALLISTIS_USER_ID");
  const threadId = env("TELEGRAM_KHORA_THREAD_ID");
  const dialogueConfig = {
    TELEGRAM_DIALOGUE_CHAT_ID: env("TELEGRAM_DIALOGUE_CHAT_ID"),
    TELEGRAM_KHORA_BOT_ID: env("TELEGRAM_KHORA_BOT_ID"),
    TELEGRAM_KHORA_BOT_USERNAME: env("TELEGRAM_KHORA_BOT_USERNAME"),
  };
  const missingDialogueConfig = Object.entries(dialogueConfig)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  const context = resolveTelegramChannelContext({
    chatType: msg.chat.type,
    chatId: msg.chat.id,
    fromId: msg.from.id,
    fromIsBot: msg.from.is_bot === true,
    text,
    hasVoice: Boolean(msg.voice),
    allowedHumanIds: allowed,
    dialogueChatId: dialogueConfig.TELEGRAM_DIALOGUE_CHAT_ID,
    khoraBotId: dialogueConfig.TELEGRAM_KHORA_BOT_ID,
    khoraBotUsername: dialogueConfig.TELEGRAM_KHORA_BOT_USERNAME,
  });

  if (context.kind === "ignored")
    return ignored(context.reason, { requestId, updateId: update.update_id });
  if (context.kind !== "dialogue")
    if (context.kind !== "misconfigured") {
      return ignored("dialogue_context_required", { requestId, updateId: update.update_id });
    }

  const permanentConfigurationError =
    context.kind === "misconfigured" || !botToken || !userId || !threadId;
  if (permanentConfigurationError) {
    const errorCode =
      context.kind === "misconfigured" ? context.reason : "telegram_dialogue_not_configured";
    if (context.kind === "misconfigured" || !botToken || !userId || !threadId) {
      console.error(
        JSON.stringify({
          level: "error",
          type: "telegram_dialogue_permanent_configuration_error",
          reason: errorCode,
          request_id: requestId,
          update_id: update.update_id,
          identifiable: false,
          missing: context.kind === "misconfigured" ? missingDialogueConfig : [],
        }),
      );
    }
    if (!userId || !threadId) {
      return json({ ok: true });
    }

    const supabaseAdmin = await getSupabaseAdmin();
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
      { status: "failed", error_code: errorCode },
      requestId,
    );
    if (botToken) {
      try {
        await sendTelegramMessage({
          token: botToken,
          chatId: msg.chat.id,
          text: "A Câmara da Travessia ainda não está configurada corretamente.",
          replyToMessageId: msg.message_id,
        });
      } catch {
        // A falha permanente já foi registrada e não será reenviada no retry.
      }
    }
    return json({ ok: true });
  }

  const userMessageId = crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();
  const supabaseAdmin = await getSupabaseAdmin();
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
  const { data: dialogueThread, error: dialogueThreadError } = await supabaseAdmin
    .from("chat_threads")
    .select("id, user_id, facet, surface")
    .eq("id", threadId)
    .maybeSingle();
  if (
    dialogueThreadError ||
    !dialogueThread ||
    dialogueThread.user_id !== userId ||
    dialogueThread.facet !== "kallistis" ||
    dialogueThread.surface !== "telegram_dialogue"
  ) {
    await safeMarkTelegramUpdate(
      supabaseAdmin,
      update.update_id,
      { status: "failed", error_code: "telegram_dialogue_thread_mismatch" },
      requestId,
    );
    try {
      await sendTelegramMessage({
        token: botToken,
        chatId: msg.chat.id,
        text: "A Câmara da Travessia ainda não está configurada corretamente.",
        replyToMessageId: msg.message_id,
      });
    } catch {
      // O estado persistente impede reenvio no retry.
    }
    return json({ ok: true });
  }

  let dialogueId: string | null = null;
  const stateNow = new Date().toISOString();
  try {
    await expireOpenDialogues({
      supabase: supabaseAdmin,
      chatId: msg.chat.id,
      userId,
      threadId,
      nowIso: stateNow,
    });
  } catch {
    await safeMarkTelegramUpdate(
      supabaseAdmin,
      update.update_id,
      { status: "failed", error_code: "dialogue_state_unavailable" },
      requestId,
    );
    return json({ error: "dialogue_state_unavailable", requestId }, 503);
  }

  if (context.sender === "khora") {
    let activeDialogues: TelegramDialogueRow[];
    try {
      activeDialogues = await findActiveDialogues({
        supabase: supabaseAdmin,
        chatId: msg.chat.id,
        userId,
        threadId,
        nowIso: stateNow,
        statuses: ["open"],
      });
    } catch {
      await safeMarkTelegramUpdate(
        supabaseAdmin,
        update.update_id,
        { status: "failed", error_code: "dialogue_state_unavailable" },
        requestId,
      );
      return json({ error: "dialogue_state_unavailable", requestId }, 503);
    }

    if (activeDialogues.length > 1) {
      await safeMarkTelegramUpdate(
        supabaseAdmin,
        update.update_id,
        { status: "failed", error_code: "dialogue_state_ambiguous" },
        requestId,
      );
      return ignored("dialogue_state_ambiguous", { requestId, updateId: update.update_id });
    }

    if (activeDialogues.length === 0) {
      await safeMarkTelegramUpdate(
        supabaseAdmin,
        update.update_id,
        { status: "responded", error_code: "dialogue_open_not_found" },
        requestId,
      );
      return ignored("dialogue_open_not_found", { requestId, updateId: update.update_id });
    }

    const nowIso = new Date().toISOString();
    const { data: updatedDialogue, error: updateDialogueErr } = await supabaseAdmin
      .from("telegram_dialogues")
      .update({ status: "processing", processing_at: nowIso })
      .eq("id", activeDialogues[0].id)
      .eq("status", "open")
      .gt("expires_at", nowIso)
      .select("id")
      .maybeSingle();

    if (updateDialogueErr) {
      await safeMarkTelegramUpdate(
        supabaseAdmin,
        update.update_id,
        { status: "failed", error_code: "dialogue_state_unavailable" },
        requestId,
      );
      return json({ error: "dialogue_state_unavailable", requestId }, 503);
    }
    if (!updatedDialogue) {
      await safeMarkTelegramUpdate(
        supabaseAdmin,
        update.update_id,
        { status: "responded", error_code: "dialogue_already_processed_or_expired" },
        requestId,
      );
      return ignored("dialogue_already_processed_or_expired", {
        requestId,
        updateId: update.update_id,
      });
    }
    dialogueId = updatedDialogue.id;
  } else {
    const reservation = await reserveDialogue({
      supabase: supabaseAdmin,
      dialogueId: crypto.randomUUID(),
      chatId: msg.chat.id,
      userId,
      threadId,
      expiresAt: new Date(Date.now() + DIALOGUE_EXPIRY_MS).toISOString(),
    }).catch(async () => {
      await safeMarkTelegramUpdate(
        supabaseAdmin,
        update.update_id,
        { status: "failed", error_code: "dialogue_state_failed" },
        requestId,
      );
      return null;
    });

    if (!reservation) return json({ ok: true });
    if (reservation.kind === "already_open") {
      try {
        await sendTelegramMessage({
          token: botToken,
          chatId: msg.chat.id,
          text: "Ainda estou ouvindo a Khora nesta travessia. Um instante.",
          replyToMessageId: msg.message_id,
        });
      } catch {
        await safeMarkTelegramUpdate(
          supabaseAdmin,
          update.update_id,
          { status: "failed", error_code: "dialogue_state_failed" },
          requestId,
        );
        return ignored("dialogue_state_failed", { requestId, updateId: update.update_id });
      }
      await safeMarkTelegramUpdate(
        supabaseAdmin,
        update.update_id,
        { status: "responded", error_code: "dialogue_already_open" },
        requestId,
      );
      return ignored("dialogue_already_open", { requestId, updateId: update.update_id });
    }
    dialogueId = reservation.dialogueId;
  }

  let limited: Response | null;
  try {
    limited = await distributedChatRateLimit(request, `telegram-dialogue:${msg.from.id}`);
  } catch {
    limited = Response.json({ error: "rate_limit_unavailable" }, { status: 503 });
  }

  if (limited) {
    const errorCode = limited.status === 429 ? "rate_limited" : "rate_limit_unavailable";
    if (dialogueId) {
      await failDialogue({ supabase: supabaseAdmin, dialogueId, errorCode });
    }
    await safeMarkTelegramUpdate(
      supabaseAdmin,
      update.update_id,
      { status: "failed", error_code: errorCode },
      requestId,
    );
    try {
      await sendTelegramMessage({
        token: botToken,
        chatId: msg.chat.id,
        text:
          limited.status === 429
            ? "Limite de diálogo atingido. Tente novamente em instantes."
            : SAFE_ERROR,
        replyToMessageId: msg.message_id,
      });
    } catch {
      // O registro persistente já contém a falha.
    }
    return json({ ok: true });
  }

  let boundaryBlocked = false;
  const runtime = createLegacySupabaseChatRuntime(supabaseAdmin);
  try {
    const userMessage: UIMessage = {
      id: userMessageId,
      role: "user",
      parts: [{ type: "text", text: context.text }],
    };
    const inspection = await inspectKallistisTurn({
      request,
      runtime,
      userId,
      threadId,
      userMessage,
      requestId,
      facet: "kallistis",
      surface: "telegram_dialogue",
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
        assistantMessageId,
        requestId,
        inspection,
        sourceChannel: "C03",
      });
      await markTelegramUpdate(supabaseAdmin, update.update_id, {
        user_message_id: userMessageId,
      });

      const systemExtra =
        context.sender === "guardian" ? KAIROS_GUARDIAN_TURN_SYSTEM : KAIROS_KHORA_TURN_SYSTEM;

      const gateway = createOpenRouterProvider({ requestId });
      const result = streamText({
        model: gateway(prepared.model),
        system: `${prepared.system}\n\n${systemExtra}`,
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
        userId,
        threadId,
        assistantMessageId,
        rawContent: rawAnswer,
        derivedFrom: prepared.derivedFrom,
        requestId,
        sourceChannel: "C03",
        sediment: false,
      });
      await markTelegramUpdate(supabaseAdmin, update.update_id, {
        assistant_message_id: assistantMessageId,
      });
    }

    if (context.sender === "guardian" && !boundaryBlocked) {
      content = ensureKhoraMention(content, dialogueConfig.TELEGRAM_KHORA_BOT_USERNAME);
    }
    const { firstMessageId, lastMessageId } = await sendChunks({
      token: botToken,
      chatId: msg.chat.id,
      text: content,
      replyToMessageId: msg.message_id,
    });

    if (context.sender === "guardian" && !boundaryBlocked) {
      const { data: linkedDialogue, error: linkError } = await supabaseAdmin
        .from("telegram_dialogues")
        .update({ kallistis_message_id: firstMessageId })
        .eq("id", dialogueId)
        .eq("status", "open")
        .is("kallistis_message_id", null)
        .select("id")
        .maybeSingle();
      if (linkError || !linkedDialogue) {
        throw Object.assign(new Error("dialogue_state_failed"), {
          code: "dialogue_state_failed",
        });
      }
    } else if (context.sender === "guardian" && dialogueId) {
      await failDialogue({
        supabase: supabaseAdmin,
        dialogueId,
        errorCode: "boundary_blocked",
      });
    } else if (context.sender === "khora" && dialogueId) {
      if (boundaryBlocked) {
        const { data: failedDialogue, error: failedDialogueError } = await supabaseAdmin
          .from("telegram_dialogues")
          .update({ status: "failed", error_code: "boundary_blocked" })
          .eq("id", dialogueId)
          .eq("status", "processing")
          .select("id")
          .maybeSingle();
        if (failedDialogueError || !failedDialogue) {
          throw Object.assign(new Error("dialogue_boundary_transition_failed"), {
            code: "dialogue_boundary_transition_failed",
          });
        }
        await safeMarkTelegramUpdate(
          supabaseAdmin,
          update.update_id,
          { status: "responded", telegram_response_message_id: lastMessageId, error_code: null },
          requestId,
        );
        return json({ ok: true });
      }
      await completeDialogueWithCandidate({
        supabase: supabaseAdmin,
        dialogueId,
        userId,
        threadId,
        assistantMessageId,
      });
    }

    await safeMarkTelegramUpdate(
      supabaseAdmin,
      update.update_id,
      {
        status: "responded",
        telegram_response_message_id: lastMessageId,
        error_code: null,
      },
      requestId,
    );
  } catch (error) {
    const errorCode = sanitizeCode(error);
    if (dialogueId) {
      await failDialogue({ supabase: supabaseAdmin, dialogueId, errorCode });
    }

    await safeMarkTelegramUpdate(
      supabaseAdmin,
      update.update_id,
      { status: "failed", error_code: errorCode },
      requestId,
    );
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
          type: "telegram_dialogue_safe_error_send_failed",
          request_id: requestId,
        }),
      );
    }
  }

  return json({ ok: true });
}

export const Route = createFileRoute("/api/channels/telegram-dialogue")({
  server: {
    handlers: {
      GET: ({ request }) => handleTelegramDialogueRoute(request),
      POST: ({ request }) => handleTelegramDialogueRoute(request),
    },
  },
});
