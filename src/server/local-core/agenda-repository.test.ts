import { describe, expect, it } from "vitest";
import { createAgendaRepository, type AgendaEventRecord } from "./postgres-repositories";
import type { SqlExecutor } from "./postgres";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const TARGET = "22222222-2222-4222-8222-222222222222";
const MESA = "33333333-3333-4333-8333-333333333333";

class AgendaSql implements SqlExecutor {
  calls: string[] = [];
  systemMaster = false;
  mesaExists = true;
  mesaMaster = true;
  targetIsPlayer = true;
  inserted = false;

  async query<T extends Record<string, unknown>>(
    statement: string,
    _parameters?: readonly unknown[],
  ) {
    this.calls.push(statement);
    if (statement.includes("system_roles"))
      return (this.systemMaster ? [{ ok: 1 }] : []) as unknown as T[];
    if (statement.includes("FROM public.mesas WHERE id"))
      return (this.mesaExists ? [{ ok: 1 }] : []) as unknown as T[];
    if (statement.includes("member_role='mestre'"))
      return (this.mesaMaster ? [{ ok: 1 }] : []) as unknown as T[];
    if (statement.includes("FROM public.users u JOIN public.mesa_members"))
      return (this.targetIsPlayer ? [{ ok: 1 }] : []) as unknown as T[];
    if (statement.startsWith("INSERT INTO public.agenda_events")) {
      this.inserted = true;
      return [
        {
          id: "44444444-4444-4444-8444-444444444444",
          created_by: ACTOR,
          scope_type: "MESA",
          mesa_id: MESA,
          target_user_id: null,
          titulo: "Evento de teste",
          descricao: null,
          tipo: "evento",
          inicio: "2026-09-08T20:00:00Z",
          fim: null,
          local: null,
          source_type: null,
          source_ref: null,
        },
      ] as unknown as T[];
    }
    return [] as unknown as T[];
  }

  close() {}
  async transaction<T>(fn: (transaction: SqlExecutor) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

const content = {
  titulo: "Evento de teste",
  descricao: null,
  tipo: "evento",
  inicio: "2026-09-08T20:00:00Z",
  fim: null,
  local: null,
  source_type: null,
  source_ref: null,
};

describe("autorização server-side da Agenda multiescopo", () => {
  it("cria PRIVATE do próprio ator e deriva o alvo no servidor", async () => {
    const sql = new AgendaSql();
    const event = await createAgendaRepository(sql).createAgendaEvent(ACTOR, {
      ...content,
      scope_type: "PRIVATE",
      mesa_id: null,
      target_user_id: null,
    });
    expect(sql.inserted).toBe(true);
    expect(sql.calls.at(-1)).toContain("INSERT INTO public.agenda_events");
    expect(event).toBeDefined();
  });

  it("nega GLOBAL para usuário sem papel system_master", async () => {
    const sql = new AgendaSql();
    await expect(
      createAgendaRepository(sql).createAgendaEvent(ACTOR, {
        ...content,
        scope_type: "GLOBAL",
        mesa_id: null,
        target_user_id: null,
      }),
    ).rejects.toThrow("agenda_global_creation_not_authorized");
    expect(sql.inserted).toBe(false);
  });

  it("permite MESA somente com membership de mestre verificada no servidor", async () => {
    const sql = new AgendaSql();
    await createAgendaRepository(sql).createAgendaEvent(ACTOR, {
      ...content,
      scope_type: "MESA",
      mesa_id: MESA,
      target_user_id: null,
    });
    expect(sql.calls.some((call) => call.includes("member_role='mestre'"))).toBe(true);
    expect(sql.inserted).toBe(true);
  });

  it("nega PLAYER quando o alvo não é jogador ativo da Mesa", async () => {
    const sql = new AgendaSql();
    sql.targetIsPlayer = false;
    await expect(
      createAgendaRepository(sql).createAgendaEvent(ACTOR, {
        ...content,
        scope_type: "PLAYER",
        mesa_id: MESA,
        target_user_id: TARGET,
      }),
    ).rejects.toThrow("agenda_player_target_not_authorized");
    expect(sql.inserted).toBe(false);
  });

  it("monta a leitura diretamente com os quatro escopos e memberships", async () => {
    const sql = new AgendaSql();
    await createAgendaRepository(sql).listVisibleAgendaEvents(
      ACTOR,
      "2026-09-01T00:00:00Z",
      "2026-10-01T00:00:00Z",
    );
    const query = sql.calls[0] ?? "";
    expect(query).toContain("e.scope_type = 'GLOBAL'");
    expect(query).toContain("e.scope_type = 'PRIVATE'");
    expect(query).toContain("e.scope_type = 'MESA'");
    expect(query).toContain("e.scope_type = 'PLAYER'");
    expect(query).toContain("membership_status='active'");
    expect(query).toContain("e.target_user_id=$3");
  });
});
