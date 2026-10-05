import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const MESA_ID = "22222222-2222-4222-8222-222222222222";
const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";

const state = vi.hoisted(() => ({
  close: vi.fn(),
  listMasterAuthorized: vi.fn(),
  listMasterMesas: vi.fn(),
  link: vi.fn(),
  provision: vi.fn(),
}));

vi.mock("@/server/runtime/context", () => ({
  getRuntimeDatabaseUrl: vi.fn(() => "postgresql://test/kallistis"),
}));
vi.mock("@/lib/require-user.server", () => ({
  requireUser: vi.fn(async () => ({ userId: "11111111-1111-4111-8111-111111111111" })),
}));
vi.mock("@/server/local-core/chat-runtime", () => ({
  createLocalChatRuntime: vi.fn(() => ({
    campaigns: {
      listMasterAuthorized: state.listMasterAuthorized,
      listMasterMesas: state.listMasterMesas,
    },
    close: state.close,
  })),
}));
vi.mock("@/server/local-core/postgres", () => ({
  createBunPostgresExecutor: vi.fn(() => ({ close: state.close, query: vi.fn() })),
}));
vi.mock("@/server/local-core/mesa-provision", () => ({
  MesaProvisionError: class MesaProvisionError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
  linkExistingMesaToGravewright: state.link,
  provisionMesaToGravewright: state.provision,
}));

import { Route } from "./campaigns";

const handlers = (Route.options as any).server.handlers;

function request(
  path: string,
  init: RequestInit = {},
  origin = "https://gravewright.kallistis.app",
) {
  return new Request("https://kallistis.app" + path, {
    ...init,
    headers: { Origin: origin, ...(init.headers as Record<string, string> | undefined) },
  });
}

describe("KALLISTIS campaign bridge for Gravewright", () => {
  beforeEach(() => {
    vi.stubEnv("KALLISTIS_GRAVEWRIGHT_ORIGIN", "https://gravewright.kallistis.app");
    state.close.mockReset();
    state.listMasterAuthorized.mockReset().mockResolvedValue([]);
    state.listMasterMesas
      .mockReset()
      .mockResolvedValue([
        { id: MESA_ID, slug: "amigos-online", name: "Amigos Online", memberRole: "mestre" },
      ]);
    state.link.mockReset().mockResolvedValue({ mapping_created: true });
    state.provision.mockReset().mockResolvedValue({ members_created: 2, members_updated: 0 });
  });

  it("returns only session-authorized mesas with credentialed CORS for the exact Gravewright origin", async () => {
    const response = await handlers.GET({ request: request("/api/chat/campaigns?scope=master") });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://gravewright.kallistis.app",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    await expect(response.json()).resolves.toMatchObject({
      mesas: [{ id: MESA_ID, name: "Amigos Online", memberRole: "mestre" }],
    });
    expect(state.listMasterMesas).toHaveBeenCalledWith(USER_ID);
  });

  it("answers preflight only for the configured Gravewright origin", async () => {
    const allowed = await handlers.OPTIONS({
      request: request("/api/chat/campaigns", { method: "OPTIONS" }),
    });
    const rejected = await handlers.OPTIONS({
      request: request("/api/chat/campaigns", { method: "OPTIONS" }, "https://evil.example"),
    });

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(rejected.status).toBe(403);
  });

  it("links only a Mesa the authenticated user can manage, then provisions its members", async () => {
    const response = await handlers.POST({
      request: request("/api/chat/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link_gravewright_campaign",
          mesaId: MESA_ID,
          campaignId: CAMPAIGN_ID,
        }),
      }),
    });

    expect(response.status).toBe(200);
    expect(state.link).toHaveBeenCalledWith(expect.anything(), MESA_ID, CAMPAIGN_ID);
    expect(state.provision).toHaveBeenCalledWith(expect.anything(), MESA_ID);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      mesa: { id: MESA_ID, name: "Amigos Online" },
      provisioning: { status: "ready" },
    });
  });

  it("rejects linking a Mesa the user cannot administer", async () => {
    state.listMasterMesas.mockResolvedValue([
      { id: MESA_ID, slug: "amigos-online", name: "Amigos Online", memberRole: "jogador" },
    ]);

    const response = await handlers.POST({
      request: request("/api/chat/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link_gravewright_campaign",
          mesaId: MESA_ID,
          campaignId: CAMPAIGN_ID,
        }),
      }),
    });

    expect(response.status).toBe(403);
    expect(state.link).not.toHaveBeenCalled();
    expect(state.provision).not.toHaveBeenCalled();
  });
});
