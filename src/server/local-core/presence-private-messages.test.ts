import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "./postgres";
import {
  assertPresenceState,
  assignResponsibleMaster,
  getPresenceForPlayerInMesa,
  listEligibleResponsibleMasters,
  resolveResponsibleMaster,
  removeResponsibleMaster,
  upsertPresenceForPlayerInMesa,
} from "./presence-repository";
import { renderPresenceRegimeContext } from "./presence-repository";
import {
  getUnreadCount,
  listPrivateMessages,
  listThreadsForMaster,
  markPrivateMessagesRead,
  sendPrivateMessage,
} from "./private-messages-repository";

class RecordingSql implements SqlExecutor {
  calls: Array<{ statement: string; parameters: readonly unknown[] }> = [];
  responses: Array<readonly Record<string, unknown>[]> = [];
  async query<T extends Record<string, unknown>>(
    statement: string,
    parameters: readonly unknown[] = [],
  ) {
    this.calls.push({ statement, parameters });
    return (this.responses.shift() ?? []) as readonly T[];
  }
  close() {}
}

const message = {
  id: "message-1",
  player_user_id: "player-1",
  master_user_id: "master-1",
  sender_user_id: "player-1",
  body: "Olá",
  created_at: "2026-09-12T12:00:00Z",
  read_at: null,
};

describe("backend do Semáforo e Mestre responsável", () => {
  it("inclui Mestres ativos sem perfil na lista de delegação", async () => {
    const sql = new RecordingSql();
    sql.responses = [[{ id: "master-1234", display_name: "Mestre sem perfil · master-" }]];
    await expect(listEligibleResponsibleMasters(sql, "mesa-1")).resolves.toEqual([
      { id: "master-1234", display_name: "Mestre sem perfil · master-" },
    ]);
    expect(sql.calls[0]?.statement).toContain("LEFT JOIN public.profiles");
    expect(sql.calls[0]?.statement).toContain("mm.member_role='mestre'");
    expect(sql.calls[0]?.statement).toContain("mm.membership_status='active'");
    expect(sql.calls[0]?.parameters).toEqual(["mesa-1"]);
  });

  it("resolve TAL quando não há delegação", async () => {
    const sql = new RecordingSql();
    sql.responses = [[], [], [{ identity_key: "TAL", user_id: "tal-1" }]];
    await expect(resolveResponsibleMaster(sql, "mesa-1")).resolves.toMatchObject({
      master_user_id: "tal-1",
      source: "tal",
    });
    expect(sql.calls[0]?.statement).toContain("mesa_responsible_masters");
    expect(sql.calls[2]?.statement).toContain("system_identities");
  });

  it("aceita os quatro regimes e rejeita qualquer outro", () => {
    for (const regime of ["green", "yellow", "blue", "red"]) assertPresenceState(regime);
    expect(() => assertPresenceState("purple")).toThrow("invalid_presence_regime");
  });

  it("exige membership de jogador antes de ler ou gravar presença", async () => {
    const readSql = new RecordingSql();
    readSql.responses = [[]];
    await expect(getPresenceForPlayerInMesa(readSql, "other-player", "mesa-1")).resolves.toBeNull();
    const writeSql = new RecordingSql();
    writeSql.responses = [[]];
    await expect(
      upsertPresenceForPlayerInMesa(writeSql, "other-player", "mesa-1", "green"),
    ).resolves.toBeNull();
    expect(writeSql.calls[0]?.statement).toContain("member_role='jogador'");
  });

  it("autoriza delegação somente pelo TAL e valida Mestre ativo", async () => {
    const sql = new RecordingSql();
    sql.responses = [
      [{ identity_key: "TAL", user_id: "tal-1" }],
      [{ id: "mesa-1" }],
      [{ ok: true }],
      [],
      [{ mesa_id: "mesa-1", master_user_id: "master-1" }],
      [{ master_user_id: "master-1" }],
    ];
    await expect(
      assignResponsibleMaster({
        sql,
        mesaId: "mesa-1",
        masterUserId: "master-1",
        authenticatedTalUserId: "tal-1",
      }),
    ).resolves.toMatchObject({ master_user_id: "master-1", source: "assigned" });
    expect(sql.calls[2]?.statement).toContain("member_role='mestre'");
    expect(sql.calls[3]?.parameters).toEqual(["mesa-1", "master-1", "tal-1"]);
    const denied = new RecordingSql();
    denied.responses = [[{ identity_key: "TAL", user_id: "tal-1" }]];
    await expect(
      assignResponsibleMaster({
        sql: denied,
        mesaId: "mesa-1",
        masterUserId: "master-1",
        authenticatedTalUserId: "not-tal",
      }),
    ).rejects.toThrow("tal_required");
  });

  it("remove a delegação e retorna ao fallback TAL", async () => {
    const sql = new RecordingSql();
    sql.responses = [
      [{ identity_key: "TAL", user_id: "tal-1" }],
      [],
      [],
      [],
      [{ identity_key: "TAL", user_id: "tal-1" }],
    ];
    await expect(
      removeResponsibleMaster({ sql, mesaId: "mesa-1", authenticatedTalUserId: "tal-1" }),
    ).resolves.toMatchObject({ master_user_id: "tal-1", source: "tal" });
    expect(sql.calls[1]?.statement).toContain("DELETE");
  });
});

describe("canal privado jogador + Mestre", () => {
  it("persiste somente sender pertencente ao par e bloqueia forja", async () => {
    const sql = new RecordingSql();
    sql.responses = [[message]];
    await expect(
      sendPrivateMessage({
        sql,
        playerUserId: "player-1",
        masterUserId: "master-1",
        senderUserId: "player-1",
        body: "Olá",
      }),
    ).resolves.toEqual(message);
    expect(sql.calls[0]?.statement).toContain("presence_messages");
    const forged = new RecordingSql();
    await expect(
      sendPrivateMessage({
        sql: forged,
        playerUserId: "player-1",
        masterUserId: "master-1",
        senderUserId: "other-player",
        body: "forjado",
      }),
    ).rejects.toThrow("private_message_sender_invalid");
    expect(forged.calls).toHaveLength(0);
  });

  it("lista a thread pelo par exato e threads somente do Mestre autenticado", async () => {
    const sql = new RecordingSql();
    sql.responses = [[message]];
    await expect(listPrivateMessages(sql, "player-1", "master-1")).resolves.toEqual([message]);
    expect(sql.calls[0]?.statement).toContain("player_user_id=$1 AND master_user_id=$2");
    const threads = new RecordingSql();
    threads.responses = [
      [
        {
          player_user_id: "player-1",
          player_name: "Player",
          unread_count: 1,
          last_message_at: message.created_at,
        },
      ],
    ];
    await expect(listThreadsForMaster(threads, "master-1")).resolves.toMatchObject([
      { player_user_id: "player-1", unread_count: 1 },
    ]);
    expect(threads.calls[0]?.statement).toContain("x.master_user_id=$1");
  });

  it("mantém a direção de read_at e não marca mensagem própria como unread", async () => {
    const unread = new RecordingSql();
    unread.responses = [[{ count: 2 }]];
    await expect(getUnreadCount(unread, "player-1", "master-1", "player-1")).resolves.toBe(2);
    expect(unread.calls[0]?.parameters).toEqual(["player-1", "master-1", "master-1"]);
    const readByMaster = new RecordingSql();
    readByMaster.responses = [[{ id: "message-1" }]];
    await expect(
      markPrivateMessagesRead(readByMaster, "player-1", "master-1", "master-1"),
    ).resolves.toBe(1);
    expect(readByMaster.calls[0]?.parameters).toEqual(["player-1", "master-1", "player-1"]);
    await expect(
      getUnreadCount(new RecordingSql(), "player-1", "master-1", "other-master"),
    ).rejects.toThrow("private_message_reader_invalid");
  });
  it("REGIME_IN_SYSTEM_CONTEXT mantém semântica operacional e não psicologiza", () => {
    const context = renderPresenceRegimeContext("yellow");
    expect(context).toContain("Regime atual: YELLOW");
    expect(context).toContain("reduzir intensidade, iniciativa e frequência");
    expect(context).toContain("não é humor, diagnóstico");
    expect(context).not.toContain("presence_messages");
  });
});
