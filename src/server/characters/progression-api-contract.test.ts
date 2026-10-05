import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  repo: {
    get: vi.fn(),
    progression: vi.fn(),
    progressionList: vi.fn(),
  },
  sql: { query: vi.fn(), close: vi.fn() },
}));

vi.mock("@/server/runtime/context", () => ({
  getRuntimeDatabaseUrl: vi.fn(() => "postgresql://test/kallistis"),
}));
vi.mock("@/lib/require-user.server", () => ({
  requireUser: vi.fn(async () => ({ userId: "player-1" })),
}));
vi.mock("@/server/local-core/csrf", () => ({ isSameOriginRequest: vi.fn(() => true) }));
vi.mock("@/server/local-core/postgres", () => ({
  createBunPostgresExecutor: vi.fn(() => state.sql),
}));
vi.mock("@/server/characters/context", () => ({ buildCharacterContext: vi.fn(() => "") }));
vi.mock("@/server/characters/character-canon", () => ({
  mechanicalFingerprint: vi.fn(),
  validateMagicChoices: vi.fn(),
  validateCharacterSnapshot: vi.fn(),
}));
vi.mock("@/server/characters/repository", () => ({
  createPostgresCharacterRepository: vi.fn(() => state.repo),
}));

import { Route } from "@/routes/api/characters";

const postHandler = (Route.options as any).server.handlers.POST as (input: {
  request: Request;
}) => Promise<Response>;

describe("contrato da API de progressão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.repo.progression.mockResolvedValue({
      id: "progression-request-1",
      character_id: "character-1",
      status: "requested",
    });
    state.repo.get.mockResolvedValue({ id: "character-1", status: "approved", version: 26 });
    state.repo.progressionList.mockResolvedValue([
      { id: "progression-request-1", status: "requested" },
    ]);
  });

  it("devolve a personagem canônica após criar uma solicitação", async () => {
    const request = new Request("https://kallistis.app/api/characters", {
      method: "POST",
      headers: { origin: "https://kallistis.app", "content-type": "application/json" },
      body: JSON.stringify({ id: "character-1", action: "request" }),
    });

    const response = await postHandler({ request });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      character: { id: "character-1", status: "approved", version: 26 },
      progression: [{ id: "progression-request-1", status: "requested" }],
    });
    expect(state.repo.get).toHaveBeenCalledWith("player-1", "character-1");
  });
});
