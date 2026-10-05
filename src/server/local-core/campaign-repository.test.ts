import { describe, expect, it } from "vitest";
import {
  createPostgresCampaignRepository,
  createPostgresChatRepository,
} from "./postgres-repositories";
import type { SqlExecutor } from "./postgres";

class RecordingSql implements SqlExecutor {
  calls: Array<{ statement: string; parameters: readonly unknown[] | undefined }> = [];
  nextRows: readonly Record<string, unknown>[] = [];

  async query<T extends Record<string, unknown>>(
    statement: string,
    parameters?: readonly unknown[],
  ) {
    this.calls.push({ statement, parameters });
    return this.nextRows as readonly T[];
  }

  close() {}
}

describe("substrato de campanhas", () => {
  it("lista somente campanhas ativas em Mesas com membership ativa", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "campaign-1",
        mesa_id: "mesa-1",
        mesa_name: "Geek Wizards",
        name: "Campanha A",
        status: "active",
        created_at: "2026-09-04T00:00:00Z",
        updated_at: "2026-09-04T00:00:00Z",
      },
    ];
    const campaigns = await createPostgresCampaignRepository(sql).listAuthorized("user-1");
    expect(campaigns[0]).toMatchObject({ id: "campaign-1", mesaId: "mesa-1", name: "Campanha A" });
    expect(sql.calls[0]?.statement).toContain("mm.user_id = $1");
    expect(sql.calls[0]?.statement).toContain("mm.membership_status = 'active'");
    expect(sql.calls[0]?.statement).toContain("c.status = 'active'");
    expect(sql.calls[0]?.parameters).toEqual(["user-1"]);
  });

  it("trata system_master como participante global de todas as Mesas", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "campaign-global",
        mesa_id: "mesa-global",
        mesa_name: "Mesa Global",
        name: "Campanha Global",
        status: "active",
        created_at: "2026-09-04T00:00:00Z",
        updated_at: "2026-09-04T00:00:00Z",
      },
    ];
    const repository = createPostgresCampaignRepository(sql);
    await repository.listAuthorized("master-user");
    expect(sql.calls[0]?.statement).toContain("system_role = 'system_master'");
    expect(sql.calls[0]?.statement).toContain("OR EXISTS (SELECT 1 FROM public.mesa_members mm");

    sql.nextRows = [
      {
        id: "mesa-global",
        slug: "mesa-global",
        name: "Mesa Global",
        member_role: "mestre",
      },
    ];
    const mesas = await repository.listMasterMesas("master-user");
    expect(mesas).toEqual([
      {
        id: "mesa-global",
        slug: "mesa-global",
        name: "Mesa Global",
        memberRole: "mestre",
      },
    ]);
    expect(sql.calls[1]?.statement).toContain("LEFT JOIN public.mesa_members mm");
    expect(sql.calls[1]?.statement).toContain("WHERE EXISTS (SELECT 1 FROM public.system_roles sr");
  });

  it("restringe seleção de campanha ao usuário membro da Mesa", async () => {
    const sql = new RecordingSql();
    await createPostgresCampaignRepository(sql).getAuthorized("user-2", "campaign-2");
    expect(sql.calls[0]?.statement).toContain("c.id = $1");
    expect(sql.calls[0]?.statement).toContain("mm.user_id = $2");
    expect(sql.calls[0]?.parameters).toEqual(["campaign-2", "user-2"]);
  });

  it("restringe campanhas de Mestre à Mesa em que o usuário é Mestre", async () => {
    const sql = new RecordingSql();
    await createPostgresCampaignRepository(sql).listMasterAuthorized("master-user");
    expect(sql.calls[0]?.statement).toContain("mm.mesa_id=c.mesa_id");
    expect(sql.calls[0]?.statement).toContain("mm.member_role='mestre'");
    expect(sql.calls[0]?.statement).toContain("mm.membership_status='active'");
  });

  it("exige Mestre ou system_master para criar em membership ativa", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "campaign-3",
        mesa_id: "mesa-3",
        mesa_name: "Mesa",
        name: "Campanha C",
        status: "active",
        created_at: "2026-09-04T00:00:00Z",
        updated_at: "2026-09-04T00:00:00Z",
      },
    ];
    await createPostgresCampaignRepository(sql).create("user-3", "mesa-3", "Campanha C");
    expect(sql.calls[0]?.statement).toContain("INSERT INTO public.campaigns");
    expect(sql.calls[0]?.statement).toContain("mm.membership_status = 'active'");
    expect(sql.calls[0]?.statement).toContain("mm.member_role = 'mestre'");
    expect(sql.calls[0]?.statement).toContain("system_master");
    expect(sql.calls[0]?.parameters).toEqual(["user-3", "mesa-3", "Campanha C"]);
  });

  it("carrega o binding de campanha sem quebrar threads históricas", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "thread-1",
        user_id: "user-1",
        surface: "kallistis",
        facet: "kallistis",
        title: null,
        created_at: "2026-09-04T00:00:00Z",
        last_sedimentado_at: null,
        campaign_id: null,
        campaign_name: null,
        campaign_mesa_id: null,
      },
    ];
    const thread = await createPostgresChatRepository(sql).getThreadById("user-1", "thread-1");
    expect(thread).toMatchObject({ campaignId: null, campaignName: null, mesaId: null });
    expect(sql.calls[0]?.statement).toContain("t.campaign_id");
    expect(sql.calls[0]?.statement).toContain("system_role = 'system_master'");
    expect(sql.calls[0]?.statement).toContain("mm.user_id IS NOT NULL");
  });

  it("mantém o Chat de Mestre restrito à Mesa da campanha", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "thread-master",
        user_id: "master-user",
        surface: "kallistis",
        facet: "kallistis",
        title: "[KALLISTIS_SCOPE:master]",
        created_at: "2026-09-04T00:00:00Z",
        last_sedimentado_at: null,
        campaign_id: "campaign-1",
        campaign_name: "Campanha",
        campaign_mesa_id: "mesa-1",
      },
    ];
    const repository = createPostgresChatRepository(sql);
    const thread = await repository.findScopedThread?.("master-user", "master");
    expect(thread).toMatchObject({ scope: "master", campaignId: "campaign-1", mesaId: "mesa-1" });
    expect(sql.calls[0]?.statement).toContain("mm.member_role = 'mestre'");
    expect(sql.calls[0]?.statement).toContain("t.campaign_id IS NULL AND EXISTS");
  });
});
