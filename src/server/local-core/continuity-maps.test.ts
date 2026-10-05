import { describe, expect, it } from "vitest";
import { continuityMapAssetPath, renderContinuityMapHtml } from "./continuity-maps";

describe("Mapa da Continuidade", () => {
  it("gera um HTML sem spoiler e escapa conteúdo público", () => {
    const html = renderContinuityMapHtml({
      id: "map-1",
      sessao_id: "session-1",
      mesa_id: "mesa-1",
      mesa_slug: "mesa-real",
      mesa_name: "Mesa <Real>",
      session_title: "Sessão privada",
      tipo: "session",
      asset_key: null,
      titulo: "Próximo passo & retorno",
      conteudo_publico: "A caravana segue. <não publicar>\nSegundo parágrafo.",
      published_at: "2026-09-06T12:00:00Z",
      updated_at: "2026-09-06T12:00:00Z",
    });

    expect(html).toContain("Mapa da Continuidade");
    expect(html).toContain("Próximo passo &amp; retorno");
    expect(html).toContain("A caravana segue. &lt;não publicar&gt;<br />Segundo parágrafo.");
    expect(html).not.toContain("Sessão privada");
    expect(html).not.toContain("transcricao");
    expect(html).not.toContain("analise");
    expect(html).not.toContain("<script");
  });

  it("resolve somente assets HTML versionados e conhecidos", () => {
    const path = continuityMapAssetPath({
      id: "map-2",
      sessao_id: null,
      mesa_id: "mesa-1",
      mesa_slug: "mesa-real",
      mesa_name: "Mesa Real",
      session_title: null,
      tipo: "document",
      asset_key: "intro-taverna-pandas-v5",
      titulo: "Prólogo · Antes da Sessão Zero",
      conteudo_publico: "Introdução pública",
      published_at: "2026-09-06T12:00:00Z",
      updated_at: "2026-09-06T12:00:00Z",
    });

    expect(path).toContain("private/continuity-map-assets/intro-taverna-pandas-v5.html");
  });

  it("resolve uploads somente por uma chave UUID segura", () => {
    const path = continuityMapAssetPath({
      id: "map-3",
      sessao_id: null,
      mesa_id: "mesa-1",
      mesa_slug: "mesa-real",
      mesa_name: "Mesa Real",
      session_title: null,
      tipo: "document",
      asset_key: "123e4567-e89b-42d3-a456-426614174000",
      titulo: "Resumo da sessão",
      conteudo_publico: "HTML enviado pelo Mestre.",
      published_at: "2026-09-06T12:00:00Z",
      updated_at: "2026-09-06T12:00:00Z",
    });

    expect(path).toContain(
      "private/continuity-map-assets/uploads/123e4567-e89b-42d3-a456-426614174000.html",
    );
  });
});
