import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalSession } from "@/lib/local-auth-client";
import { authenticatedBeforeLoad } from "./route";

vi.mock("@/lib/local-auth-client", () => ({
  getLocalSession: vi.fn(),
}));

vi.stubGlobal(
  "fetch",
  vi.fn(async () => new Response(JSON.stringify({ is_system_master: true }), { status: 200 })),
);

describe("authenticated route access", () => {
  const mockedGetLocalSession = getLocalSession as unknown as {
    mockResolvedValue(value: { user: { id: string } }): void;
  };

  beforeEach(() => mockedGetLocalSession.mockResolvedValue({ user: { id: "user-master" } }));

  it("allows migrated local-core surfaces after local authentication", async () => {
    for (const pathname of [
      "/chat",
      "/perfil",
      "/trilha/a03d37da-06a2-4178-9a13-213f442fc836",
      "/jardim",
      "/kallistis-presente",
      "/revisao",
      "/registro-vivo",
    ]) {
      await expect(authenticatedBeforeLoad({ location: { pathname } })).resolves.toBeUndefined();
    }
  });

  it("allows an unlisted authenticated surface to follow normal routing", async () => {
    await expect(
      authenticatedBeforeLoad({ location: { pathname: "/legacy-surface" } }),
    ).resolves.toBeUndefined();
  });
});
