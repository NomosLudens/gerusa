import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  addLiveSessionEvent,
  closeLiveSession,
  getAuthorizedMasterMesa,
  getLiveSessionForMesa,
  listPlayerScenePulse,
  markLiveSessionEventPromoted,
  revealLiveSessionEvent,
  startLiveSession,
  updateLiveSessionSummary,
} from "./mesa-live-session-repository";
import type { SqlExecutor } from "./postgres";

class RecordingSql implements SqlExecutor {
  calls: Array<{ statement: string; parameters: readonly unknown[] | undefined }> = [];
  responses: readonly Record<string, unknown>[][] = [];
  responseIndex = 0;

  async query<T extends Record<string, unknown>>(
    statement: string,
    parameters?: readonly unknown[],
  ): Promise<readonly T[]> {
    this.calls.push({ statement, parameters });
    return (this.responses[this.responseIndex++] ?? []) as readonly T[];
  }

  close() {}
}

const sessionRow = {
  id: "session-1",
  mesa_id: "mesa-1",
  title: "Sessão 02",
  status: "live",
  started_at: "2026-09-13T20:00:00.000Z",
  ended_at: null,
  created_by_user_id: "master-1",
  closed_by_user_id: null,
  summary: null,
  created_at: "2026-09-13T20:00:00.000Z",
  updated_at: "2026-09-13T20:00:00.000Z",
};

const eventRow = {
  id: "event-1",
  session_id: "session-1",
  created_by_user_id: "master-1",
  title: "A porta abriu",
  event_type: "EVENTO",
  public_content: "A porta se abriu.",
  private_notes: "Não revelar o mecanismo ainda.",
  promoted_entry_id: null,
  revealed_at: null,
  revealed_by_user_id: null,
  media_asset_id: null,
  created_at: "2026-09-13T20:01:00.000Z",
};

describe("ledger de Sessão Viva", () => {
  it("autoriza somente system_master ou Mestre ativo da Mesa", async () => {
    const sql = new RecordingSql();
    sql.responses = [[{ id: "mesa-1", slug: "geek-wizards", name: "Geek Wizards" }]];

    await expect(getAuthorizedMasterMesa(sql, "master-1", "mesa-1")).resolves.toEqual({
      id: "mesa-1",
      slug: "geek-wizards",
      name: "Geek Wizards",
    });
    expect(sql.calls[0]?.statement).toContain("member_role='mestre'");
    expect(sql.calls[0]?.statement).toContain("system_master");
    expect(sql.calls[0]?.parameters).toEqual(["mesa-1", "master-1"]);
  });

  it("inicia a sessão com INSERT narrativo e devolve o estado persistido", async () => {
    const sql = new RecordingSql();
    sql.responses = [[sessionRow]];

    await expect(startLiveSession(sql, "mesa-1", "master-1", "Sessão 02")).resolves.toMatchObject({
      id: "session-1",
      mesaId: "mesa-1",
      status: "live",
      title: "Sessão 02",
    });
    expect(sql.calls[0]?.statement).toContain("INSERT INTO public.mesa_live_sessions");
    expect(sql.calls[0]?.parameters).toEqual(["mesa-1", "master-1", "Sessão 02"]);
  });

  it("registra evento somente em sessão live da Mesa e sobrevive ao readback", async () => {
    const sql = new RecordingSql();
    sql.responses = [[eventRow]];

    await expect(
      addLiveSessionEvent(
        sql,
        "mesa-1",
        "session-1",
        "master-1",
        "EVENTO",
        "A porta abriu",
        "A porta se abriu.",
        "Privado",
        null,
      ),
    ).resolves.toMatchObject({
      id: "event-1",
      sessionId: "session-1",
      publicContent: "A porta se abriu.",
    });
    expect(sql.calls[0]?.statement).toContain("s.mesa_id=$2");
    expect(sql.calls[0]?.statement).toContain("s.status='live'");
    expect(sql.calls[0]?.parameters).toEqual([
      "session-1",
      "mesa-1",
      "master-1",
      "EVENTO",
      "A porta abriu",
      "A porta se abriu.",
      "Privado",
      null,
    ]);

    sql.responseIndex = 0;
    sql.responses = [[sessionRow], [eventRow]];
    await expect(getLiveSessionForMesa(sql, "mesa-1")).resolves.toMatchObject({
      id: "session-1",
      events: [{ id: "event-1", publicContent: "A porta se abriu." }],
    });
  });

  it("salva o resumo durante a sessão sem fechá-la", async () => {
    const sql = new RecordingSql();
    sql.responses = [[{ ...sessionRow, summary: "Resumo parcial" }]];

    await expect(
      updateLiveSessionSummary(sql, "mesa-1", "session-1", "Resumo parcial"),
    ).resolves.toMatchObject({
      id: "session-1",
      status: "live",
      summary: "Resumo parcial",
    });
    expect(sql.calls[0]?.statement).toContain("SET summary=$3");
    expect(sql.calls[0]?.parameters).toEqual(["session-1", "mesa-1", "Resumo parcial"]);
  });

  it("revela uma vez, somente enquanto a sessão da Mesa está live", async () => {
    const sql = new RecordingSql();
    sql.responses = [
      [{ ...eventRow, revealed_at: "2026-09-13T20:02:00.000Z", revealed_by_user_id: "master-1" }],
    ];

    await expect(
      revealLiveSessionEvent(sql, "mesa-1", "session-1", "event-1", "master-1"),
    ).resolves.toMatchObject({
      id: "event-1",
      revealedAt: "2026-09-13T20:02:00.000Z",
      revealedByUserId: "master-1",
    });
    expect(sql.calls[0]?.statement).toContain("s.status='live'");
    expect(sql.calls[0]?.statement).toContain("e.revealed_at IS NULL");
    expect(sql.calls[0]?.parameters).toEqual(["event-1", "session-1", "mesa-1", "master-1"]);
  });

  it("entrega ao jogador apenas descobertas reveladas nas Mesas em que ele está ativo", async () => {
    const sql = new RecordingSql();
    sql.responses = [
      [
        {
          session_id: "session-1",
          mesa_id: "mesa-1",
          mesa_name: "Geek Wizards",
          session_title: "Sessão QA",
          event_id: "event-1",
          event_type: "PISTA",
          event_title: "Berta",
          public_content: "A dona do reduto observa vocês.",
          media_asset_id: null,
          revealed_at: "2026-09-13T20:02:00.000Z",
        },
      ],
    ];

    await expect(listPlayerScenePulse(sql, "player-1")).resolves.toEqual([
      {
        id: "session-1",
        mesaId: "mesa-1",
        mesaName: "Geek Wizards",
        title: "Sessão QA",
        status: "live",
        discoveries: [
          {
            id: "event-1",
            eventType: "PISTA",
            title: "Berta",
            publicContent: "A dona do reduto observa vocês.",
            mediaAssetId: null,
            revealedAt: "2026-09-13T20:02:00.000Z",
          },
        ],
      },
    ]);
    expect(sql.calls[0]?.statement).toContain("e.revealed_at IS NOT NULL");
    expect(sql.calls[0]?.statement).toContain("mm.member_role='jogador'");
    expect(sql.calls[0]?.statement).toContain("mm.membership_status='active'");
    expect(sql.calls[0]?.statement).not.toContain("private_notes");
    expect(sql.calls[0]?.parameters).toEqual(["player-1"]);
  });

  it("fecha a sessão, grava ended_at e mantém os eventos no histórico", async () => {
    const sql = new RecordingSql();
    sql.responses = [
      [
        {
          ...sessionRow,
          status: "closed",
          ended_at: "2026-09-13T22:00:00.000Z",
          closed_by_user_id: "master-1",
          summary: "A porta abriu.",
        },
      ],
      [eventRow],
    ];

    await expect(
      closeLiveSession(sql, "mesa-1", "session-1", "master-1", "A porta abriu."),
    ).resolves.toMatchObject({
      status: "closed",
      endedAt: "2026-09-13T22:00:00.000Z",
      events: [{ id: "event-1" }],
    });
    expect(sql.calls[0]?.statement).toContain("status='closed'");
    expect(sql.calls[0]?.statement).toContain("ended_at=now()");
  });

  it("impede promoção duplicada e restringe o marcador à Mesa da sessão", async () => {
    const sql = new RecordingSql();
    sql.responses = [[{ ...eventRow, promoted_entry_id: "entry-1" }]];

    await expect(
      markLiveSessionEventPromoted(sql, "mesa-1", "session-1", "event-1", "entry-1"),
    ).resolves.toMatchObject({
      promotedEntryId: "entry-1",
    });
    expect(sql.calls[0]?.statement).toContain("s.mesa_id=$3");
    expect(sql.calls[0]?.statement).toContain("promoted_entry_id IS NULL");

    sql.responseIndex = 0;
    sql.responses = [[], [{ promoted_entry_id: "entry-1" }]];
    await expect(
      markLiveSessionEventPromoted(sql, "mesa-1", "session-1", "event-1", "entry-2"),
    ).rejects.toThrow("live_event_already_promoted");
  });

  it("declara no banco o máximo de uma sessão live por Mesa", () => {
    const migration = readFileSync(
      new URL("../../../db/migrations/0044_mesa_live_sessions.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toContain(
      "CREATE UNIQUE INDEX IF NOT EXISTS mesa_live_sessions_one_live_per_mesa_idx",
    );
    expect(migration).toContain("WHERE status = 'live'");
    expect(migration).toContain("mesa_live_session_events");
  });

  it("declara os campos mínimos do Pulso no evento existente", () => {
    const migration = readFileSync(
      new URL("../../../db/migrations/0045_live_scene_pulse.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toContain("revealed_at timestamptz");
    expect(migration).toContain("revealed_by_user_id uuid");
    expect(migration).toContain("media_asset_id text");
    expect(migration).not.toContain("CREATE TABLE");
  });
});
