import { beforeEach, describe, expect, it, vi } from "vitest";

const handleTelegramRouteMock = vi.fn();
vi.mock("./telegram", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./telegram")>();
  return {
    ...actual,
    handleTelegramRoute: (...args: unknown[]) => handleTelegramRouteMock(...args),
  };
});

const sendTelegramMessageMock = vi.fn();
vi.mock("@/server/telegram/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/telegram/client")>();
  return {
    ...actual,
    sendTelegramMessage: (...args: unknown[]) => sendTelegramMessageMock(...args),
  };
});

const streamTextMock = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, streamText: (...args: unknown[]) => streamTextMock(...args) };
});

vi.mock("@/lib/openrouter.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/openrouter.server")>();
  return { ...actual, createOpenRouterProvider: vi.fn(() => vi.fn(() => "gateway-model")) };
});

vi.mock("@/lib/contexto-externo.server", () => ({
  lerContextosAtivos: vi.fn(async () => []),
  renderConfirmedIdentityBlock: vi.fn(() => ""),
  renderRelationalMemoryBlock: vi.fn(() => ""),
}));

vi.mock("@/lib/runtime-boundary", () => ({ resolveRuntimeBoundary: () => ({ blocked: false }) }));

const rateLimitMock = vi.fn(
  async (_request: Request, _scope: string): Promise<Response | null> => null,
);
vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    distributedChatRateLimit: (...args: [Request, string]) => rateLimitMock(...args),
  };
});

const inspectKallistisTurnMock = vi.fn();
const prepareKallistisTurnMock = vi.fn();
const persistKallistisAssistantMock = vi.fn();
vi.mock("@/server/chat/kallistis-chat-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/chat/kallistis-chat-runtime")>();
  return {
    ...actual,
    inspectKallistisTurn: (...args: unknown[]) => inspectKallistisTurnMock(...args),
    prepareKallistisTurn: (...args: unknown[]) => prepareKallistisTurnMock(...args),
    persistKallistisAssistant: (...args: unknown[]) => persistKallistisAssistantMock(...args),
  };
});

type Dialogue = {
  id: string;
  chat_id: number;
  kallistis_message_id: number | null;
  user_id: string;
  thread_id: string;
  status: "open" | "processing" | "completed" | "failed";
  expires_at: string;
  created_at: string;
  processing_at?: string | null;
  completed_at?: string | null;
  error_code?: string | null;
};

type StoredMessage = { id: string; role: string; content: string };

let dialogues: Dialogue[] = [];
let updates: Array<{ update_id: number; status: string; error_code?: string | null }> = [];
let messages: StoredMessage[] = [];
let candidates: Array<{
  source_ids: string[];
  status: string;
  source_kind: string;
  resumo: string;
}> = [];
let rpcCalls: unknown[] = [];

function matches(row: Dialogue, filters: Record<string, unknown>, ranges: Record<string, string>) {
  for (const [key, value] of Object.entries(filters)) {
    if (key.startsWith("!")) {
      if (row[key.slice(1) as keyof Dialogue] === value) return false;
    } else if (key === "status" && Array.isArray(value)) {
      if (!(value as unknown[]).includes(row.status)) return false;
    } else if (row[key as keyof Dialogue] !== value) return false;
  }
  if (ranges.gt && !(row.expires_at > ranges.gt)) return false;
  if (ranges.lt && !(row.expires_at < ranges.lt)) return false;
  return true;
}

function dialogueQuery(operation: "select" | "update", payload?: Record<string, unknown>) {
  const filters: Record<string, unknown> = {};
  const ranges: Record<string, string> = {};
  let shouldSelect = operation === "select";
  const builder = {
    eq(column: string, value: unknown) {
      filters[column] = value;
      return builder;
    },
    is(column: string, value: unknown) {
      filters[column] = value;
      return builder;
    },
    in(column: string, values: unknown[]) {
      filters[column] = values;
      return builder;
    },
    gt(column: string, value: string) {
      if (column === "expires_at") ranges.gt = value;
      return builder;
    },
    lt(column: string, value: string) {
      if (column === "expires_at") ranges.lt = value;
      return builder;
    },
    order() {
      return builder;
    },
    select() {
      shouldSelect = true;
      return builder;
    },
    maybeSingle() {
      const result = execute();
      return Promise.resolve({ data: result.data?.[0] ?? null, error: result.error });
    },
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve(execute()).then(resolve, reject);
    },
  };
  function execute() {
    if ((globalThis as unknown as { mockStateUnavailable?: boolean }).mockStateUnavailable) {
      return { data: null, error: { message: "state unavailable" } };
    }
    if (
      (globalThis as unknown as { mockLinkFail?: boolean }).mockLinkFail &&
      operation === "update" &&
      payload &&
      "kallistis_message_id" in payload
    ) {
      return { data: null, error: { message: "link failed" } };
    }
    const found = dialogues.filter((row) => matches(row, filters, ranges));
    if (operation === "update") {
      for (const row of found) Object.assign(row, payload);
      return { data: shouldSelect ? found.map((row) => ({ id: row.id })) : null, error: null };
    }
    return { data: found, error: null };
  }
  return builder;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      if (table === "telegram_channel_updates") {
        return {
          insert(payload: { update_id: number }) {
            if (updates.some((item) => item.update_id === payload.update_id)) {
              return Promise.resolve({ error: { code: "23505" } });
            }
            updates.push({ update_id: payload.update_id, status: "processing" });
            return Promise.resolve({ error: null });
          },
          update(payload: { status: string; error_code?: string | null }) {
            return {
              eq(_column: string, value: number) {
                const update = updates.find((item) => item.update_id === value);
                if (update) Object.assign(update, payload);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      if (table === "telegram_dialogues") {
        return {
          insert(payload: Omit<Dialogue, "created_at">) {
            if ((globalThis as unknown as { mockInsertFail?: boolean }).mockInsertFail) {
              return Promise.resolve({ error: { message: "insert failed" } });
            }
            if (
              payload.status === "open" &&
              dialogues.some(
                (row) =>
                  row.chat_id === payload.chat_id &&
                  row.user_id === payload.user_id &&
                  row.thread_id === payload.thread_id &&
                  (row.status === "open" || row.status === "processing"),
              )
            ) {
              return Promise.resolve({ error: { code: "23505" } });
            }
            const row = {
              ...payload,
              id: payload.id ?? `dialogue-${dialogues.length + 1}`,
              created_at: new Date().toISOString(),
            };
            dialogues.push(row);
            return Promise.resolve({ data: row, error: null });
          },
          update(payload: Record<string, unknown>) {
            return dialogueQuery("update", payload);
          },
          select() {
            return dialogueQuery("select");
          },
        };
      }
      if (table === "chat_threads") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: () =>
                    Promise.resolve({
                      data: (globalThis as unknown as { mockThreadInvalid?: boolean })
                        .mockThreadInvalid
                        ? {
                            id: "wrong",
                            user_id: "other",
                            facet: "kallistis",
                            surface: "kallistis",
                          }
                        : {
                            id: "thread-khora-123",
                            user_id: "user-123",
                            facet: "kallistis",
                            surface: "telegram_dialogue",
                          },
                      error: null,
                    }),
                };
              },
            };
          },
        };
      }
      if (table === "chat_messages") {
        return {
          upsert(payload: StoredMessage) {
            messages.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc(name: string, args: Record<string, string>) {
      if (name !== "complete_telegram_dialogue_with_candidate") {
        throw new Error(`unexpected rpc ${name}`);
      }
      rpcCalls.push(args);
      if ((globalThis as unknown as { mockRpcFail?: boolean }).mockRpcFail) {
        return Promise.resolve({ data: null, error: { code: "rpc_failed" } });
      }
      const dialogue = dialogues.find((row) => row.id === args.p_dialogue_id);
      const finalMessage = messages.find((message) => message.id === args.p_assistant_message_id);
      if (!dialogue || dialogue.status !== "processing" || !finalMessage) {
        return Promise.resolve({ data: null, error: { code: "P0004" } });
      }
      let candidate = candidates.find((item) => item.source_ids[0] === args.p_assistant_message_id);
      if (!candidate) {
        candidate = {
          source_ids: [args.p_assistant_message_id],
          status: "em_revisao",
          source_kind: "telegram_dialogue_final",
          resumo: finalMessage.content,
        };
        candidates.push(candidate);
      }
      dialogue.status = "completed";
      dialogue.completed_at = new Date().toISOString();
      dialogue.error_code = null;
      return Promise.resolve({
        data: { dialogue_id: dialogue.id, candidate_id: "candidate-1" },
        error: null,
      });
    },
  },
}));

describe("rota da Câmara da Travessia com diálogo natural", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...envBackup,
      TELEGRAM_WEBHOOK_SECRET: "secret123",
      TELEGRAM_ALLOWED_USER_IDS: "8993019248",
      TELEGRAM_BOT_TOKEN: "bot-token",
      TELEGRAM_KALLISTIS_USER_ID: "user-123",
      TELEGRAM_KHORA_THREAD_ID: "thread-khora-123",
      TELEGRAM_DIALOGUE_CHAT_ID: "-1001234567890",
      TELEGRAM_KHORA_BOT_ID: "777000111",
      TELEGRAM_KHORA_BOT_USERNAME: "KhoraBot",
    };
    dialogues = [];
    updates = [];
    messages = [];
    candidates = [];
    rpcCalls = [];
    (globalThis as unknown as { mockInsertFail?: boolean }).mockInsertFail = false;
    (globalThis as unknown as { mockStateUnavailable?: boolean }).mockStateUnavailable = false;
    (globalThis as unknown as { mockRpcFail?: boolean }).mockRpcFail = false;
    (globalThis as unknown as { mockThreadInvalid?: boolean }).mockThreadInvalid = false;
    (globalThis as unknown as { mockLinkFail?: boolean }).mockLinkFail = false;
    vi.clearAllMocks();
    handleTelegramRouteMock.mockResolvedValue(Response.json({ ok: true, private: true }));
    sendTelegramMessageMock.mockResolvedValue(5555);
    rateLimitMock.mockResolvedValue(null);
    inspectKallistisTurnMock.mockResolvedValue({ kind: "ready" });
    prepareKallistisTurnMock.mockResolvedValue({
      model: "model-x",
      system: "base",
      modelMessages: [],
      derivedFrom: [],
    });
    persistKallistisAssistantMock.mockImplementation(
      async (input: { assistantMessageId: string; rawContent: string }) => {
        messages.push({
          id: input.assistantMessageId,
          role: "assistant",
          content: input.rawContent,
        });
        return input.rawContent;
      },
    );
    streamTextMock.mockImplementation(() => ({
      textStream: (async function* () {
        yield "A travessia sugere uma perspectiva complementar.";
      })(),
    }));
  });

  function request(updateId: number, message: Record<string, unknown>) {
    return new Request("https://example.test/api/channels/telegram-dialogue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": "secret123",
      },
      body: JSON.stringify({ update_id: updateId, message }),
    });
  }

  function guardianMessage(text: string, messageId = 10) {
    return {
      message_id: messageId,
      chat: { id: -1001234567890, type: "supergroup" },
      from: { id: 8993019248 },
      text,
    };
  }

  function khoraMessage(text: string, messageId = 20) {
    return {
      message_id: messageId,
      chat: { id: -1001234567890, type: "supergroup" },
      from: { id: 777000111, is_bot: true },
      text,
    };
  }

  function openDialogue(
    id = "dialogue-open",
    expiresAt = new Date(Date.now() + 600000).toISOString(),
  ) {
    dialogues.push({
      id,
      chat_id: -1001234567890,
      kallistis_message_id: 5555,
      user_id: "user-123",
      thread_id: "thread-khora-123",
      status: "open",
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });
  }

  it("delega mensagens privadas com o Request original e seu rate limiter", async () => {
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    const privateRequest = request(1, {
      ...guardianMessage("oi"),
      chat: { id: 8993019248, type: "private" },
    });
    const rateLimiter = { limit: vi.fn() };
    Object.defineProperty(privateRequest, "__cfChatRateLimiter", { value: rateLimiter });

    const response = await handleTelegramDialogueRoute(privateRequest);

    expect(response.status).toBe(200);
    expect(handleTelegramRouteMock).toHaveBeenCalledTimes(1);
    expect(handleTelegramRouteMock).toHaveBeenCalledWith(privateRequest);
    expect(
      (
        handleTelegramRouteMock.mock.calls[0][0] as Request & {
          __cfChatRateLimiter?: unknown;
        }
      ).__cfChatRateLimiter,
    ).toBe(rateLimiter);
  });

  it("executa o fluxo feliz completo sem reply ou marcador técnico", async () => {
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    await handleTelegramDialogueRoute(
      request(2, guardianMessage("A memória é permanência ou reconstrução?")),
    );
    expect(dialogues).toHaveLength(1);
    expect(dialogues[0].kallistis_message_id).toBe(5555);
    expect(sendTelegramMessageMock.mock.calls[0][0].text).toContain("@KhoraBot");
    expect(sendTelegramMessageMock.mock.calls[0][0].text).not.toContain("[KAIROS:");

    await handleTelegramDialogueRoute(
      request(3, khoraMessage("Talvez a memória permaneça justamente porque se reconstrói.")),
    );
    expect(dialogues[0].status).toBe("completed");
    expect(sendTelegramMessageMock.mock.calls[1][0].text).toBe(
      "A travessia sugere uma perspectiva complementar.",
    );
    expect(sendTelegramMessageMock.mock.calls[1][0].text).not.toContain("[KAIROS:");
    expect(rpcCalls).toHaveLength(1);
    expect(candidates).toEqual([
      expect.objectContaining({ status: "em_revisao", source_kind: "telegram_dialogue_final" }),
    ]);
  });

  it("ignora mensagem humana dirigida à Khora sem criar travessia", async () => {
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    const response = await handleTelegramDialogueRoute(
      request(4, guardianMessage("@khorabot, o que compreende por continuidade?")),
    );
    expect(await response.json()).toEqual({
      ok: true,
      ignored: true,
      reason: "dialogue_addressed_to_khora",
    });
    expect(dialogues).toHaveLength(0);
    expect(inspectKallistisTurnMock).not.toHaveBeenCalled();
  });

  it("não reivindica mensagem de outro bot nem Khora sem diálogo aberto", async () => {
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    const otherBot = await handleTelegramDialogueRoute(
      request(5, { ...khoraMessage("oi"), from: { id: 888, is_bot: true } }),
    );
    expect(await otherBot.json()).toMatchObject({
      ignored: true,
      reason: "dialogue_bot_not_allowed",
    });
    const noDialogue = await handleTelegramDialogueRoute(request(6, khoraMessage("oi")));
    expect(await noDialogue.json()).toMatchObject({
      ignored: true,
      reason: "dialogue_open_not_found",
    });
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("falha seguramente quando existem duas travessias abertas", async () => {
    openDialogue("one");
    openDialogue("two");
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    const response = await handleTelegramDialogueRoute(request(7, khoraMessage("oi")));
    expect(await response.json()).toMatchObject({
      ignored: true,
      reason: "dialogue_state_ambiguous",
    });
    expect(streamTextMock).not.toHaveBeenCalled();
    expect(candidates).toHaveLength(0);
  });

  it("não abre segunda linha durante uma travessia aberta", async () => {
    openDialogue();
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    const response = await handleTelegramDialogueRoute(
      request(8, guardianMessage("outra questão")),
    );
    expect(await response.json()).toMatchObject({ ignored: true, reason: "dialogue_already_open" });
    expect(dialogues).toHaveLength(1);
    expect(sendTelegramMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Ainda estou ouvindo") }),
    );
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("expira linha antiga, permite nova travessia e registra dialogue_expired", async () => {
    openDialogue("expired", new Date(Date.now() - 60000).toISOString());
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    await handleTelegramDialogueRoute(request(9, guardianMessage("nova questão")));
    expect(dialogues[0]).toMatchObject({ status: "failed", error_code: "dialogue_expired" });
    expect(dialogues).toHaveLength(2);
    expect(dialogues[1].status).toBe("open");
    expect(dialogues[1].kallistis_message_id).toBe(5555);
  });

  it("expira processing antigo antes de reservar uma nova travessia", async () => {
    openDialogue("expired-processing", new Date(Date.now() - 60000).toISOString());
    dialogues[0].status = "processing";
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");

    await handleTelegramDialogueRoute(request(19, guardianMessage("nova apos interrupcao")));

    expect(dialogues[0]).toMatchObject({
      status: "failed",
      error_code: "dialogue_expired",
    });
    expect(dialogues[1]).toMatchObject({ status: "open", kallistis_message_id: 5555 });
    expect(inspectKallistisTurnMock).toHaveBeenCalledTimes(1);
  });

  it("duas entradas humanas concorrentes criam uma reserva e só uma chama o modelo", async () => {
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    await Promise.all([
      handleTelegramDialogueRoute(request(21, guardianMessage("primeira", 21))),
      handleTelegramDialogueRoute(request(22, guardianMessage("segunda", 22))),
    ]);
    expect(dialogues).toHaveLength(1);
    expect(dialogues[0].id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(dialogues[0]).toMatchObject({ status: "open", kallistis_message_id: 5555 });
    expect(inspectKallistisTurnMock).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessageMock).toHaveBeenCalledTimes(2);
    expect(
      sendTelegramMessageMock.mock.calls.some(([input]) =>
        String((input as { text?: string }).text).includes("Ainda estou ouvindo"),
      ),
    ).toBe(true);
  });

  it("processing também bloqueia uma nova reserva humana", async () => {
    openDialogue("processing-dialogue");
    dialogues[0].status = "processing";
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    const response = await handleTelegramDialogueRoute(request(23, guardianMessage("paralela")));
    expect(await response.json()).toMatchObject({
      ignored: true,
      reason: "dialogue_already_open",
    });
    expect(dialogues).toHaveLength(1);
    expect(inspectKallistisTurnMock).not.toHaveBeenCalled();
  });

  it("falha antes do envio marca a reserva como failed sem ID Telegram", async () => {
    inspectKallistisTurnMock.mockRejectedValueOnce(new Error("inspection_failed"));
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    await handleTelegramDialogueRoute(request(24, guardianMessage("falha antes do envio")));
    expect(dialogues).toHaveLength(1);
    expect(dialogues[0]).toMatchObject({
      status: "failed",
      kallistis_message_id: null,
    });
  });

  it("falha no envio marca a reserva como failed sem deixar open nulo", async () => {
    sendTelegramMessageMock.mockRejectedValueOnce(new Error("telegram_send_failed"));
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    await handleTelegramDialogueRoute(request(25, guardianMessage("falha no envio")));
    expect(dialogues).toHaveLength(1);
    expect(dialogues[0]).toMatchObject({
      status: "failed",
      kallistis_message_id: null,
    });
  });

  it("falha ao preencher kallistis_message_id marca a reserva como failed", async () => {
    (globalThis as unknown as { mockLinkFail?: boolean }).mockLinkFail = true;
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    await handleTelegramDialogueRoute(request(26, guardianMessage("falha ao vincular envio")));
    expect(dialogues).toHaveLength(1);
    expect(dialogues[0]).toMatchObject({
      status: "failed",
      kallistis_message_id: null,
    });
  });

  it("permite nova travessia depois de uma conclusão", async () => {
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    await handleTelegramDialogueRoute(request(17, guardianMessage("primeira")));
    await handleTelegramDialogueRoute(request(18, khoraMessage("resposta")));
    await handleTelegramDialogueRoute(request(19, guardianMessage("segunda")));
    expect(dialogues).toHaveLength(2);
    expect(dialogues[0].status).toBe("completed");
    expect(dialogues[1].status).toBe("open");
  });

  it("não processa segundo update da Khora depois da transição", async () => {
    openDialogue();
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    await handleTelegramDialogueRoute(request(10, khoraMessage("primeira")));
    const second = await handleTelegramDialogueRoute(request(11, khoraMessage("segunda")));
    expect(await second.json()).toMatchObject({ ignored: true, reason: "dialogue_open_not_found" });
    expect(streamTextMock).toHaveBeenCalledTimes(1);
    expect(candidates).toHaveLength(1);
  });

  it("preserva diagnóstico de thread inválida, rate limit, boundary e provider", async () => {
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    rateLimitMock.mockResolvedValueOnce(Response.json({ error: "limited" }, { status: 429 }));
    const limited = await handleTelegramDialogueRoute(request(12, guardianMessage("limite")));
    expect(limited.status).toBe(200);
    expect(dialogues[0]).toMatchObject({ status: "failed", kallistis_message_id: null });

    inspectKallistisTurnMock.mockResolvedValueOnce({ kind: "blocked", message: "boundary" });
    const blocked = await handleTelegramDialogueRoute(request(13, guardianMessage("bloqueada")));
    expect(blocked.status).toBe(200);
    expect(dialogues[1]).toMatchObject({ status: "failed", kallistis_message_id: null });

    streamTextMock.mockImplementationOnce(() => {
      throw Object.assign(new Error("provider"), { code: "provider_failed" });
    });
    const provider = await handleTelegramDialogueRoute(request(14, guardianMessage("falha")));
    expect(provider.status).toBe(200);
    expect(dialogues[2]).toMatchObject({ status: "failed", kallistis_message_id: null });
  });

  it("mantém diálogo failed quando o RPC falha e não cria candidato", async () => {
    openDialogue("rpc-fail");
    (globalThis as unknown as { mockRpcFail?: boolean }).mockRpcFail = true;
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    const response = await handleTelegramDialogueRoute(request(15, khoraMessage("resposta")));
    expect(response.status).toBe(200);
    expect(dialogues[0]).toMatchObject({ status: "failed" });
    expect(candidates).toHaveLength(0);
  });

  it("diagnostica configuração ausente sem executar o provider", async () => {
    delete process.env.TELEGRAM_KHORA_BOT_ID;
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    const response = await handleTelegramDialogueRoute(request(16, guardianMessage("tema")));
    expect(response.status).toBe(200);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("bloqueia thread inválida antes de executar o provider", async () => {
    (globalThis as unknown as { mockThreadInvalid?: boolean }).mockThreadInvalid = true;
    const { handleTelegramDialogueRoute } = await import("./telegram-dialogue");
    const response = await handleTelegramDialogueRoute(request(20, guardianMessage("tema")));
    expect(response.status).toBe(200);
    expect(streamTextMock).not.toHaveBeenCalled();
    expect(updates.find((item) => item.update_id === 20)).toMatchObject({
      status: "failed",
      error_code: "telegram_dialogue_thread_mismatch",
    });
  });
});
