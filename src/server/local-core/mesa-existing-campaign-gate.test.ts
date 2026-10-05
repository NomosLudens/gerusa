import { afterEach, describe, expect, it, vi } from "vitest";
import type { SqlExecutor } from "./postgres";
import { linkExistingMesaToGravewright, listExistingGravewrightCampaigns } from "./mesa-provision";

const MESA_ID = "11111111-1111-4111-8111-111111111111";
const CAMPAIGN_ID = "44444444-4444-4444-8444-444444444444";

class FakeSql implements SqlExecutor {
  calls: Array<{ statement: string; parameters?: readonly unknown[] }> = [];
  constructor(
    private readonly mapping?: string,
    private readonly duplicate = false,
  ) {}

  async query<T extends Record<string, unknown>>(
    statement: string,
    parameters?: readonly unknown[],
  ): Promise<readonly T[]> {
    this.calls.push({ statement, parameters });
    if (statement.includes("SELECT id::text, name FROM public.mesas"))
      return [{ id: MESA_ID, name: "Amigos Online" }] as unknown as T[];
    if (statement.includes("WHERE mesa_id=$1")) {
      return this.mapping
        ? ([{ gravewright_campaign_id: this.mapping }] as unknown as T[])
        : ([] as unknown as T[]);
    }
    if (statement.includes("gravewright_campaign_id=$1")) {
      return this.duplicate
        ? ([{ mesa_id: "55555555-5555-4555-8555-555555555555" }] as unknown as T[])
        : ([] as unknown as T[]);
    }
    return [] as unknown as T[];
  }

  close() {}
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("existing Gravewright campaign mapping", () => {
  it("lists remote eligible campaigns without reading the Gravewright database", async () => {
    vi.stubEnv("KALLISTIS_GRAVEWRIGHT_ORIGIN", "https://gravewright.test");
    vi.stubEnv("KALLISTIS_VTT_SERVICE_SECRET", "test-secret");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          valid: true,
          campaigns: [{ id: CAMPAIGN_ID, name: "Existing Campaign" }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await listExistingGravewrightCampaigns(new FakeSql(), MESA_ID);
    expect(result).toEqual([{ id: CAMPAIGN_ID, name: "Existing Campaign" }]);
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      schema: "kallistis.gravewright.campaign-list.v1",
      source_system: "kallistis",
    });
  });

  it("creates only the local mapping after the remote campaign link succeeds", async () => {
    vi.stubEnv("KALLISTIS_GRAVEWRIGHT_ORIGIN", "https://gravewright.test");
    vi.stubEnv("KALLISTIS_VTT_SERVICE_SECRET", "test-secret");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          valid: true,
          source_mesa_id: MESA_ID,
          campaign_id: CAMPAIGN_ID,
          campaign_name: "Existing Campaign",
          mapping_created: true,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const sql = new FakeSql();
    const result = await linkExistingMesaToGravewright(sql, MESA_ID, CAMPAIGN_ID);
    expect(result.mapping_created).toBe(true);
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toMatchObject({
      source_mesa_id: MESA_ID,
      source_mesa_name: "Amigos Online",
      campaign_id: CAMPAIGN_ID,
    });
    expect(
      sql.calls.filter((call) =>
        call.statement.includes("INSERT INTO public.vtt_campaign_mappings"),
      ),
    ).toHaveLength(1);
    expect(sql.calls.some((call) => call.statement.includes("mesa_members"))).toBe(false);
  });

  it("rejects a campaign already mapped to another Mesa before making a remote call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      linkExistingMesaToGravewright(new FakeSql(undefined, true), MESA_ID, CAMPAIGN_ID),
    ).rejects.toThrow("vtt_campaign_already_mapped");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
