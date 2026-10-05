import { afterEach, describe, expect, it, vi } from "vitest";
import type { SqlExecutor } from "./postgres";
import { createMesa, provisionMesaToGravewright, signMesaProvisionBody } from "./mesa-provision";
import { setMesaMemberships } from "./player-access";

const MESA_ID = "11111111-1111-4111-8111-111111111111";
const MASTER_ID = "22222222-2222-4222-8222-222222222222";
const PLAYER_ID = "33333333-3333-4333-8333-333333333333";
const CAMPAIGN_ID = "44444444-4444-4444-8444-444444444444";

class FakeSql implements SqlExecutor {
  calls: Array<{ statement: string; parameters?: readonly unknown[] }> = [];
  constructor(
    private readonly activeUsers = [{ id: MASTER_ID }, { id: PLAYER_ID }],
    private readonly members = [
      {
        user_id: MASTER_ID,
        display_name: "Mestre real",
        member_role: "mestre",
        user_status: "active",
      },
      {
        user_id: PLAYER_ID,
        display_name: "Jogador real",
        member_role: "jogador",
        user_status: "active",
      },
    ],
  ) {}
  async query<T extends Record<string, unknown>>(
    statement: string,
    parameters?: readonly unknown[],
  ): Promise<readonly T[]> {
    this.calls.push({ statement, parameters });
    if (statement.includes("FROM public.users WHERE status='active'")) {
      const selected = new Set(
        (parameters ?? []).filter((value): value is string => typeof value === "string"),
      );
      return this.activeUsers.filter(
        (row) => selected.size === 0 || selected.has(row.id),
      ) as unknown as T[];
    }
    if (statement.includes("SELECT 1 FROM public.mesas WHERE id=$1"))
      return [{ ok: 1 }] as unknown as T[];
    if (statement.includes("SELECT id::text,name FROM public.mesas"))
      return [{ id: MESA_ID, name: "Mesa de teste" }] as unknown as T[];
    if (statement.includes("FROM public.vtt_campaign_mappings WHERE mesa_id=$1"))
      return [] as unknown as T[];
    if (statement.includes("FROM public.mesa_members mm JOIN"))
      return this.members as unknown as T[];
    if (statement.includes("gravewright_campaign_id=$1")) return [] as unknown as T[];
    if (statement.includes("INSERT INTO public.mesas"))
      return [{ id: MESA_ID, slug: "mesa-de-teste", name: "Mesa de teste" }] as unknown as T[];
    return [] as unknown as T[];
  }
  close() {}
  async transaction<T>(fn: (transaction: SqlExecutor) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

const provisionResult = {
  valid: true,
  source_mesa_id: MESA_ID,
  campaign_id: CAMPAIGN_ID,
  campaign_created: true,
  campaign_reused: false,
  members_created: 2,
  members_updated: 0,
  members_removed: 0,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Gate 07A.3 Mesa services", () => {
  it("exige Mestre explícito e persiste Mestre/jogador sem duplicação", async () => {
    const sql = new FakeSql();
    await expect(createMesa(sql, [], [PLAYER_ID], "Mesa sem Mestre")).rejects.toThrow(
      "master_required",
    );
    const mesa = await createMesa(sql, [MASTER_ID], [PLAYER_ID], "Mesa de teste");
    expect(mesa).toMatchObject({ id: MESA_ID, name: "Mesa de teste" });
    const membershipInserts = sql.calls.filter((call) =>
      call.statement.includes("INSERT INTO public.mesa_members"),
    );
    expect(membershipInserts).toHaveLength(2);
    expect(membershipInserts.map((call) => call.statement)).toEqual([
      expect.stringContaining("'mestre'"),
      expect.stringContaining("'jogador'"),
    ]);
  });

  it("provisiona o mapping e envia apenas identidade pública e papel", async () => {
    vi.stubEnv("KALLISTIS_GRAVEWRIGHT_ORIGIN", "https://gravewright.test");
    vi.stubEnv("KALLISTIS_VTT_SERVICE_SECRET", "test-secret");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(provisionResult), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const sql = new FakeSql();
    const result = await provisionMesaToGravewright(sql, MESA_ID);
    expect(result.campaign_id).toBe(CAMPAIGN_ID);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = request.headers as Record<string, string>;
    const payload = JSON.parse(String(request.body)) as Record<string, unknown>;
    const timestamp = Number(headers["x-kallistis-timestamp"]);
    expect(Number.isInteger(timestamp)).toBe(true);
    expect(headers["x-kallistis-signature"]).toBe(
      signMesaProvisionBody(String(request.body), "test-secret", timestamp),
    );
    expect(payload).toMatchObject({
      schema: "kallistis.gravewright.mesa-provision.v1",
      mesa: { source_system: "kallistis", source_mesa_id: MESA_ID, name: "Mesa de teste" },
    });
    expect(payload).not.toHaveProperty("credential");
    expect(payload).not.toHaveProperty("password");
    expect(payload).not.toHaveProperty("secret");
    expect(payload.members).toEqual([
      { source_user_id: MASTER_ID, display_name: "Mestre real", role: "mestre" },
      { source_user_id: PLAYER_ID, display_name: "Jogador real", role: "jogador" },
    ]);
    expect(sql.calls.some((call) => call.statement.includes("vtt_campaign_mappings"))).toBe(true);
  });

  it("mantém a Mesa persistida se o Gravewright falhar depois da criação", async () => {
    const sql = new FakeSql();
    const mesa = await createMesa(sql, [MASTER_ID], [], "Mesa resiliente");
    vi.stubEnv("KALLISTIS_GRAVEWRIGHT_ORIGIN", "https://gravewright.test");
    vi.stubEnv("KALLISTIS_VTT_SERVICE_SECRET", "test-secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(provisionMesaToGravewright(sql, mesa.id)).rejects.toThrow(
      "gravewright_unavailable",
    );
    expect(sql.calls.some((call) => call.statement.includes("INSERT INTO public.mesas"))).toBe(
      true,
    );
    expect(sql.calls.some((call) => call.statement.includes("DELETE FROM public.mesas"))).toBe(
      false,
    );
  });

  it("reconcilia memberships no KALLISTIS e chama o mesmo provisionamento", async () => {
    vi.stubEnv("KALLISTIS_GRAVEWRIGHT_ORIGIN", "https://gravewright.test");
    vi.stubEnv("KALLISTIS_VTT_SERVICE_SECRET", "test-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(provisionResult), { status: 200 })),
    );
    const sql = new FakeSql();
    await setMesaMemberships(sql, MESA_ID, [MASTER_ID], [PLAYER_ID]);
    expect(
      sql.calls.some((call) =>
        call.statement.includes("UPDATE public.mesa_members SET membership_status='left'"),
      ),
    ).toBe(true);
    expect(
      sql.calls.filter((call) => call.statement.includes("INSERT INTO public.mesa_members")),
    ).toHaveLength(2);
  });
});
