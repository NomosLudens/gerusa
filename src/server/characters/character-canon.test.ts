import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CHARACTER_OFFICES,
  CHARACTER_PEOPLES,
  CHARACTER_RULESET,
  attributeCapForMarco,
  epicHorizonForMarco,
  epicMagicTierForMarco,
  mechanicalFingerprint,
  progressionComplete,
  tecelaoMagicDeficit,
  tecelaoMagicTotals,
  validateMagicChoices,
  validateCharacterSnapshot,
} from "./character-canon";
import { projectKallistisCharacter } from "./presentation";
import { buildCharacterContext } from "./context";

const magicByGrade = {
  0: [
    "Centelha Orientada",
    "Mão de Pressão",
    "Véu de Silêncio",
    "Marca de Frequência",
    "Selo Transitório",
    "Sopro Elemental",
  ],
  1: [
    "Lança Elemental",
    "Barreira Manifestada",
    "Passo Velado",
    "Pulso Restaurador",
    "Eco de Memória",
    "Trava de Juramento",
    "Voz Harmônica",
    "Selo de Reparo",
  ],
  2: [
    "Tempestade Local",
    "Círculo de Repouso",
    "Ponte Breve",
    "Dissolver Forma",
    "Memória Compartilhada",
    "Prisma Defletor",
  ],
  3: [
    "Horizonte Partilhado",
    "Prisão de Forma",
    "Travessia Fratal",
    "Restauração de Nome",
    "Cataclismo Contido",
    "Pacto Vivo",
  ],
} as const;

describe("catálogos de personagem contra o Forge e o cânone", () => {
  it("mantém os nove Povos e os nove Ofícios nas categorias corretas", () => {
    const forge = readFileSync(resolve(process.cwd(), "public/jogar/character-forge.html"), "utf8");
    const canon = readFileSync(
      resolve(process.cwd(), "CANON/KALLISTIS_REGRAS_CANONICAS_COMPLETAS.md"),
      "utf8",
    );
    const peopleStart = forge.indexOf("povos: [");
    const officesStart = forge.indexOf("oficios: [");
    const nextCatalogStart = forge.indexOf("magias: [", officesStart);
    const forgePeoples = [
      ...forge.slice(peopleStart, officesStart).matchAll(/^ {12}nome: "([^"]+)"/gm),
    ].map((match) => match[1]);
    const forgeOffices = [
      ...forge.slice(officesStart, nextCatalogStart).matchAll(/^ {12}nome: "([^"]+)"/gm),
    ].map((match) => match[1]);
    const canonHeadings = new Set([...canon.matchAll(/^## (.+)$/gm)].map((match) => match[1]));

    expect(forgePeoples).toEqual([...CHARACTER_PEOPLES]);
    expect(forgeOffices).toEqual([...CHARACTER_OFFICES]);
    expect(CHARACTER_PEOPLES).toHaveLength(9);
    expect(CHARACTER_OFFICES).toHaveLength(9);
    for (const people of CHARACTER_PEOPLES) expect(canonHeadings).toContain(people);
    for (const office of CHARACTER_OFFICES) expect(canonHeadings).toContain(office);
    expect(
      CHARACTER_PEOPLES.filter((value) => (CHARACTER_OFFICES as readonly string[]).includes(value))
        .length,
    ).toBe(0);
  });
});

function provenance(
  base: Record<string, number>,
  bonuses: Record<string, { bonus: number; fontes: string[] }> = {},
) {
  return Object.fromEntries(
    Object.entries(base).map(([skill, value]) => [
      skill,
      {
        base: value,
        bonus: bonuses[skill]?.bonus ?? 0,
        fontes: bonuses[skill]?.fontes ?? [],
      },
    ]),
  );
}

function snapshot(marco = 1, ganhos: Record<string, unknown> = {}) {
  const periciasBase = {
    Atletismo: 3,
    Combate: 2,
    Pontaria: 2,
    Furtividade: 2,
    Percepção: 1,
    Sobrevivência: 1,
    Investigação: 1,
    Conhecimento: 1,
    Ofício: 0,
    Influência: 0,
    Empatia: 0,
    Cuidado: 0,
    Magia: 0,
    Evocação: 0,
    Velarim: 0,
  };
  return {
    nome: "Ari do Limiar",
    jogador: "Jogador de teste",
    completo: true,
    ruleset: CHARACTER_RULESET,
    povo: "Aelvari",
    heranca: "Cronista",
    origem: "Criado na Luz",
    conceito: { identidade: "guardião", objetivo: "lembrar", perda: "silêncio" },
    tecnicaHeranca: null,
    trilhas: [
      {
        id: "trail-1",
        oficio: "Guardião",
        marco,
        papel: "Bastião",
        chave: "Escudo de Juramento",
        tecnicas: ["Interpor"],
        especializacoes: [],
        pericias: ["Combate", "Cuidado"],
        pericaEscolhida: "",
        ganhos,
        atributosGanhos: {},
        vinculosEvocados: [],
      },
    ],
    trilhaAtiva: 0,
    atributosBase: { Corpo: 3, Agilidade: 2, Intelecto: 2, Presença: 1, Vontade: 1, Sintonia: 0 },
    periciasBase,
    periciasProveniencia: provenance(periciasBase, {
      Combate: { bonus: 1, fontes: ["Ofício: Guardião"] },
      Cuidado: { bonus: 1, fontes: ["Ofício: Guardião"] },
      Conhecimento: { bonus: 1, fontes: ["Herança: Cronista"] },
    }),
    equipamento: {
      arma: "Espada",
      armadura: "Média",
      ferramenta: "Equipamento de escalada",
      consumiveis: ["Tônico de Vitalidade", "Sal de Memória"],
      extras: [],
      proficienciaConfirmada: true,
    },
    vinculos: ["A", "B", "C"],
    promessa: "voltar",
    ferida: "perder",
    pergunta: "quem sou?",
  };
}

function evocatorSnapshot() {
  const base = {
    Atletismo: 1,
    Combate: 2,
    Pontaria: 0,
    Furtividade: 0,
    Percepção: 2,
    Sobrevivência: 1,
    Investigação: 0,
    Conhecimento: 1,
    Ofício: 0,
    Influência: 3,
    Empatia: 1,
    Cuidado: 0,
    Magia: 0,
    Evocação: 2,
    Velarim: 0,
  };
  return {
    nome: "Aleksei de teste",
    jogador: "Jogador de teste",
    completo: true,
    ruleset: CHARACTER_RULESET,
    povo: "Livres",
    heranca: "Múltiplos Caminhos",
    pericaLivre: "Combate",
    origem: "Criado na Escuridão",
    conceito: { identidade: "exilado", objetivo: "proteger", perda: "casa" },
    tecnicaHeranca: { oficio: "Duelista", nome: "Abertura" },
    trilhas: [
      {
        id: "trail-evocador",
        oficio: "Evocador",
        marco: 1,
        papel: "Bastião",
        chave: "Chave de Vínculo",
        chaveNome: "Insígnia",
        tecnicas: ["Vínculo Manifesto"],
        especializacoes: [],
        pericias: ["Evocação"],
        pericaEscolhida: "Empatia",
        ganhos: {},
        atributosGanhos: {},
        vinculosEvocados: [
          {
            nome: "Urso de teste",
            porte: "Menor",
            modelo: "Muralha de Ecos",
            forma: "Guardião",
            ancora: "insígnia",
            impulso: "proteger",
            pacto: "retornar",
            aparencia: "presença ursina",
            consciencia: "não resolvida",
          },
        ],
      },
    ],
    trilhaAtiva: 0,
    atributosBase: { Corpo: 2, Agilidade: 1, Intelecto: 0, Presença: 2, Vontade: 1, Sintonia: 3 },
    periciasBase: base,
    periciasProveniencia: provenance(base, {
      Combate: { bonus: 1, fontes: ["Povo: Livres · Aprendizagem Cruzada"] },
      Empatia: { bonus: 1, fontes: ["Ofício: Evocador"] },
      Evocação: { bonus: 1, fontes: ["Ofício: Evocador"] },
    }),
    equipamento: {
      arma: "Lança curta",
      armadura: "Roupas reforçadas",
      ferramenta: "Âncora de Evocação",
      consumiveis: ["Tônico de Vitalidade", "Sal de Memória"],
      extras: [],
      proficienciaConfirmada: true,
    },
    vinculos: ["A", "B", "C"],
    promessa: "voltar",
    ferida: "perder",
    pergunta: "quem sou?",
  };
}

function tecelaoSnapshot(marco: number, magic: string[], ganhos: Record<string, unknown> = {}) {
  const candidate = snapshot(marco, ganhos);
  const trail = candidate.trilhas[0] as Record<string, unknown>;
  trail.oficio = "Tecelão";
  trail.papel = "Artilharia";
  trail.chave = "Bastão de Convergência";
  trail.tecnicas = ["Forma Estável"];
  trail.knownForms = magic.map((formId, index) => ({ formId, maxGrade: index % 2 }));
  return candidate;
}

describe("contrato de criação do Marco 1", () => {
  it("aceita um Evocador M1 completo e sem especialização", () => {
    const candidate = evocatorSnapshot();
    expect(validateCharacterSnapshot(candidate, true)).toMatchObject({ ok: true, errors: [] });
  });

  it("exige segunda perícia e vínculo evocado do Evocador", () => {
    const noSkill = evocatorSnapshot();
    (noSkill.trilhas[0] as Record<string, unknown>).pericaEscolhida = "";
    expect(validateCharacterSnapshot(noSkill, true).errors).toContain(
      "office_second_skill_required",
    );
    const noEvocation = evocatorSnapshot();
    (noEvocation.trilhas[0] as Record<string, unknown>).vinculosEvocados = [];
    expect(validateCharacterSnapshot(noEvocation, true).errors).toContain("evocation_required");
  });

  it("não exige especialização no M1 e bloqueia arma incompatível", () => {
    const candidate = evocatorSnapshot();
    expect(validateCharacterSnapshot(candidate, true).errors).not.toContain(
      "specialization_required",
    );
    candidate.equipamento.arma = "Machado";
    expect(validateCharacterSnapshot(candidate, true).errors).toContain(
      "equipment_weapon_proficiency_invalid",
    );
  });

  it("aceita perícia de Ofício já no valor 3 sem inventar bônus acima do limite", () => {
    const candidate = snapshot();
    candidate.periciasBase.Atletismo = 2;
    candidate.periciasBase.Combate = 3;
    candidate.periciasProveniencia = provenance(candidate.periciasBase, {
      Combate: { bonus: 0, fontes: ["Ofício: Guardião"] },
      Cuidado: { bonus: 1, fontes: ["Ofício: Guardião"] },
      Conhecimento: { bonus: 1, fontes: ["Herança: Cronista"] },
    });
    expect(validateCharacterSnapshot(candidate, true)).toMatchObject({ ok: true, errors: [] });
  });
});

describe("KALLISTIS Forge canon", () => {
  it("accepts a complete snapshot from the real Forge catalog", () => {
    const result = validateCharacterSnapshot(snapshot());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an unknown office and preserves the ruleset warning boundary", () => {
    const candidate = snapshot();
    candidate.trilhas[0].oficio = "Mago";
    (candidate as Record<string, unknown>).ruleset = "inventado";
    const result = validateCharacterSnapshot(candidate);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("office_invalid_0");
    expect(result.warnings).toContain("ruleset_differs");
  });

  it("requires the canonical gain for each next marco", () => {
    expect(progressionComplete(snapshot(2), 2)).toBe(false);
    expect(progressionComplete(snapshot(2, { m2: { tecnica: "Interpor" } }), 2)).toBe(true);
  });

  it("fingerprints equivalent snapshots deterministically", () => {
    const a = snapshot();
    const b = structuredClone(a);
    expect(mechanicalFingerprint(a)).toBe(mechanicalFingerprint(b));
  });

  it("persists personal manifestation data without changing mechanical authority", () => {
    const candidate = snapshot() as ReturnType<typeof snapshot> & Record<string, unknown>;
    candidate.manifestacao_pessoal = "Cristais hexagonais acompanham cada gesto.";
    candidate.fulgor = 5;
    candidate.capacidade_manifestacoes = {
      "technique:guardiao.interpor": "Uma rachadura de luz surge entre o golpe e o aliado.",
      "technique:heritage.duelista.abertura": "A lâmina herdada vibra antes do primeiro passo.",
      "magic:SILMA": "A luz se organiza em círculos silenciosos.",
      "ability:memoria-estratificada": "As lembranças aparecem como fragmentos sobre a pele.",
    };
    (candidate as Record<string, unknown>).tecnicaHeranca = {
      oficio: "Duelista",
      nome: "Abertura",
    };
    (candidate.trilhas[0] as Record<string, unknown>).knownForms = [
      { formId: "SILMA", maxGrade: 1 },
    ];
    const projection = projectKallistisCharacter(candidate);
    expect(projection.manifestacao_pessoal).toContain("Cristais");
    expect(projection.fulgor_current).toBe(5);
    expect(projection.fulgor_max).toBe(5);
    expect(
      projection.capabilities.find((item) => item.id === "guardiao.interpor")
        ?.character_manifestation_description,
    ).toContain("rachadura");
    expect(
      projection.capabilities.find((item) => item.id === "heritage.duelista.abertura")
        ?.character_manifestation_description,
    ).toContain("lâmina herdada");
    expect(projection.capabilities.find((item) => item.id === "SILMA")?.type).toBe("magic");
    expect(projection.capabilities.find((item) => item.id === "memoria-estratificada")?.type).toBe(
      "ability",
    );
    const withoutPresentation = structuredClone(candidate);
    delete withoutPresentation.manifestacao_pessoal;
    delete withoutPresentation.fulgor;
    delete withoutPresentation.capacidade_manifestacoes;
    expect(mechanicalFingerprint(candidate)).toBe(mechanicalFingerprint(withoutPresentation));
    expect(validateCharacterSnapshot({ ...candidate, fulgor: 6 }, false).errors).toContain(
      "fulgor_invalid",
    );
  });

  it("feeds current personal descriptions to the creation Chat without changing canon", () => {
    const candidate = snapshot() as ReturnType<typeof snapshot> & Record<string, unknown>;
    candidate.manifestacao_pessoal = "A presença chega antes do corpo.";
    candidate.fulgor = 2;
    candidate.capacidade_manifestacoes = {
      "technique:guardiao.interpor": "A proteção nasce como um arco de vidro.",
    };
    const context = buildCharacterContext({
      name: String(candidate.nome),
      playerName: String(candidate.jogador),
      status: "draft",
      version: 1,
      snapshot: candidate,
    } as never);
    expect(context).toContain("A presença chega antes do corpo.");
    expect(context).toContain("A proteção nasce como um arco de vidro.");
    expect(context).toContain("Regra canônica:");
    expect(context).toContain("Não substituem nem alteram a regra canônica");
  });

  it("keeps the same canonical technique while personal descriptions differ per character", () => {
    const first = snapshot() as ReturnType<typeof snapshot> & Record<string, unknown>;
    const second = snapshot() as ReturnType<typeof snapshot> & Record<string, unknown>;
    first.capacidade_manifestacoes = { "technique:guardiao.interpor": "Luz azul." };
    second.capacidade_manifestacoes = {
      "technique:guardiao.interpor": "Um sino grave e poeira de cristal.",
    };
    const a = projectKallistisCharacter(first).capabilities.find(
      (item) => item.id === "guardiao.interpor",
    );
    const b = projectKallistisCharacter(second).capabilities.find(
      (item) => item.id === "guardiao.interpor",
    );
    expect(a?.canonical_definition).toEqual(b?.canonical_definition);
    expect(a?.character_manifestation_description).not.toBe(b?.character_manifestation_description);
  });

  it("uses cumulative canonical Formas and rejects legacy nominal spells", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(tecelaoMagicTotals)).toEqual([
      4, 6, 8, 10, 12, 14, 16, 18, 20,
    ]);
    const legacy = tecelaoSnapshot(1, []);
    (legacy.trilhas[0] as Record<string, unknown>).magias = ["Centelha Orientada"];
    delete (legacy.trilhas[0] as Record<string, unknown>).knownForms;
    expect(validateMagicChoices(legacy)).toContain("magic_legacy_reconciliation_required");
  });

  it("rejects unknown or malformed canonical Forma records", () => {
    const unknown = tecelaoSnapshot(1, ["SILMA"]);
    (unknown.trilhas[0] as Record<string, unknown>).knownForms = [
      { formId: "FORMA_INEXISTENTE", maxGrade: 1 },
    ];
    expect(validateMagicChoices(unknown)).toContain("magic_form_invalid_0");

    const malformed = tecelaoSnapshot(1, ["SILMA"]);
    (malformed.trilhas[0] as Record<string, unknown>).knownForms = [
      { formId: "SILMA", maxGrade: 7 },
    ];
    expect(validateMagicChoices(malformed)).toContain("magic_grade_invalid_0");
  });

  it("defines the epic attribute caps and magic tiers without adding new grades", () => {
    expect([11, 12, 13, 14, 15].map(attributeCapForMarco)).toEqual([6, 7, 8, 9, 10]);
    expect([10, 11, 12, 13, 14, 15].map(epicMagicTierForMarco)).toEqual([
      null,
      "I",
      "I",
      "II",
      "II",
      "III",
    ]);
    expect(tecelaoMagicTotals(15)).toBe(22);
  });

  it("accepts a complete approved M11 epic proposal and rejects cap overflow", () => {
    const candidate = snapshot(11, {
      m11: { tipo: "atributo", valor: "Corpo" },
      "m11-manifestacao": { tipo: "manifestacao_epica", valor: "Muralha" },
      "m11-magia-epica": { tipo: "magia_epica", valor: "I" },
    });
    const trail = candidate.trilhas[0] as Record<string, unknown>;
    trail.atributosGanhos = { Corpo: 3 };
    trail.manifestacoesEpicas = [
      {
        nome: "Muralha",
        descricao: "protege a passagem",
        efeito: "interpor",
        custo: "1 Fluxo",
        limitacoes: "uma vez por cena",
        marco: 11,
        oficio: "Guardião",
        horizonte: "CENA",
        tipo: "normal",
        grauMagiaEpica: null,
        statusHomologacao: "HOMOLOGADA",
        mechanicallyActive: true,
        reviewRequired: false,
        masterFeedback: "",
        aprovadaPeloMestre: true,
      },
    ];
    trail.magiaEpica = "I";
    trail.manifestacoesEpicas = [
      {
        nome: "Muralha",
        descricao: "Uma presença que sustenta uma passagem.",
        efeito: "Protege a cena enquanto houver um vínculo reconhecido.",
        custo: "1 Determinação",
        limitacoes: "Não causa dano e não atravessa mundos.",
        marco: 11,
        oficio: "Guardião",
        horizonte: "CENA",
        tipo: "normal",
        grauMagiaEpica: null,
        statusHomologacao: "HOMOLOGADA",
        mechanicallyActive: true,
        reviewRequired: false,
        masterFeedback: "",
        aprovadaPeloMestre: true,
      },
    ];
    expect(validateCharacterSnapshot(candidate).ok).toBe(true);
    expect(progressionComplete(candidate, 11)).toBe(true);

    trail.atributosGanhos = { Corpo: 4 };
    expect(validateCharacterSnapshot(candidate).errors).toContain("attribute_cap_exceeded_Corpo");
  });

  it("derives epic horizons and rejects out-of-band epic grades or horizons", () => {
    expect([11, 12, 13, 14, 15].map(epicHorizonForMarco)).toEqual([
      "CENA",
      "BAIRRO",
      "CIDADE",
      "POVO",
      "MUNDO",
    ]);
    const candidate = snapshot(11);
    const trail = candidate.trilhas[0] as Record<string, unknown>;
    trail.manifestacoesEpicas = [
      {
        nome: "Fenda",
        descricao: "abre",
        efeito: "abre",
        custo: "1 Fluxo",
        limitacoes: "uma vez",
        marco: 11,
        oficio: "Guardião",
        horizonte: "CIDADE",
        tipo: "magia_epica",
        grauMagiaEpica: "II",
        statusHomologacao: "EM_ANALISE",
        mechanicallyActive: false,
      },
    ];
    const errors = validateCharacterSnapshot(candidate, true).errors;
    expect(errors).toContain("epic_manifestation_horizon_invalid_0");
    expect(errors).toContain("epic_manifestation_magic_grade_invalid_0");
  });

  it("rejects Marco 16 as unplayable", () => {
    const candidate = snapshot(16);
    expect(validateCharacterSnapshot(candidate).errors).toContain("marco_invalid_0");
  });
});
