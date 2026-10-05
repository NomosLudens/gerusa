import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TelegramClientError } from "@/server/telegram/client";
import { claimTelegramUpdate, TelegramUpdate } from "./telegram";

const realUpdate = {
  update_id: 200862110,
  message: {
    message_id: 14,
    from: { id: 8993019248, is_bot: false, first_name: "Tony", language_code: "pt-br" },
    chat: { id: 8993019248, first_name: "Tony", type: "private" },
    date: 1784506069,
    text: "Teste direto",
  },
};

function telegramRequest(update: unknown, secret = "secret") {
  return new Request("https://example.test/api/channels/telegram", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": secret, "content-type": "application/json" },
    body: JSON.stringify(update),
  });
}

function voiceUpdate(voice: Record<string, unknown> = {}, updateId = 1, text?: string) {
  return {
    update_id: updateId,
    message: {
      message_id: 10,
      ...(text !== undefined ? { text } : {}),
      voice: { file_id: "voice-file", duration: 12, mime_type: "audio/ogg", ...voice },
      chat: { id: 2, type: "private", first_name: "Tony" },
      from: { id: 2, is_bot: false, first_name: "Tony" },
    },
  };
}

function update(text = "oi", updateId = 1) {
  return {
    update_id: updateId,
    message: {
      message_id: 10,
      text,
      chat: { id: 2, type: "private", first_name: "Tony" },
      from: { id: 2, is_bot: false, first_name: "Tony" },
    },
  };
}

describe("TelegramUpdate schema", () => {
  it("aceita payload real com first_name e campos extras", () => {
    expect(TelegramUpdate.safeParse(realUpdate).success).toBe(true);
  });

  it("aceita updates desconhecidos sem message", () => {
    expect(TelegramUpdate.safeParse({ update_id: 1, callback_query: { id: "x" } }).success).toBe(
      true,
    );
  });
});

describe("claimTelegramUpdate", () => {
  function supabaseWith(error: null | { code: string }) {
    return {
      from: vi.fn(() => ({
        insert: vi.fn(async () => ({ error })),
      })),
    } as never;
  }

  it("retorna claimed quando insert passa", async () => {
    await expect(
      claimTelegramUpdate({
        supabase: supabaseWith(null),
        updateId: 1,
        telegramUserId: 2,
        telegramChatId: 2,
        supabaseUserId: "u",
        threadId: "t",
        userMessageId: "m",
        assistantMessageId: "a",
      }),
    ).resolves.toEqual({ kind: "claimed" });
  });

  it("somente 23505 é duplicidade", async () => {
    await expect(
      claimTelegramUpdate({
        supabase: supabaseWith({ code: "23505" }),
        updateId: 1,
        telegramUserId: 2,
        telegramChatId: 2,
        supabaseUserId: "u",
        threadId: "t",
        userMessageId: null,
        assistantMessageId: null,
      }),
    ).resolves.toEqual({ kind: "duplicate" });
  });

  it("erro 42P01 não vira duplicidade", async () => {
    await expect(
      claimTelegramUpdate({
        supabase: supabaseWith({ code: "42P01" }),
        updateId: 1,
        telegramUserId: 2,
        telegramChatId: 2,
        supabaseUserId: "u",
        threadId: "t",
        userMessageId: null,
        assistantMessageId: null,
      }),
    ).resolves.toEqual({ kind: "error", code: "42P01" });
  });
});

describe("handleTelegramRoute", () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = OLD_ENV;
    vi.doUnmock("@/integrations/supabase/client.server");
    vi.doUnmock("@/server/telegram/client");
    vi.doUnmock("@/server/chat/kallistis-chat-runtime");
    vi.doUnmock("@/lib/openrouter.server");
    vi.doUnmock("@/lib/rate-limit");
    vi.doUnmock("ai");
    vi.resetModules();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      TELEGRAM_WEBHOOK_SECRET: "secret",
      TELEGRAM_ALLOWED_USER_IDS: "2",
      TELEGRAM_BOT_TOKEN: "bot",
      TELEGRAM_KALLISTIS_USER_ID: "user",
      TELEGRAM_KALLISTIS_THREAD_ID: "thread",
    };
  });

  async function setup(
    input: {
      insertErrors?: Array<null | { code: string }>;
      updateErrors?: Array<null | { code: string }>;
      rateLimit?: Response | null;
      rateLimitThrows?: boolean;
      inspection?: { kind: "ready"; latestUserText: string } | { kind: "blocked"; message: string };
      prepareThrows?: Error;
      persistThrows?: Error;
      inspectThrows?: Error;
      sendThrows?: boolean;
      streamText?: string;
      streamThrows?: boolean;
      voiceText?: string;
      revisedText?: string;
      sttThrows?: Error;
      getFileThrows?: Error;
      downloadThrows?: Error;
      fileSize?: number | null;
      backgroundTasks?: Array<() => Promise<unknown>>;
      synthesizeContentType?: string;
      synthesizeAudio?: Blob;
      synthesizeThrows?: Error;
      sendAudioThrows?: Error;
    } = {},
  ) {
    let insertIndex = 0;
    let updateIndex = 0;
    const updateCalls: unknown[] = [];
    const insertCalls: unknown[] = [];
    const events: string[] = [];
    const supabaseAdmin = {
      from: vi.fn((table: string) => {
        if (table === "chat_threads") {
          const query = {
            select: vi.fn(() => query),
            eq: vi.fn(() => query),
            limit: vi.fn(() => query),
            then: (resolve: (value: unknown) => unknown) =>
              resolve({
                data: [{ id: "thread" }],
                error: null,
              }),
          };
          return query;
        }
        if (table !== "telegram_channel_updates") throw new Error(`unexpected table ${table}`);
        return {
          insert: vi.fn(async (payload: unknown) => {
            insertCalls.push(payload);
            events.push("claim");
            return { error: input.insertErrors?.[insertIndex++] ?? null };
          }),
          update: vi.fn((fields: Record<string, unknown>) => {
            updateCalls.push(fields);
            if ("user_message_id" in fields) events.push("bind_user");
            if ("assistant_message_id" in fields) events.push("bind_assistant");
            if (fields.status === "responded") events.push("mark_responded");
            return {
              eq: vi.fn(async () => ({ error: input.updateErrors?.[updateIndex++] ?? null })),
            };
          }),
        };
      }),
    };
    vi.doMock("@/integrations/supabase/client.server", () => ({ supabaseAdmin }));

    const sendTelegramMessage = vi.fn(async () => {
      events.push("send_text");
      if (input.sendThrows) throw Object.assign(new Error("send_failed"), { code: "send_failed" });
      return 99;
    });
    const getTelegramFile = vi.fn(async () => {
      events.push("get_file");
      if (input.getFileThrows) throw input.getFileThrows;
      return { filePath: "voice/file.oga", fileSize: input.fileSize ?? 123 };
    });
    const downloadTelegramFile = vi.fn(async () => {
      events.push("download");
      if (input.downloadThrows) throw input.downloadThrows;
      return new Blob([new Uint8Array([1])], { type: "audio/ogg" });
    });
    const sendTelegramAudio = vi.fn(async () => {
      if (input.sendAudioThrows) throw input.sendAudioThrows;
      return 199;
    });
    vi.doMock("@/server/telegram/client", () => ({
      getTelegramFile,
      downloadTelegramFile,
      sendTelegramAudio,
      sendTelegramMessage,
      splitTelegramText: (text: string) => (text ? [text] : []),
    }));

    const inspectKallistisTurn = vi.fn(async () => {
      events.push("inspect");
      if (input.inspectThrows) throw input.inspectThrows;
      return input.inspection ?? { kind: "ready", latestUserText: "oi" };
    });
    const prepareKallistisTurn = vi.fn(async () => {
      events.push("prepare");
      if (input.prepareThrows) throw input.prepareThrows;
      return {
        model: "model",
        system: "system",
        modelMessages: [],
        derivedFrom: ["u1"],
        safeMessages: [],
      };
    });
    const persistKallistisAssistant = vi.fn(async () => {
      events.push("persist_assistant");
      if (input.persistThrows) throw input.persistThrows;
      return "resposta persistida";
    });
    vi.doMock("@/server/chat/kallistis-chat-runtime", () => ({
      KallistisChatError: class KallistisChatError extends Error {},
      inspectKallistisTurn,
      prepareKallistisTurn,
      persistKallistisAssistant,
    }));

    const createOpenRouterProvider = vi.fn(() => vi.fn(() => "gateway-model"));
    vi.doMock("@/lib/openrouter.server", () => ({
      chatProviderTimeoutMs: () => 1000,
      createOpenRouterProvider,
      providerFailureMessage: () => "provider_failed",
      providerFailureStatus: () => 502,
    }));
    const distributedChatRateLimit = vi.fn(async () => {
      events.push("rate_limit");
      if (input.rateLimitThrows) throw new Error("rate_limit_down");
      return input.rateLimit ?? null;
    });
    vi.doMock("@/lib/rate-limit", () => ({
      distributedChatRateLimit,
      requestIdFor: () => "req-telegram",
    }));
    const streamText = vi.fn(() => {
      events.push("provider");
      return {
        textStream: (async function* () {
          if (input.streamThrows)
            throw Object.assign(new Error("provider_failed"), { code: "provider_failed" });
          yield input.streamText ?? "resposta";
        })(),
      };
    });
    vi.doMock("ai", () => ({ streamText }));

    const transcribeAudioBlob = vi.fn(async () => {
      events.push("stt");
      if (input.sttThrows) throw input.sttThrows;
      return { text: input.voiceText ?? "texto falado", model: "stt" };
    });
    const revisarTranscricaoTexto = vi.fn(
      async () => input.revisedText ?? input.voiceText ?? "texto revisado",
    );
    vi.doMock("@/lib/transcribe.server", () => ({
      isAllowedAudioType: (mediaType: string) =>
        [
          "audio/ogg",
          "audio/mpeg",
          "audio/wav",
          "audio/webm",
          "audio/mp4",
          "audio/m4a",
          "audio/x-m4a",
        ].includes(mediaType),
      transcribeAudioBlob,
      revisarTranscricaoTexto,
    }));
    const synthesizeSpeech = vi.fn(async () => {
      if (input.synthesizeThrows) throw input.synthesizeThrows;
      const type = input.synthesizeContentType ?? "audio/mpeg";
      return {
        audio: input.synthesizeAudio ?? new Blob([new Uint8Array([1])], { type }),
        contentType: type,
        model: "tts-model",
        voice: "tts-voice",
        fallbackUsed: false,
        fallbackReason: null,
        spokenText: "fala",
      };
    });
    vi.doMock("@/lib/tts.server", () => ({ synthesizeSpeech }));
    const runInBackground = vi.fn((_request: Request, task: () => Promise<unknown>) => {
      events.push("background");
      input.backgroundTasks?.push(task);
    });
    vi.doMock("@/lib/background-task", () => ({ runInBackground }));

    const mod = await import("./telegram");
    return {
      handleTelegramRoute: mod.handleTelegramRoute,
      createOpenRouterProvider,
      distributedChatRateLimit,
      inspectKallistisTurn,
      prepareKallistisTurn,
      persistKallistisAssistant,
      downloadTelegramFile,
      getTelegramFile,
      revisarTranscricaoTexto,
      runInBackground,
      sendTelegramAudio,
      sendTelegramMessage,
      streamText,
      synthesizeSpeech,
      transcribeAudioBlob,
      supabaseAdmin,
      updateCalls,
      insertCalls,
      events,
    };
  }

  it("GET é health sem configuração sensível", async () => {
    const { handleTelegramRoute } = await setup();
    const response = await handleTelegramRoute(
      new Request("https://example.test/api/channels/telegram", { method: "GET" }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, channel: "telegram" });
  });

  it("secret ausente é falha permanente e responde 200 sem processar", async () => {
    const { handleTelegramRoute } = await setup();
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("secret errado retorna 401", async () => {
    const { handleTelegramRoute } = await setup();
    const response = await handleTelegramRoute(telegramRequest(update(), "wrong"));
    expect(response.status).toBe(401);
  });

  it("JSON inválido retorna 400", async () => {
    const { handleTelegramRoute } = await setup();
    const response = await handleTelegramRoute(
      new Request("https://example.test/api/channels/telegram", {
        method: "POST",
        headers: { "X-Telegram-Bot-Api-Secret-Token": "secret" },
        body: "{",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("allowlist ausente é falha permanente e responde 200 sem processar", async () => {
    const { handleTelegramRoute } = await setup();
    delete process.env.TELEGRAM_ALLOWED_USER_IDS;
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("configuração fixa ausente é claimed e marcada failed antes do 200", async () => {
    const { handleTelegramRoute, insertCalls, updateCalls, createOpenRouterProvider } =
      await setup();
    delete process.env.TELEGRAM_BOT_TOKEN;
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(insertCalls).toHaveLength(1);
    expect(updateCalls).toContainEqual(
      expect.objectContaining({ status: "failed", error_code: "telegram_not_configured" }),
    );
    expect(createOpenRouterProvider).not.toHaveBeenCalled();
  });

  it("usuário fora da allowlist é ignorado", async () => {
    const { handleTelegramRoute } = await setup();
    process.env.TELEGRAM_ALLOWED_USER_IDS = "3";
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ignored: true });
  });

  it("claim normal começa sem IDs de mensagens", async () => {
    const { handleTelegramRoute, insertCalls } = await setup();
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(insertCalls[0]).toMatchObject({
      user_message_id: null,
      assistant_message_id: null,
      status: "processing",
    });
  });

  it("/start passa por claim e não chama provider", async () => {
    const { handleTelegramRoute, sendTelegramMessage, createOpenRouterProvider, updateCalls } =
      await setup();
    const response = await handleTelegramRoute(telegramRequest(update("/start")));
    expect(response.status).toBe(200);
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(createOpenRouterProvider).not.toHaveBeenCalled();
    expect(updateCalls.at(-1)).toMatchObject({
      status: "responded",
      telegram_response_message_id: 99,
    });
  });

  it("/start duplicado envia apenas uma vez", async () => {
    const { handleTelegramRoute, sendTelegramMessage } = await setup({
      insertErrors: [null, { code: "23505" }],
    });
    await handleTelegramRoute(telegramRequest(update("/start", 1)));
    const second = await handleTelegramRoute(telegramRequest(update("/start", 1)));
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    await expect(second.json()).resolves.toMatchObject({ duplicate: true });
  });

  it("mark responded falha em comando sem reenviar", async () => {
    const { handleTelegramRoute, sendTelegramMessage } = await setup({
      updateErrors: [{ code: "x" }, null],
    });
    const response = await handleTelegramRoute(telegramRequest(update("/help")));
    expect(response.status).toBe(200);
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  });

  it("rate limit 429 envia aviso, marca failed e não chama provider", async () => {
    const { handleTelegramRoute, createOpenRouterProvider, sendTelegramMessage, updateCalls } =
      await setup({
        rateLimit: Response.json({ error: "rate_limited" }, { status: 429 }),
      });
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(createOpenRouterProvider).not.toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Limite") }),
    );
    expect(updateCalls.at(-1)).toMatchObject({ status: "failed", error_code: "rate_limited" });
  });

  it("rate limit 503 envia SAFE_ERROR e marca unavailable", async () => {
    const { handleTelegramRoute, createOpenRouterProvider, sendTelegramMessage, updateCalls } =
      await setup({
        rateLimit: Response.json({ error: "down" }, { status: 503 }),
      });
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(createOpenRouterProvider).not.toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Não consegui") }),
    );
    expect(updateCalls.at(-1)).toMatchObject({
      status: "failed",
      error_code: "rate_limit_unavailable",
    });
  });

  it("rate limit com send falhando ainda retorna 200", async () => {
    const { handleTelegramRoute, updateCalls } = await setup({
      rateLimit: Response.json({ error: "rate_limited" }, { status: 429 }),
      sendThrows: true,
    });
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(updateCalls.at(-1)).toMatchObject({ status: "failed", error_code: "rate_limited" });
  });

  it("rate limit com mark falhando ainda retorna 200", async () => {
    const { handleTelegramRoute } = await setup({
      rateLimit: Response.json({ error: "down" }, { status: 503 }),
      updateErrors: [{ code: "x" }],
    });
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
  });

  it("boundary envia resposta, não chama provider e mantém IDs nulos", async () => {
    const {
      handleTelegramRoute,
      prepareKallistisTurn,
      createOpenRouterProvider,
      updateCalls,
      insertCalls,
      sendTelegramMessage,
    } = await setup({
      inspection: { kind: "blocked", message: "fronteira" },
    });
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(prepareKallistisTurn).not.toHaveBeenCalled();
    expect(createOpenRouterProvider).not.toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: "fronteira" }),
    );
    expect(insertCalls[0]).toMatchObject({ user_message_id: null, assistant_message_id: null });
    expect(updateCalls).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_message_id: expect.any(String) }),
        expect.objectContaining({ assistant_message_id: expect.any(String) }),
      ]),
    );
    expect(updateCalls.at(-1)).toMatchObject({ status: "responded" });
  });

  it("boundary com falha de envio marca failed e mantém IDs nulos", async () => {
    const { handleTelegramRoute, updateCalls, insertCalls } = await setup({
      inspection: { kind: "blocked", message: "fronteira" },
      sendThrows: true,
    });
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(insertCalls[0]).toMatchObject({ user_message_id: null, assistant_message_id: null });
    expect(updateCalls).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_message_id: expect.any(String) }),
        expect.objectContaining({ assistant_message_id: expect.any(String) }),
      ]),
    );
    expect(updateCalls.at(-1)).toMatchObject({ status: "failed" });
  });

  it("message_not_persisted envia somente SAFE_ERROR e marca failed", async () => {
    const error = Object.assign(new Error("message_not_persisted"), {
      code: "message_not_persisted",
    });
    const { handleTelegramRoute, sendTelegramMessage, insertCalls, updateCalls } = await setup({
      prepareThrows: error,
    });
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Não consegui") }),
    );
    expect(insertCalls[0]).toMatchObject({ user_message_id: null, assistant_message_id: null });
    expect(updateCalls).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_message_id: expect.any(String) }),
        expect.objectContaining({ assistant_message_id: expect.any(String) }),
      ]),
    );
    expect(updateCalls.at(-1)).toMatchObject({
      status: "failed",
      error_code: "message_not_persisted",
    });
  });

  it("falha do provider mantém assistant_message_id nulo", async () => {
    const { handleTelegramRoute, insertCalls, updateCalls, sendTelegramMessage } = await setup({
      streamThrows: true,
    });
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(insertCalls[0]).toMatchObject({ user_message_id: null, assistant_message_id: null });
    expect(updateCalls).toEqual(
      expect.arrayContaining([expect.objectContaining({ user_message_id: expect.any(String) })]),
    );
    expect(updateCalls).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assistant_message_id: expect.any(String) }),
      ]),
    );
    expect(updateCalls.at(-1)).toMatchObject({ status: "failed" });
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Não consegui") }),
    );
  });

  it("erro antes da preparação mantém IDs nulos", async () => {
    const error = Object.assign(new Error("thread_not_found"), { code: "thread_not_found" });
    const { handleTelegramRoute, insertCalls, updateCalls } = await setup({ inspectThrows: error });
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(insertCalls[0]).toMatchObject({ user_message_id: null, assistant_message_id: null });
    expect(updateCalls).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_message_id: expect.any(String) }),
        expect.objectContaining({ assistant_message_id: expect.any(String) }),
      ]),
    );
    expect(updateCalls.at(-1)).toMatchObject({ status: "failed" });
  });

  it("assistant_message_not_persisted não envia conteúdo gerado", async () => {
    const error = Object.assign(new Error("assistant_message_not_persisted"), {
      code: "assistant_message_not_persisted",
    });
    const { handleTelegramRoute, sendTelegramMessage, updateCalls } = await setup({
      persistThrows: error,
    });
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Não consegui") }),
    );
    expect(updateCalls).toEqual(
      expect.arrayContaining([expect.objectContaining({ user_message_id: expect.any(String) })]),
    );
    expect(updateCalls).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assistant_message_id: expect.any(String) }),
      ]),
    );
    expect(updateCalls.at(-1)).toMatchObject({
      status: "failed",
      error_code: "assistant_message_not_persisted",
    });
  });

  it("sucesso registra IDs progressivamente antes do envio", async () => {
    const { handleTelegramRoute, insertCalls, updateCalls, events } = await setup();
    const response = await handleTelegramRoute(telegramRequest(update()));
    expect(response.status).toBe(200);
    expect(insertCalls[0]).toMatchObject({ user_message_id: null, assistant_message_id: null });
    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_message_id: expect.any(String) }),
        expect.objectContaining({ assistant_message_id: expect.any(String) }),
        expect.objectContaining({
          status: "responded",
          telegram_response_message_id: 99,
          error_code: null,
        }),
      ]),
    );
    expect(events.indexOf("claim")).toBeLessThan(events.indexOf("prepare"));
    expect(events.indexOf("prepare")).toBeLessThan(events.indexOf("bind_user"));
    expect(events.indexOf("bind_user")).toBeLessThan(events.indexOf("provider"));
    expect(events.indexOf("persist_assistant")).toBeLessThan(events.indexOf("bind_assistant"));
    expect(events.indexOf("bind_assistant")).toBeLessThan(events.indexOf("send_text"));
    expect(events.indexOf("send_text")).toBeLessThan(events.indexOf("mark_responded"));
  });

  describe("voice", () => {
    it("aceita schema de voice real e campos extras, rejeita sem file_id", () => {
      expect(TelegramUpdate.safeParse(voiceUpdate()).success).toBe(true);
      expect(TelegramUpdate.safeParse(voiceUpdate({ extra: "ok" })).success).toBe(true);
      const invalid = voiceUpdate();
      delete (invalid.message.voice as Record<string, unknown>).file_id;
      expect(TelegramUpdate.safeParse(invalid).success).toBe(false);
    });

    it("texto tem precedência sobre voz e não agenda TTS", async () => {
      const { handleTelegramRoute, getTelegramFile, transcribeAudioBlob, runInBackground } =
        await setup();
      const response = await handleTelegramRoute(telegramRequest(voiceUpdate({}, 10, "texto")));
      expect(response.status).toBe(200);
      expect(getTelegramFile).not.toHaveBeenCalled();
      expect(transcribeAudioBlob).not.toHaveBeenCalled();
      expect(runInBackground).not.toHaveBeenCalled();
    });

    it("sem texto e sem voz retorna 204", async () => {
      const { handleTelegramRoute } = await setup();
      const response = await handleTelegramRoute(
        telegramRequest({
          update_id: 3,
          message: {
            message_id: 10,
            chat: { id: 2, type: "private" },
            from: { id: 2, is_bot: false },
          },
        }),
      );
      expect(response.status).toBe(204);
    });

    it("voz segue claim, download, STT, runtime, texto, responded e background em ordem", async () => {
      const tasks: Array<() => Promise<unknown>> = [];
      const {
        handleTelegramRoute,
        events,
        inspectKallistisTurn,
        prepareKallistisTurn,
        runInBackground,
      } = await setup({
        backgroundTasks: tasks,
        voiceText: "texto bruto",
        revisedText: "texto revisado",
      });
      const response = await handleTelegramRoute(telegramRequest(voiceUpdate({}, 11)));
      expect(response.status).toBe(200);
      expect(inspectKallistisTurn).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: expect.objectContaining({
            parts: [{ type: "text", text: "texto revisado" }],
          }),
        }),
      );
      expect(prepareKallistisTurn).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: expect.objectContaining({
            parts: [{ type: "text", text: "texto revisado" }],
          }),
        }),
      );
      expect(events.indexOf("claim")).toBeLessThan(events.indexOf("get_file"));
      expect(events.indexOf("claim")).toBeLessThan(events.indexOf("rate_limit"));
      expect(events.indexOf("rate_limit")).toBeLessThan(events.indexOf("get_file"));
      expect(events.indexOf("get_file")).toBeLessThan(events.indexOf("download"));
      expect(events.indexOf("download")).toBeLessThan(events.indexOf("stt"));
      expect(events.indexOf("claim")).toBeLessThan(events.indexOf("download"));
      expect(events.indexOf("claim")).toBeLessThan(events.indexOf("stt"));
      expect(events.indexOf("mark_responded")).toBeLessThan(events.indexOf("background"));
      expect(runInBackground).toHaveBeenCalledTimes(1);
    });

    it("deduplica voz antes de qualquer custo", async () => {
      const tasks: Array<() => Promise<unknown>> = [];
      const {
        handleTelegramRoute,
        getTelegramFile,
        downloadTelegramFile,
        transcribeAudioBlob,
        streamText,
        runInBackground,
      } = await setup({ insertErrors: [null, { code: "23505" }], backgroundTasks: tasks });
      await handleTelegramRoute(telegramRequest(voiceUpdate({}, 12)));
      await handleTelegramRoute(telegramRequest(voiceUpdate({}, 12)));
      expect(getTelegramFile).toHaveBeenCalledTimes(1);
      expect(downloadTelegramFile).toHaveBeenCalledTimes(1);
      expect(transcribeAudioBlob).toHaveBeenCalledTimes(1);
      expect(streamText).toHaveBeenCalledTimes(1);
      expect(runInBackground).toHaveBeenCalledTimes(1);
    });

    it.each([
      [voiceUpdate({ duration: 181 }), "telegram_voice_too_long"],
      [voiceUpdate({ file_size: 10 * 1024 * 1024 + 1 }), "telegram_voice_too_large"],
      [voiceUpdate({ mime_type: "application/pdf" }), "telegram_voice_unsupported_type"],
    ])("valida limites antes de getFile", async (payload, code) => {
      const { handleTelegramRoute, getTelegramFile, updateCalls } = await setup();
      const response = await handleTelegramRoute(telegramRequest(payload));
      expect(response.status).toBe(200);
      expect(getTelegramFile).not.toHaveBeenCalled();
      expect(updateCalls.at(-1)).toMatchObject({ status: "failed", error_code: code });
    });

    it("falha quando getFile indica tamanho excessivo", async () => {
      const { handleTelegramRoute, downloadTelegramFile, updateCalls } = await setup({
        fileSize: 10 * 1024 * 1024 + 1,
      });
      await handleTelegramRoute(telegramRequest(voiceUpdate({}, 13)));
      expect(downloadTelegramFile).not.toHaveBeenCalled();
      expect(updateCalls.at(-1)).toMatchObject({ error_code: "telegram_voice_too_large" });
    });

    it.each([
      [
        Object.assign(new Error("too large"), { code: "telegram_file_too_large" }),
        "telegram_voice_too_large",
      ],
      [
        Object.assign(new Error("timeout"), { code: "telegram_get_file_timeout" }),
        "telegram_get_file_timeout",
      ],
      [
        Object.assign(new Error("500"), { code: "telegram_get_file_http_500" }),
        "telegram_get_file_http_500",
      ],
      [
        Object.assign(new Error("timeout"), { code: "telegram_file_download_timeout" }),
        "telegram_file_download_timeout",
      ],
      [
        Object.assign(new Error("404"), { code: "telegram_file_download_http_404" }),
        "telegram_file_download_http_404",
      ],
      [Object.assign(new Error("empty"), { code: "telegram_file_empty" }), "telegram_file_empty"],
    ])("preserva erro Telegram %s", async (error, code) => {
      const field = (error as { code: string }).code.startsWith("telegram_get_file_")
        ? "getFileThrows"
        : "downloadThrows";
      const { handleTelegramRoute, updateCalls } = await setup({ [field]: error } as never);
      await handleTelegramRoute(telegramRequest(voiceUpdate({}, 14)));
      expect(updateCalls.at(-1)).toMatchObject({ error_code: code });
    });

    it.each([
      [
        Object.assign(new Error("timeout"), { name: "TranscriptionTimeoutError" }),
        "telegram_voice_transcription_timeout",
      ],
      [
        Object.assign(new Error("config"), { name: "TranscriptionNotConfiguredError" }),
        "telegram_voice_transcription_not_configured",
      ],
      [
        Object.assign(new Error("upstream"), { name: "TranscriptionUpstreamError" }),
        "telegram_voice_transcription_failed",
      ],
    ])("mapeia erro STT", async (error, code) => {
      const { handleTelegramRoute, updateCalls } = await setup({ sttThrows: error });
      await handleTelegramRoute(telegramRequest(voiceUpdate({}, 15)));
      expect(updateCalls.at(-1)).toMatchObject({ error_code: code });
    });

    it("transcrição vazia e longa não chamam provider", async () => {
      const empty = await setup({ voiceText: "", revisedText: "" });
      await empty.handleTelegramRoute(telegramRequest(voiceUpdate({}, 16)));
      expect(empty.streamText).not.toHaveBeenCalled();
      expect(empty.updateCalls.at(-1)).toMatchObject({
        error_code: "telegram_voice_empty_transcript",
      });
      vi.resetModules();
      const long = await setup({ voiceText: "a", revisedText: "a".repeat(4097) });
      await long.handleTelegramRoute(telegramRequest(voiceUpdate({}, 17)));
      expect(long.streamText).not.toHaveBeenCalled();
      expect(long.updateCalls.at(-1)).toMatchObject({
        error_code: "telegram_voice_transcript_too_long",
      });
    });

    it("não agenda TTS quando mark responded falha", async () => {
      const { handleTelegramRoute, runInBackground } = await setup({
        updateErrors: [null, null, { code: "db_down" }],
      });
      const response = await handleTelegramRoute(telegramRequest(voiceUpdate({}, 18)));
      expect(response.status).toBe(200);
      expect(runInBackground).not.toHaveBeenCalled();
    });

    it("task TTS envia só MP3 e é best-effort", async () => {
      const tasks: Array<() => Promise<unknown>> = [];
      const ok = await setup({ backgroundTasks: tasks });
      await ok.handleTelegramRoute(telegramRequest(voiceUpdate({}, 19)));
      await tasks[0]();
      expect(ok.sendTelegramAudio).toHaveBeenCalledTimes(1);

      vi.resetModules();
      const wavTasks: Array<() => Promise<unknown>> = [];
      const wav = await setup({ backgroundTasks: wavTasks, synthesizeContentType: "audio/wav" });
      await wav.handleTelegramRoute(telegramRequest(voiceUpdate({}, 20)));
      await expect(wavTasks[0]()).resolves.toBeUndefined();
      expect(wav.sendTelegramAudio).not.toHaveBeenCalled();

      vi.resetModules();
      const failTasks: Array<() => Promise<unknown>> = [];
      const fail = await setup({ backgroundTasks: failTasks, synthesizeThrows: new Error("tts") });
      await fail.handleTelegramRoute(telegramRequest(voiceUpdate({}, 21)));
      await expect(failTasks[0]()).resolves.toBeUndefined();
      expect(
        fail.updateCalls.filter((x) => (x as { status?: string }).status).at(-1),
      ).toMatchObject({ status: "responded" });
    });

    it("uses audio/ogg when mime_type is absent", async () => {
      const payload = voiceUpdate({}, 22);
      delete (payload.message.voice as Record<string, unknown>).mime_type;
      const context = await setup();
      const response = await context.handleTelegramRoute(telegramRequest(payload));
      expect(response.status).toBe(200);
      expect(context.downloadTelegramFile).toHaveBeenCalledWith(
        expect.objectContaining({ mediaType: "audio/ogg" }),
      );
      expect(context.transcribeAudioBlob).toHaveBeenCalledWith(expect.any(Blob), "audio/ogg");
      expect(context.streamText).toHaveBeenCalled();
      expect(context.sendTelegramMessage).toHaveBeenCalled();
    });

    it("ignores sendAudio failure without updating the turn", async () => {
      const tasks: Array<() => Promise<unknown>> = [];
      const context = await setup({
        backgroundTasks: tasks,
        sendAudioThrows: Object.assign(new Error("telegram_audio_send_failed"), {
          code: "telegram_audio_send_failed",
        }),
      });
      await context.handleTelegramRoute(telegramRequest(voiceUpdate({}, 23)));
      const updatesBeforeTask = context.updateCalls.length;
      await expect(tasks[0]()).resolves.toBeUndefined();
      expect(context.updateCalls).toHaveLength(updatesBeforeTask);
      expect(
        context.updateCalls.filter((call) => (call as { status?: string }).status).at(-1),
      ).toMatchObject({ status: "responded" });
    });

    it("ignores an empty TTS Blob without updating the turn", async () => {
      const tasks: Array<() => Promise<unknown>> = [];
      const context = await setup({
        backgroundTasks: tasks,
        synthesizeAudio: new Blob([], { type: "audio/mpeg" }),
      });
      await context.handleTelegramRoute(telegramRequest(voiceUpdate({}, 24)));
      const updatesBeforeTask = context.updateCalls.length;
      await expect(tasks[0]()).resolves.toBeUndefined();
      expect(context.sendTelegramAudio).not.toHaveBeenCalled();
      expect(context.updateCalls).toHaveLength(updatesBeforeTask);
      expect(
        context.updateCalls.filter((call) => (call as { status?: string }).status).at(-1),
      ).toMatchObject({ status: "responded" });
    });

    it("ignores an oversized TTS Blob without updating the turn", async () => {
      const tasks: Array<() => Promise<unknown>> = [];
      const context = await setup({
        backgroundTasks: tasks,
        synthesizeAudio: new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], {
          type: "audio/mpeg",
        }),
      });
      await context.handleTelegramRoute(telegramRequest(voiceUpdate({}, 25)));
      const updatesBeforeTask = context.updateCalls.length;
      await expect(tasks[0]()).resolves.toBeUndefined();
      expect(context.sendTelegramAudio).not.toHaveBeenCalled();
      expect(context.updateCalls).toHaveLength(updatesBeforeTask);
      expect(
        context.updateCalls.filter((call) => (call as { status?: string }).status).at(-1),
      ).toMatchObject({ status: "responded" });
    });
  });
});
