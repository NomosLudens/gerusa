import { describe, expect, it } from "vitest";
import {
  lerContextoVivo,
  renderContextoVivoBlock,
  type ContextoVivo,
} from "./contexto-vivo.server";

function queryResult(data: unknown, count?: number) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    lte: () => chain,
    gte: () => chain,
    order: () => chain,
    in: () => chain,
    limit: () => Promise.resolve({ data, count }),
  };
  return chain;
}

describe("contexto vivo da Kallistis", () => {
  it("renderiza Jardim, Registro Vivo, Eventos e Sedimentos sem Drive nem Corpo", () => {
    const ctx: ContextoVivo = {
      jardim: {
        recentes: [{ title: "Memória real", category: "canon", importance: 4 }],
        due_count: 1,
      },
      registro: [{ kind: "nota", body: "Registro mantido", quando: "2026-07-20T00:00:00Z" }],
      eventos_proximos: [{ titulo: "Audiência", inicio: "2026-07-21T10:00:00Z", tipo: "agenda" }],
      sedimentos: [{ nivel: "short_term", resumo: "Padrão em análise", status: "em_revisao" }],
    };

    const block = renderContextoVivoBlock(ctx);

    expect(block).toContain("Jardim");
    expect(block).toContain("Registro Vivo");
    expect(block).toContain("Eventos próximos");
    expect(block).toContain("hipótese revisável");
    expect(block).toContain("não são memória confirmada");
    expect(block).not.toContain("Drive");
    expect(block).not.toContain("Corpo");
  });

  it("retorna vazio quando nenhuma superfície trouxe contexto real", () => {
    const ctx: ContextoVivo = {
      jardim: {
        recentes: [],
        due_count: 0,
      },
      registro: [],
      eventos_proximos: [],
      sedimentos: [],
    };

    expect(renderContextoVivoBlock(ctx)).toBe("");
  });

  it("não consulta tabelas de Drive nem Corpo ao montar o contexto ativo", async () => {
    const tables: string[] = [];
    const sb = {
      from(table: string) {
        tables.push(table);
        if (table === "jardim_memorias") return queryResult([], 0);
        return queryResult([]);
      },
    };

    await lerContextoVivo(sb as never, "user-1");

    expect(tables).toEqual(
      expect.arrayContaining(["jardim_memorias", "registro_vivo", "eventos", "sedimentos"]),
    );
    expect(tables).not.toContain("drive_vehicles");
    expect(tables).not.toContain("drive_refuels");
    expect(tables).not.toContain("drive_oil_changes");
    expect(tables).not.toContain("drive_expenses");
    expect(tables).not.toContain("corpo_sinais");
  });
});
