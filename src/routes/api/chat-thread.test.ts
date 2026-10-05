import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatThread } from "@/server/local-core/data-contracts";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const THREAD_ID = "22222222-2222-4222-8222-222222222222";

const state = vi.hoisted(() => ({
  authorization: { master: false, mesaMaster: false },
  thread: {
    id: "22222222-2222-4222-8222-222222222222",
    userId: "11111111-1111-4111-8111-111111111111",
    surface: "kallistis",
    facet: "kallistis",
    title: "[KALLISTIS_SCOPE:character_creation]",
    scope: "character_creation" as const,
    createdAt: "2026-09-19T00:00:00Z",
    lastSedimentadoAt: null,
    campaignId: null,
    campaignName: null,
    mesaId: null,
    activeCharacterId: "character-1",
  } as ChatThread,
  runtime: null as any,
}));

vi.mock("@/server/runtime/context", () => ({
  getRuntimeDatabaseUrl: vi.fn(() => "postgresql://test/kallistis"),
}));
vi.mock("@/lib/require-user.server", () => ({
  requireUser: vi.fn(async () => ({ userId: USER_ID })),
}));
vi.mock("@/server/local-core/chat-runtime", () => ({
  createLocalChatRuntime: vi.fn(() => state.runtime),
}));
vi.mock("@/server/local-core/csrf", () => ({ isSameOriginRequest: vi.fn(() => true) }));
vi.mock("@/server/local-core/postgres", () => ({
  createBunPostgresExecutor: vi.fn(() => ({ query: vi.fn(async () => []), close: vi.fn() })),
}));
vi.mock("@/server/local-core/player-access", () => ({
  isMaster: vi.fn(async () => state.authorization.master),
  isMasterForMesa: vi.fn(async () => state.authorization.mesaMaster),
}));

import { Route } from "./chat/thread";

const patchHandler = (Route.options as any).server.handlers.PATCH as (input: {
  request: Request;
}) => Promise<Response>;
function request(body: unknown) {
  return new Request("https://kallistis.app/api/chat/thread", {
    method: "PATCH",
    headers: { origin: "https://kallistis.app", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postRequest(query = "") {
  return new Request(`https://kallistis.app/api/chat/thread${query}`, {
    method: "POST",
    headers: { origin: "https://kallistis.app", "content-type": "application/json" },
  });
}

describe("/api/chat/thread usa ChatScope como contrato", () => {
  beforeEach(() => {
    state.authorization.master = false;
    state.authorization.mesaMaster = false;
    state.runtime = {
      chat: {
        updatePlayerExperience: vi.fn(async () => state.thread),
        findScopedThread: vi.fn(async () => null),
        createThread: vi.fn(async (thread: ChatThread) => ({
          ...state.thread,
          ...thread,
          scope: thread.title === "[KALLISTIS_SCOPE:master]" ? "master" : thread.scope,
        })),
      },
      campaigns: {
        getMasterAuthorized: vi.fn(async () => null),
      },
      characters: { get: vi.fn(async () => ({ id: "character-1", status: "draft" })) },
      close: vi.fn(),
    };
  });

  it("permite somente vincular personagem ativo sem ativar um modo", async () => {
    const response = await patchHandler({
      request: request({ threadId: THREAD_ID, activeCharacterId: "character-1" }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      thread: { scope: "character_creation", activeCharacterId: "character-1" },
    });
    expect(state.runtime.chat.updatePlayerExperience).toHaveBeenCalledWith(
      USER_ID,
      THREAD_ID,
      null,
      "character-1",
    );
  });

  it.each([
    { responseMode: "NARRADOR" },
    { responseMode: "PERSONAGEM", roleplayTargetId: "character-1" },
    { playerExperience: "CAMPAIGN" },
  ])("rejeita atualização legada de modo: %j", async (body) => {
    const response = await patchHandler({ request: request({ threadId: THREAD_ID, ...body }) });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: "unsupported_chat_mode" });
    expect(state.runtime.chat.updatePlayerExperience).not.toHaveBeenCalled();
  });

  it("nega a superfície de Mestre a jogador sem autorização server-side", async () => {
    const postHandler = (Route.options as any).server.handlers.POST as (input: {
      request: Request;
    }) => Promise<Response>;
    const response = await postHandler({ request: postRequest("?scope=master") });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "master_chat_forbidden" });
    expect(state.runtime.chat.createThread).not.toHaveBeenCalled();
  });

  it("permite a superfície de Mestre somente após autorização server-side", async () => {
    state.authorization.master = true;
    const postHandler = (Route.options as any).server.handlers.POST as (input: {
      request: Request;
    }) => Promise<Response>;
    const response = await postHandler({ request: postRequest("?scope=master") });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ thread: { scope: "master" } });
    expect(state.runtime.chat.createThread).toHaveBeenCalledWith(
      expect.objectContaining({ title: "[KALLISTIS_SCOPE:master]" }),
    );
  });
});
