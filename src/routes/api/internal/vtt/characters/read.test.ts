import { beforeEach, describe, expect, it, vi } from "vitest";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_OWNER_ID = "22222222-2222-4222-8222-222222222222";
const CHARACTER_ID = "cmu657xqwme2tl";
const SECRET = "test-only-vtt-secret";

const state = vi.hoisted(() => ({
  repo: { get: vi.fn(), save: vi.fn(), transition: vi.fn() },
  sql: { close: vi.fn() },
}));

vi.mock("@/server/runtime/context", () => ({
  getRuntimeDatabaseUrl: vi.fn(() => "postgresql://test/kallistis"),
}));
vi.mock("@/server/local-core/postgres", () => ({
  createBunPostgresExecutor: vi.fn(() => state.sql),
}));
vi.mock("@/server/characters/repository", () => ({
  createPostgresCharacterRepository: vi.fn(() => state.repo),
}));

import { Route } from "./read";

const postHandler = (Route.options as any).server.handlers.POST as (input: {
  request: Request;
}) => Promise<Response>;

function request(body: unknown, authorization = SECRET) {
  return new Request("https://kallistis.app/api/internal/vtt/characters/read", {
    method: "POST",
    headers: {
      authorization: "Bearer " + authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function character(ownerUserId = OWNER_ID) {
  return {
    id: CHARACTER_ID,
    ownerUserId,
    kallistis: {
      manifestation: "Uma forma de luz.",
      manifestacao_pessoal: "Uma forma de luz.",
      fulgor: 2,
      fulgor_current: 2,
      fulgor_max: 5,
      capabilities: [],
      capability_manifestation_descriptions: {
        "ability:guardiao-interpor": "Protege quem está próximo.",
      },
      source: "kallistis" as const,
    },
    snapshot: { segredo: "não deve sair" },
    events: [{ id: "event-1" }],
    versions: [{ version: 1 }],
    messages: [{ content: "privado" }],
    progression: [{ id: "progression-1" }],
    mechanicalFingerprint: "fingerprint",
    masterUserId: "33333333-3333-4333-8333-333333333333",
  };
}

describe("POST /api/internal/vtt/characters/read", () => {
  beforeEach(() => {
    vi.stubEnv("KALLISTIS_VTT_SERVICE_SECRET", SECRET);
    state.repo.get.mockReset();
    state.repo.save.mockReset();
    state.repo.transition.mockReset();
    state.sql.close.mockReset();
  });

  it("returns the minimal canonical projection for the owner", async () => {
    state.repo.get.mockResolvedValue(character());

    const response = await postHandler({
      request: request({ source_user_id: OWNER_ID, characterId: CHARACTER_ID }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      valid: true,
      character: {
        id: CHARACTER_ID,
        kallistis: {
          manifestacao_pessoal: "Uma forma de luz.",
          fulgor_current: 2,
          capability_manifestation_descriptions: {
            "ability:guardiao-interpor": "Protege quem está próximo.",
          },
        },
      },
    });
    expect(state.repo.get).toHaveBeenCalledWith(OWNER_ID, CHARACTER_ID);
    expect(state.repo.save).not.toHaveBeenCalled();
    expect(state.repo.transition).not.toHaveBeenCalled();
    expect(state.sql.close).toHaveBeenCalledOnce();
  });

  it.each([
    ["wrong secret", request({ source_user_id: OWNER_ID, characterId: CHARACTER_ID }, "wrong")],
    [
      "missing secret",
      new Request("https://kallistis.app/api/internal/vtt/characters/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source_user_id: OWNER_ID, characterId: CHARACTER_ID }),
      }),
    ],
  ])("rejects %s before database access", async (_label, input) => {
    const response = await postHandler({ request: input });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ valid: false, error: "service_unauthorized" });
    expect(state.repo.get).not.toHaveBeenCalled();
  });

  it.each([
    { source_user_id: "not-a-uuid", characterId: CHARACTER_ID },
    { source_user_id: OWNER_ID, characterId: "" },
    { source_user_id: OWNER_ID, characterId: "   " },
    { source_user_id: OWNER_ID, characterId: CHARACTER_ID, extra: "rejected" },
  ])("rejects invalid input: %j", async (body) => {
    const response = await postHandler({ request: request(body) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      valid: false,
      error: "invalid_character_request",
    });
    expect(state.repo.get).not.toHaveBeenCalled();
  });

  it.each([OWNER_ID, OTHER_OWNER_ID])(
    "does not expose a missing character for owner %s",
    async (ownerId) => {
      state.repo.get.mockResolvedValue(null);

      const response = await postHandler({
        request: request({ source_user_id: ownerId, characterId: CHARACTER_ID }),
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        valid: false,
        error: "character_not_found",
      });
    },
  );
});
