import { describe, expect, it } from "vitest";
import {
  createPostgresAuthRepository,
  createPostgresChatRepository,
  createPostgresMemoryRepository,
  createPostgresSedimentationRepository,
  getHermesIdentityForUser,
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

describe("repositórios PostgreSQL locais", () => {
  it("valida sessão e atualiza last_seen na mesma operação SQL", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "session-1",
        user_id: "user-1",
        token_digest: "digest",
        created_at: "2026-08-01T00:00:00Z",
        expires_at: "2026-09-01T00:00:00Z",
        last_seen_at: "2026-08-30T00:00:00Z",
        revoked_at: null,
        user_status: "active",
      },
    ];
    const authenticated = await createPostgresAuthRepository(
      sql,
    ).findAndTouchActiveSessionByTokenDigest("digest", new Date("2026-08-30T00:01:00Z"));
    expect(authenticated?.user.id).toBe("user-1");
    expect(sql.calls[0]?.statement).toContain("UPDATE sessions");
    expect(sql.calls[0]?.statement).toContain("s.revoked_at IS NULL");
    expect(sql.calls[0]?.statement).toContain("RETURNING");
  });

  it("aplica ownership antes de ler thread e ordena histórico explicitamente", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "thread-1",
        user_id: "user-1",
        surface: "kallistis",
        facet: "kallistis",
        title: null,
        created_at: "2026-08-30T00:00:00Z",
        last_sedimentado_at: null,
      },
    ];
    const repository = createPostgresChatRepository(sql);
    expect((await repository.getThreadById("user-1", "thread-1"))?.userId).toBe("user-1");
    await repository.listThreadMessages("user-1", "thread-1", 20);
    expect(sql.calls[0]?.statement).toContain("user_id = $2");
    expect(sql.calls[1]?.statement).toContain("ORDER BY m.created_at DESC, m.id DESC");
    expect(sql.calls[1]?.parameters).toEqual(["user-1", "thread-1", 20]);
  });

  it("preserva colunas legadas somente no readback e usa ChatScope para comportamento", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "thread-1",
        user_id: "user-1",
        surface: "kallistis",
        facet: "kallistis",
        title: "Criação",
        created_at: "2026-09-19T00:00:00Z",
        last_sedimentado_at: null,
        campaign_id: null,
        campaign_name: null,
        campaign_mesa_id: null,
        response_mode: "NARRADOR",
        roleplay_target_id: null,
        player_experience: "CHARACTER_CREATION",
        active_character_id: "character-1",
      },
    ];
    const repository = createPostgresChatRepository(sql);

    const historical = await repository.getThreadById("user-1", "thread-1");
    expect(historical).toMatchObject({
      responseMode: "NARRADOR",
      playerExperience: "CHARACTER_CREATION",
      activeCharacterId: "character-1",
    });

    sql.nextRows = [
      {
        ...sql.nextRows[0],
        response_mode: "NARRADOR",
        roleplay_target_id: null,
        player_experience: "CAMPAIGN",
        active_character_id: "character-2",
      },
    ];
    const afterExperience = await repository.updatePlayerExperience!(
      "user-1",
      "thread-1",
      "CAMPAIGN",
      "character-2",
    );
    expect(afterExperience).toMatchObject({
      responseMode: "NARRADOR",
      roleplayTargetId: null,
      playerExperience: "CAMPAIGN",
      activeCharacterId: "character-2",
    });
    expect(sql.calls[1]?.statement).toContain("SET player_experience=$3, active_character_id=$4");
    expect(sql.calls[1]?.statement).not.toContain("SET response_mode");
    expect(sql.calls[1]?.statement).not.toContain("roleplay_target_id=NULL");
  });

  it("mantém user_id como argumento de todos os acessos de memória", async () => {
    const sql = new RecordingSql();
    const repository = createPostgresMemoryRepository(sql);
    await repository.listCandidates("user-2");
    await repository.listMemories("user-2");
    await repository.listSediments("user-2", "thread-2");
    expect(sql.calls).toHaveLength(3);
    expect(sql.calls.every((call) => call.parameters?.[0] === "user-2")).toBe(true);
  });

  it("carrega memórias globais e somente da campanha autorizada", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "memory-1",
        user_id: "user-2",
        title: "Abertura",
        body: "LÂMINA DE VIDRO",
        campaign_id: "campaign-a",
        created_at: "2026-09-04T00:00:00Z",
      },
    ];
    const memories = await createPostgresMemoryRepository(sql).listMemories("user-2", "campaign-a");
    expect(sql.calls[0]?.statement).toContain("campaign_id IS NULL OR campaign_id = $2");
    expect(sql.calls[0]?.parameters).toEqual(["user-2", "campaign-a"]);
    expect(memories[0]).toMatchObject({ campaignId: "campaign-a", body: "LÂMINA DE VIDRO" });
  });

  it("chama somente as funções atômicas locais com identidade explícita", async () => {
    const sql = new RecordingSql();
    const repository = createPostgresSedimentationRepository(sql);
    sql.nextRows = [{ result: { ok: true } }];
    await repository.promoteSedimentBatch("user-3", "thread-3", ["a", "b", "c", "d", "e"], {
      nextLevel: "echoic",
      hypothesis: "síntese sintética",
      summary: null,
      confidence: 1,
    });
    expect(sql.calls[0]?.statement).toContain("promote_sediment_batch_atomic");
    expect(sql.calls[0]?.statement).not.toMatch(/auth\.uid|supabase/i);
    expect(sql.calls[0]?.parameters?.[0]).toBe("user-3");
  });

  it("não aceita inserção de mensagem ou cursor sem thread própria", async () => {
    const sql = new RecordingSql();
    const repository = createPostgresChatRepository(sql);
    const message = {
      id: "message-1",
      threadId: "thread-missing",
      userId: "user-4",
      role: "user" as const,
      content: "oi",
      createdAt: "2026-08-30T00:00:00Z",
      derivedFrom: [],
      sourceChannel: null,
    };
    await expect(repository.insertMessage(message)).rejects.toThrow("not found or not owned");
    await expect(
      repository.updateThreadSedimentationCursor("user-4", "thread-missing", message.createdAt),
    ).rejects.toThrow("not found or not owned");
    expect(sql.calls[0]?.statement).toContain("RETURNING id");
    expect(sql.calls[1]?.statement).toContain("RETURNING id");
  });

  it("resolve profile, role e uma única mesa ativa", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        profile_id: "user-1",
        display_name: "Tony",
        pronouns: " ele/dele ",
        system_role: "system_master",
        mesa_id: "mesa-1",
        mesa_slug: "geek-wizards",
        mesa_name: "Geek Wizards",
        member_role: "mestre",
        membership_status: "active",
      },
    ];

    await expect(getHermesIdentityForUser(sql, "user-1")).resolves.toMatchObject({
      profile: { id: "user-1", display_name: "Tony", pronouns: "ele/dele" },
      systemRole: "system_master",
      activeMembershipCount: 1,
      mesa: { id: "mesa-1", name: "Geek Wizards", member_role: "mestre" },
    });
    expect(sql.calls[0]?.statement).toContain("p.pronouns");
    expect(sql.calls).toHaveLength(1);
  });

  it("mantém mesa não selecionada quando não há membership ativa", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        profile_id: "user-2",
        display_name: null,
        pronouns: null,
        system_role: null,
        mesa_id: null,
        mesa_slug: null,
        mesa_name: null,
        member_role: null,
        membership_status: null,
      },
    ];

    await expect(getHermesIdentityForUser(sql, "user-2")).resolves.toMatchObject({
      activeMembershipCount: 0,
      mesa: null,
    });
  });

  it("não escolhe arbitrariamente quando há múltiplas mesas ativas", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        profile_id: "user-3",
        display_name: "Pessoa",
        pronouns: null,
        system_role: "system_master",
        mesa_id: "mesa-a",
        mesa_slug: "a",
        mesa_name: "Mesa A",
        member_role: "mestre",
        membership_status: "active",
      },
      {
        profile_id: "user-3",
        display_name: "Pessoa",
        pronouns: null,
        system_role: "system_master",
        mesa_id: "mesa-b",
        mesa_slug: "b",
        mesa_name: "Mesa B",
        member_role: "jogador",
        membership_status: "active",
      },
    ];

    await expect(getHermesIdentityForUser(sql, "user-3")).resolves.toMatchObject({
      activeMembershipCount: 2,
      mesa: null,
    });
  });

  it("mantém profile, role e memberships estritamente no usuário autenticado", async () => {
    const sql = new RecordingSql();
    await getHermesIdentityForUser(sql, "user-4");
    const call = sql.calls[0];
    expect(call.parameters).toEqual(["user-4"]);
    expect(call.statement).toContain("WHERE u.id = $1");
    expect(call.statement).toContain("p.id = u.id");
    expect(call.statement).toContain("sr.user_id = u.id");
    expect(call.statement).toContain("mm.user_id = u.id");
  });
});
