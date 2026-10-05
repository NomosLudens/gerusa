import { describe, expect, it } from "vitest";
import {
  RULE_SOURCE_ID,
  RULE_SOURCE_VERSION,
  renderCanonicalRuleContext,
  retrieveCanonicalCharacterCatalog,
  retrieveCanonicalCreationSections,
  retrieveCanonicalSectionByHeading,
  retrieveCanonicalRules,
  resolveCanonicalLocks,
} from "./canonical-rules.server";
import { CHARACTER_OFFICES, CHARACTER_PEOPLES } from "@/server/characters/character-canon";

describe("canonical rules retrieval", () => {
  it("retrieves Predominância from the frozen Markdown source with provenance", () => {
    const result = renderCanonicalRuleContext("Como funciona Predominância?");
    expect(result).toContain("Predominância");
    expect(result).toContain(`RULE_SOURCE_ID=${RULE_SOURCE_ID}`);
    expect(result).toContain(`RULE_SOURCE_VERSION=${RULE_SOURCE_VERSION}`);
    expect(result).toContain("RULE_SOURCE_HASH=");
    expect(result).toContain("RULE_SECTION=6. Predominância");
  });

  it("retrieves Fluxo and Merge from their own sections", () => {
    expect(renderCanonicalRuleContext("Explique Fluxo")).toContain("RULE_SECTION=Fluxo");
    expect(renderCanonicalRuleContext("O que é Merge?")).toContain("RULE_SECTION=Merge");
  });

  it("does not invent context for an unknown term", () => {
    expect(retrieveCanonicalRules("O que significa BATATÃO?")).toEqual([]);
    expect(renderCanonicalRuleContext("O que significa BATATÃO?")).toBe("");
  });

  it("retrieves the canonical operational contracts for movement, companions and refuge", () => {
    expect(renderCanonicalRuleContext("Como funciona o Movimento em grade?")).toContain(
      "RULE_SECTION=54. Movimento e ocupação",
    );
    expect(renderCanonicalRuleContext("O que um pet pode fazer?")).toContain(
      "RULE_SECTION=Montarias e pets",
    );
    expect(renderCanonicalRuleContext("Como funciona o Refúgio?")).toContain(
      "RULE_SECTION=Refúgio",
    );
    expect(renderCanonicalRuleContext("Quando um não-Tecelão pode adquirir magia?")).toContain(
      "RULE_SECTION=Aquisição e repertório de Magias",
    );
  });

  it("retrieves a named LOCK by identifier even inside a longer question", () => {
    const query =
      "SMOKE DE RETESTE: qual é o valor-base de Movimento normal na grade segundo LOCK-13?";
    const result = retrieveCanonicalRules(query);

    expect(result.some((rule) => rule.section === "LOCK-13 — Economia de turno e movimento")).toBe(
      true,
    );
    expect(renderCanonicalRuleContext(query)).toContain("Na grade, Movimento normal é 6");
  });

  it("resolves every explicitly requested LOCK in order", () => {
    const resolved = resolveCanonicalLocks("Compare LOCK-07 with LOCK-19 and LOCK-07");
    expect(resolved?.map(({ identifier, rule }) => [identifier, rule?.section])).toEqual([
      ["LOCK-07", "LOCK-07 — Povos"],
      ["LOCK-19", "LOCK-19 — Povos e ficção"],
    ]);
  });

  it("recupera a seção exata de cada Povo e cada Ofício do cânone", () => {
    for (const people of CHARACTER_PEOPLES) {
      expect(
        retrieveCanonicalRules(`Explique a regra canônica do Povo ${people}`).some((rule) =>
          rule.searchHeadings?.includes(people),
        ),
      ).toBe(true);
    }
    for (const office of CHARACTER_OFFICES) {
      expect(
        retrieveCanonicalRules(`Explique a regra canônica do Ofício ${office}`).some((rule) =>
          rule.searchHeadings?.includes(office),
        ),
      ).toBe(true);
    }
  }, 20_000);

  it("lista os catálogos diretamente dos títulos canônicos sem misturar categorias", () => {
    const catalog = retrieveCanonicalCharacterCatalog(
      "Liste os nove Povos e os nove Ofícios do cânone KALLISTIS",
    );
    expect(catalog).toEqual([
      { section: "PARTE II — POVOS", label: "PARTE II — POVOS", entries: [...CHARACTER_PEOPLES] },
      {
        section: "PARTE III — OFÍCIOS",
        label: "PARTE III — OFÍCIOS",
        entries: [...CHARACTER_OFFICES],
      },
    ]);
    expect(
      retrieveCanonicalCharacterCatalog(
        "Quantas Perícias o Ofício treina na criação e qual bônus elas recebem?",
      ),
    ).toBeNull();
    expect(retrieveCanonicalSectionByHeading("Regras gerais dos Ofícios")?.text).toContain(
      "Na criação, as duas Perícias do Ofício recebem +1",
    );
  });

  it("recupera somente as seções de criação pedidas, preservando sua ordem", () => {
    const sections = retrieveCanonicalCreationSections(
      "SMOKE de criação: quais são os Atributos iniciais, Perícias iniciais e quantos Vínculos?",
    );
    expect(sections?.map(({ section }) => section)).toEqual([
      "17. Atributos iniciais",
      "18. Perícias iniciais",
      "19. Vínculos",
    ]);
    expect(sections?.[0].text).toContain("3, 2, 2, 1, 1 e 0");
    expect(sections?.[1].text).toContain(
      "uma perícia em 3, três perícias em 2 e quatro perícias em 1",
    );
    expect(sections?.[2].text).toContain("Crie três Vínculos");
  });
});
