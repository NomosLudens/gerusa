import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ close: vi.fn(), query: vi.fn() }));
vi.mock("@/server/local-core/credentials", () => ({
  credentialLookupDigest: vi.fn((phrase: string) => `digest:${phrase}`),
  hashCredential: vi.fn(async (phrase: string) => `hash:${phrase}`),
}));

vi.mock("@/lib/require-user.server", () => ({
  requireUser: vi.fn(async () => ({ userId: "11111111-1111-4111-8111-111111111111" })),
}));
vi.mock("@/server/runtime/context", () => ({
  getRuntimeDatabaseUrl: vi.fn(() => "postgresql://test/kallistis"),
}));
vi.mock("@/server/local-core/postgres", () => ({
  createBunPostgresExecutor: vi.fn(() => ({ close: state.close, query: state.query })),
}));

import { Route } from "./player-phrase";
import { decryptPlayerPhrase, encryptPlayerPhrase } from "@/server/local-core/player-phrase-crypto";

const handlers = (Route.options as any).server.handlers;

describe("Gravewright player phrase status", () => {
  beforeEach(() => {
    vi.stubEnv("KALLISTIS_GRAVEWRIGHT_ORIGIN", "https://gravewright.kallistis.app");
    vi.stubEnv("KALLISTIS_VTT_SERVICE_SECRET", "test-service-secret");
    vi.stubEnv("KALLISTIS_CREDENTIAL_LOOKUP_KEY", "test-lookup-key");
    state.close.mockReset();
    state.query.mockReset().mockResolvedValue([]);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns the real Gravewright entry URL and this player's phrase status", async () => {
    const response = await handlers.GET({
      request: new Request("https://kallistis.app/api/vtt/player-phrase"),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      configured: false,
      phrase: null,
      phrase_available: false,
      gravewright_url: "https://gravewright.kallistis.app",
    });
    expect(state.query).toHaveBeenCalledWith(expect.stringContaining("public.player_access"), [
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(state.close).toHaveBeenCalledOnce();
  });

  it("returns only this authenticated player's decryptable phrase", async () => {
    vi.stubEnv("KALLISTIS_VTT_SERVICE_SECRET", "test-service-secret");
    const phrase = "mi-valen-mi-raar-mi-silma";
    const ciphertext = await encryptPlayerPhrase(phrase, "test-service-secret", {
      userId: "11111111-1111-4111-8111-111111111111",
      playerCode: "JOGADOR-01",
    });
    state.query.mockResolvedValue([
      { player_code: "JOGADOR-01", credential_ciphertext: ciphertext },
    ]);

    const response = await handlers.GET({
      request: new Request("https://kallistis.app/api/vtt/player-phrase"),
    });

    await expect(response.json()).resolves.toMatchObject({
      configured: true,
      phrase,
      phrase_available: true,
    });
  });

  it("does not expose a non-HTTPS configured URL as a player login link", async () => {
    vi.stubEnv("KALLISTIS_GRAVEWRIGHT_ORIGIN", "http://gravewright.internal");

    const response = await handlers.GET({
      request: new Request("https://kallistis.app/api/vtt/player-phrase"),
    });

    await expect(response.json()).resolves.toMatchObject({ gravewright_url: null });
  });

  it("assigns an unused Velarim piece and syncs that same phrase to Gravewright", async () => {
    const usedPieceCiphertext = await encryptPlayerPhrase("mi-valen", "test-service-secret", {
      userId: "22222222-2222-4222-8222-222222222222",
      playerCode: "JOGADOR-02",
    });
    state.query
      .mockResolvedValueOnce([{ player_code: "JOGADOR-01" }])
      .mockResolvedValueOnce([
        {
          mesa_id: "22222222-2222-4222-8222-222222222222",
          gravewright_campaign_id: "33333333-3333-4333-8333-333333333333",
        },
      ])
      .mockResolvedValueOnce([
        {
          user_id: "22222222-2222-4222-8222-222222222222",
          player_code: "JOGADOR-02",
          credential_ciphertext: usedPieceCiphertext,
        },
      ])
      .mockResolvedValueOnce([]);
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        valid: true,
        source_user_id: "11111111-1111-4111-8111-111111111111",
      }),
    );

    const response = await handlers.POST({
      request: new Request("https://kallistis.app/api/vtt/player-phrase", {
        method: "POST",
        headers: { Origin: "https://kallistis.app", "Content-Type": "application/json" },
        body: "{}",
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.phrase).toMatch(/^mi-[a-z']+$/);
    expect(body.phrase).not.toBe("mi-valen");
    expect(state.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("credential_ciphertext"),
      expect.arrayContaining(["JOGADOR-01", "11111111-1111-4111-8111-111111111111"]),
    );
    const writeValues = state.query.mock.calls[3][1] as string[];
    expect(writeValues[3]).toBe(`hash:${body.phrase}`);
    expect(writeValues[4]).not.toBe(body.phrase);
    await expect(
      decryptPlayerPhrase(writeValues[4], "test-service-secret", {
        userId: "11111111-1111-4111-8111-111111111111",
        playerCode: "JOGADOR-01",
      }),
    ).resolves.toBe(body.phrase);
    const remoteRequest = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(remoteRequest.body)).phrase).toBe(body.phrase);
    expect(state.close).toHaveBeenCalledOnce();
  });

  it("keeps the existing KALLISTIS credential untouched when Gravewright rejects the new piece", async () => {
    const existingPhrase = "mi-valen";
    const existingCiphertext = await encryptPlayerPhrase(existingPhrase, "test-service-secret", {
      userId: "22222222-2222-4222-8222-222222222222",
      playerCode: "JOGADOR-02",
    });
    state.query
      .mockResolvedValueOnce([{ player_code: "JOGADOR-01" }])
      .mockResolvedValueOnce([
        {
          mesa_id: "22222222-2222-4222-8222-222222222222",
          gravewright_campaign_id: "33333333-3333-4333-8333-333333333333",
        },
      ])
      .mockResolvedValueOnce([
        {
          user_id: "22222222-2222-4222-8222-222222222222",
          player_code: "JOGADOR-02",
          credential_ciphertext: existingCiphertext,
        },
      ]);
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ valid: false, error: "invalid_piece" }, { status: 400 }),
    );

    const response = await handlers.POST({
      request: new Request("https://kallistis.app/api/vtt/player-phrase", {
        method: "POST",
        headers: { Origin: "https://kallistis.app", "Content-Type": "application/json" },
        body: "{}",
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "invalid_piece" });
    expect(state.query).toHaveBeenCalledTimes(3);
    expect(
      state.query.mock.calls.some(([statement]) =>
        String(statement).includes("INSERT INTO public.player_access"),
      ),
    ).toBe(false);
    expect(
      state.query.mock.calls.some(([statement]) => String(statement).includes("revoked_at=now()")),
    ).toBe(false);
  });
});
