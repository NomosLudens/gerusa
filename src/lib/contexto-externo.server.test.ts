import { describe, expect, it } from "vitest";
import {
  lerContextosAtivos,
  renderConfirmedIdentityBlock,
  renderRelationalMemoryBlock,
} from "./contexto-externo.server";

const rows = [
  { titulo: "Semente", conteudo: "IDENTIDADE-CONFIRMADA", tipo: "identidade" as const },
  { titulo: "Legado", conteudo: "IDENTIDADE-SEM-TIPO" },
  { titulo: "Relação", conteudo: "MEMÓRIA-CONFIRMADA", tipo: "memoria_relacional" as const },
];

describe("contexto externo confirmado", () => {
  it("separa identidade constitutiva e memória relacional", () => {
    const identity = renderConfirmedIdentityBlock(rows);
    const relational = renderRelationalMemoryBlock(rows);

    expect(identity).toContain("IDENTIDADE CONSTITUTIVA CONFIRMADA");
    expect(identity).toContain("IDENTIDADE-CONFIRMADA");
    expect(identity).toContain("IDENTIDADE-SEM-TIPO");
    expect(identity).not.toContain("MEMÓRIA-CONFIRMADA");
    expect(relational).toContain("MEMÓRIA RELACIONAL CONFIRMADA");
    expect(relational).toContain("MEMÓRIA-CONFIRMADA");
    expect(relational).not.toContain("IDENTIDADE-CONFIRMADA");
    expect(relational).not.toContain("IDENTIDADE-SEM-TIPO");
  });

  it("mantém o limite de tamanho dos documentos", () => {
    const huge = "x".repeat(8_500);
    const rendered = renderConfirmedIdentityBlock([{ titulo: "Grande", conteudo: huge }]);

    expect(rendered).toContain("…[truncado]");
    expect(rendered.length).toBeLessThan(24_000);
  });

  it("preserva o erro quando o PostgreSQL local não está configurado", async () => {
    const previous = process.env.KALLISTIS_DATABASE_URL;
    delete process.env.KALLISTIS_DATABASE_URL;
    try {
      await expect(lerContextosAtivos(null, "u")).rejects.toThrow("confirmed_identity_unavailable");
    } finally {
      if (previous === undefined) delete process.env.KALLISTIS_DATABASE_URL;
      else process.env.KALLISTIS_DATABASE_URL = previous;
    }
  });

  it("mantém o limite global e ignora tipos desconhecidos", () => {
    const rows = [
      { titulo: "Desconhecido", conteudo: "NÃO-DEVE-ENTRAR", tipo: "outro" as never },
      ...Array.from({ length: 4 }, (_, index) => ({
        titulo: "Grande " + index,
        conteudo: "x".repeat(8_000),
      })),
    ];

    const rendered = renderConfirmedIdentityBlock(rows);

    expect(rendered).toContain("--- Grande 0 ---");
    expect(rendered).not.toContain("--- Grande 2 ---");
    expect(rendered).not.toContain("NÃO-DEVE-ENTRAR");
  });

  it("não cria bloco para zero contextos", () => {
    expect(renderConfirmedIdentityBlock([])).toBe("");
    expect(renderRelationalMemoryBlock([])).toBe("");
  });
});
