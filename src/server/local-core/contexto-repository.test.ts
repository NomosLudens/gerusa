import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "./postgres";
import {
  createContexto,
  deleteContexto,
  listActiveContextos,
  listContextos,
  toggleContexto,
} from "./postgres-repositories";

function fakeSql(
  rows: Record<string, unknown>[] = [],
): SqlExecutor & { calls: string[]; params: unknown[][] } {
  const value = {
    calls: [] as string[],
    params: [] as unknown[][],
    async query<T extends Record<string, unknown>>(
      statement: string,
      parameters: readonly unknown[] = [],
    ) {
      value.calls.push(statement);
      value.params.push([...parameters]);
      return rows as T[];
    },
    close() {},
  };
  return value;
}

describe("local contexto repository", () => {
  it("lista por user_id em updated_at DESC", async () => {
    const sql = fakeSql([]);
    await listContextos(sql, "user-a");
    expect(sql.calls[0]).toContain("WHERE ce.user_id = $1");
    expect(sql.calls[0]).toContain("ORDER BY ce.updated_at DESC");
    expect(sql.params).toEqual([["user-a"]]);
  });

  it("cria com ownership e retorna id", async () => {
    const sql = fakeSql([{ id: "context-a" }]);
    await expect(createContexto(sql, "user-a", "T", "C")).resolves.toEqual({ id: "context-a" });
    expect(sql.params).toEqual([["user-a", "T", "C", null, null]]);
    expect(sql.calls[0]).toContain("INSERT INTO public.contexto_externo");
  });

  it("altera ativo somente com id e user_id", async () => {
    const sql = fakeSql([]);
    await toggleContexto(sql, "user-a", "context-a", false);
    expect(sql.calls[0]).toContain("WHERE id = $1 AND user_id = $2");
    expect(sql.params).toEqual([["context-a", "user-a", false]]);
    expect(sql.calls[0]).toContain("updated_at = now()");
  });

  it("exclui somente com id e user_id", async () => {
    const sql = fakeSql([]);
    await deleteContexto(sql, "user-a", "context-a");
    expect(sql.calls[0]).toContain("WHERE id = $1 AND user_id = $2");
    expect(sql.params).toEqual([["context-a", "user-a"]]);
  });

  it("lista somente ativos, limita a dez e preserva shape", async () => {
    const rows = [{ id: "context-a", titulo: "T", conteudo: "C", tipo: "identidade" }];
    const sql = fakeSql(rows);
    await expect(listActiveContextos(sql, "user-a")).resolves.toEqual(rows);
    expect(sql.calls[0]).toContain("ce.user_id = $1");
    expect(sql.calls[0]).toContain("ce.ativo = true");
    expect(sql.calls[0]).toContain("ORDER BY CASE");
    expect(sql.calls[0]).toContain("LIMIT 10");
  });

  it("seleciona global, Mesa e campanha autorizados em ordem estável", async () => {
    const sql = fakeSql([]);
    await listActiveContextos(sql, "user-a", { mesaId: "mesa-a", campaignId: "campaign-a" });
    expect(sql.calls[0]).toContain("ce.mesa_id IS NULL AND ce.campaign_id IS NULL");
    expect(sql.calls[0]).toContain("ce.mesa_id = $2 AND ce.campaign_id IS NULL");
    expect(sql.calls[0]).toContain("ce.campaign_id = $3 AND ce.mesa_id IS NULL");
    expect(sql.calls[0]).toContain("WHEN $3::uuid IS NOT NULL");
    expect(sql.params).toEqual([["user-a", "mesa-a", "campaign-a"]]);
  });

  it("não aceita escopos Mesa e campanha simultâneos na criação", async () => {
    const sql = fakeSql([]);
    await expect(
      createContexto(sql, "user-a", "T", "C", { mesaId: "mesa-a", campaignId: "campaign-a" }),
    ).rejects.toThrow("context_scope_invalid");
    expect(sql.calls).toHaveLength(0);
  });

  it("autoriza mutations pelos predicados de membership", async () => {
    const sql = fakeSql([{ id: "context-a" }]);
    await createContexto(sql, "user-a", "T", "C", { mesaId: "mesa-a", campaignId: null });
    expect(sql.calls[0]).toContain("mm.user_id = $1");
    expect(sql.calls[0]).toContain("mm.mesa_id = $4");
    expect(sql.calls[0]).toContain("mm.membership_status = 'active'");
    expect(sql.params[0]).toEqual(["user-a", "T", "C", "mesa-a", null]);
  });

  it("autoriza contexto de campanha pela campanha e Mesa da membership", async () => {
    const sql = fakeSql([{ id: "context-a" }]);
    await createContexto(sql, "user-a", "T", "C", { mesaId: null, campaignId: "campaign-a" });
    expect(sql.calls[0]).toContain("c.id = $5");
    expect(sql.calls[0]).toContain("JOIN public.mesa_members mm ON mm.mesa_id = c.mesa_id");
    expect(sql.params[0]).toEqual(["user-a", "T", "C", null, "campaign-a"]);
  });

  it("recusa criação de contexto escopado sem membership autorizada", async () => {
    const sql = fakeSql([]);
    await expect(
      createContexto(sql, "user-a", "T", "C", { mesaId: "mesa-other", campaignId: null }),
    ).rejects.toThrow("context_scope_not_authorized");
    await expect(
      createContexto(sql, "user-a", "T", "C", { mesaId: null, campaignId: "campaign-other" }),
    ).rejects.toThrow("context_scope_not_authorized");
  });

  it("mantém isolamento do loader pelo usuário e pela Mesa", async () => {
    const sql = fakeSql([]);
    await listActiveContextos(sql, "user-a", { mesaId: "mesa-a", campaignId: null });
    expect(sql.calls[0]).toContain("ce.user_id = $1");
    expect(sql.calls[0]).toContain("ce.mesa_id = $2");
    expect(sql.params[0]).toEqual(["user-a", "mesa-a", null]);
    expect(sql.params[0]).not.toContain("user-b");
  });

  it("não permite que o id substitua ownership", async () => {
    const sql = fakeSql([]);
    await toggleContexto(sql, "user-b", "context-a", true);
    await deleteContexto(sql, "user-b", "context-a");
    expect(sql.params).toEqual([
      ["context-a", "user-b", true],
      ["context-a", "user-b"],
    ]);
  });
});
