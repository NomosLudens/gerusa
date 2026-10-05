import { describe, expect, it, vi } from "vitest";
import {
  applyExplicitCharacterChoice,
  detectExplicitCharacterChoices,
  buildCharacterDraft,
  detectExplicitCharacterChoice,
  getCharacterCreationState,
  answerCharacterCreation,
} from "./chat-creation";
import { SKILL_NAMES, validateCharacterSnapshot } from "./character-canon";

function completeContractDraft(povo: string, oficio: string, origem: string) {
  const draft = buildCharacterDraft("Elara", povo, oficio, "", "Tonyus");
  const trail = (draft.trilhas as unknown[])[0] as Record<string, unknown>;
  const skillValues = [3, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
  const periciasBase = Object.fromEntries(
    SKILL_NAMES.map((skill, index) => [skill, skillValues[index]]),
  );
  draft.heranca =
    {
      Aelvari: "Cronista",
      Draken: "Soberania",
      Nomos: "Reparador",
      Livres: "Múltiplos Caminhos",
      Teriantes: "Caçador",
      Vitrálios: "Lapidador de Si",
    }[povo] ?? "Cronista";
  draft.origem = origem;
  draft.conceito = { identidade: "guardiã", objetivo: "lembrar", perda: "silêncio" };
  draft.atributosBase = {
    Corpo: 3,
    Agilidade: 2,
    Intelecto: 2,
    Presença: 1,
    Vontade: 1,
    Sintonia: 0,
  };
  draft.periciasBase = periciasBase;
  draft.periciasProveniencia = Object.fromEntries(
    SKILL_NAMES.map((skill) => [skill, { base: periciasBase[skill], bonus: 0, fontes: [] }]),
  );
  draft.equipamento = {
    arma: "Espada",
    armadura: "Roupas reforçadas",
    ferramenta: "Equipamento de escalada",
    consumiveis: ["Tônico de Vitalidade", "Sal de Memória"],
    extras: [],
    proficienciaConfirmada: true,
  };
  draft.vinculos = ["A", "B", "C"];
  draft.promessa = "voltar";
  draft.ferida = "perder";
  draft.pergunta = "quem sou?";
  trail.papel = "Bastião";
  trail.chave = "Escudo de Juramento";
  trail.chaveNome = "Escudo";
  trail.pericias = oficio === "Evocador" ? ["Evocação"] : ["Combate", "Cuidado"];
  trail.pericaEscolhida = oficio === "Evocador" ? "Empatia" : "";
  trail.tecnicas = [oficio === "Evocador" ? "Vínculo Manifesto" : "Interpor"];
  trail.id = "trilha-1";
  trail.especializacoes = [];
  trail.knownForms =
    oficio === "Tecelão"
      ? ["SILMA", "Mão de Pressão", "Véu de Silêncio", "Marca de Frequência"].map((formId) => ({
          formId,
          maxGrade: 0,
        }))
      : [];
  trail.ganhos = {};
  trail.atributosGanhos = {};
  trail.manifestacoesEpicas = [];
  trail.magiaEpica = "";
  trail.legado = "";
  trail.acessoMagia = false;
  trail.advanceAuthorizedFor = null;
  trail.advanceNote = "";
  if (oficio === "Evocador") {
    trail.vinculosEvocados = [
      {
        nome: "Eco",
        porte: "Menor",
        modelo: "Muralha de Ecos",
        forma: "Guardião",
        ancora: "voz",
        impulso: "guardar",
        pacto: "retornar",
        aparencia: "pluma",
        consciencia: "sim",
      },
    ];
  }
  if (povo === "Nomos") draft.escolhasPovo = { modulos: ["Visão ampliada", "Interface de dados"] };
  if (povo === "Draken") draft.escolhasPovo = { afinidade: "Fogo" };
  if (povo === "Vitrálios") draft.escolhasPovo = { frequencia: "Harmônica" };
  if (povo === "Teriantes") {
    draft.escolhasPovo = { aspecto: "Outro Aspecto: teste" };
    draft.aspectoOutro = "Aspecto de teste";
  }
  if (povo === "Livres") {
    draft.pericaLivre = "Investigação";
    draft.tecnicaHeranca = { oficio: "Duelista", nome: "Abertura" };
  }
  if (origem === "Outro") {
    draft.origemBeneficio = "Benefício de teste";
    draft.dividaComunitaria = "Dívida de teste";
  }
  if (origem === "Trocado")
    draft.origemTrocado = { nascimento: "Mundo A", criacao: "Mundo B", descricao: "Ressonância" };
  return draft;
}

describe("criação por Chat", () => {
  it("cria draft parcial sem fingir completude", () => {
    const draft = buildCharacterDraft("Ari", "Livres", "Evocador");
    expect(draft.completo).toBe(false);
    expect(draft.vinculos).toEqual([]);
    expect(draft.promessa).toBe("");
    expect(draft.ferida).toBe("");
    expect(draft.pergunta).toBe("");
  });

  it("não altera o draft diante de uma pergunta", () => {
    const draft = buildCharacterDraft("Ari", "", "Evocador");
    expect(detectExplicitCharacterChoice("quais Povos existem?")).toBeNull();
    expect(draft.povo).toBe("");
  });

  it("aplica Povo somente diante de uma escolha explícita", () => {
    const draft = buildCharacterDraft("Ari", "", "Evocador");
    const choice = detectExplicitCharacterChoice("vou de Nomos");
    expect(choice).toEqual({ field: "povo", value: "Nomos" });
    const next = applyExplicitCharacterChoice(draft, choice!);
    expect(next.povo).toBe("Nomos");
    expect(next.nome).toBe(draft.nome);
    expect(next.trilhas).toEqual(draft.trilhas);
  });

  it("não trata uma sugestão como escolha", () => {
    expect(detectExplicitCharacterChoice("Nomos parece interessante")).toBeNull();
  });

  it("persiste nome somente em declaração explícita e aceita múltiplas escolhas inequívocas", () => {
    expect(detectExplicitCharacterChoice("o nome dela é Elara")).toEqual({
      field: "nome",
      value: "Elara",
    });
    expect(detectExplicitCharacterChoice("Elara parece um nome legal?")).toBeNull();
    expect(detectExplicitCharacterChoice("talvez Elara")).toBeNull();
    expect(detectExplicitCharacterChoices("o nome dela é Elara e vou de Livres")).toEqual([
      { field: "nome", value: "Elara" },
      { field: "povo", value: "Livres" },
    ]);
  });

  it("calcula o próximo campo sem perguntar novamente nome ou jogador", () => {
    const draft = buildCharacterDraft("Elara", "", "", "", "Tonyus");
    const state = getCharacterCreationState(draft);
    expect(state.fields.find((field) => field.key === "nome")?.complete).toBe(true);
    expect(state.fields.find((field) => field.key === "jogador")?.complete).toBe(true);
    expect(
      state.fields
        .filter((field) => field.key.startsWith("periciasBase."))
        .every((field) => field.complete),
    ).toBe(true);
    expect(state.nextField?.key).toBe("conceito.identidade");
  });

  it("fecha todos os campos obrigatórios do Marco 1, inclusive perícias com base zero", () => {
    const draft = buildCharacterDraft("Elara", "Aelvari", "Guardião", "", "Tonyus");
    const trail = (draft.trilhas as unknown[])[0] as Record<string, unknown>;
    draft.heranca = "Cronista";
    draft.origem = "Criado na Luz";
    draft.conceito = { identidade: "guardiã", objetivo: "lembrar", perda: "silêncio" };
    trail.papel = "Bastião";
    trail.chave = "Escudo de Juramento";
    trail.pericias = ["Combate", "Cuidado"];
    trail.tecnicas = ["Interpor"];
    draft.atributosBase = {
      Corpo: 3,
      Agilidade: 2,
      Intelecto: 2,
      Presença: 1,
      Vontade: 1,
      Sintonia: 0,
    };
    const base = Object.fromEntries(SKILL_NAMES.map((skill) => [skill, 0]));
    Object.assign(base, {
      Atletismo: 3,
      Combate: 2,
      Pontaria: 2,
      Furtividade: 2,
      Percepção: 1,
      Sobrevivência: 1,
      Investigação: 1,
    });
    draft.periciasBase = base;
    draft.periciasProveniencia = Object.fromEntries(
      SKILL_NAMES.map((skill) => [skill, { base: base[skill], bonus: 0, fontes: [] }]),
    );
    draft.equipamento = {
      arma: "Espada",
      armadura: "Média",
      ferramenta: "Equipamento de escalada",
      consumiveis: ["Tônico de Vitalidade", "Sal de Memória"],
      extras: [],
      proficienciaConfirmada: true,
    };
    draft.vinculos = ["A", "B", "C"];
    draft.promessa = "voltar";
    draft.ferida = "perder";
    draft.pergunta = "quem sou?";
    const state = getCharacterCreationState(draft);
    expect(state.complete).toBe(true);
    expect(state.missing).toEqual([]);
  });

  it("mantém a matriz completa de 129 itens nos ramos condicionais do Forge", () => {
    const branchCases = [
      ["Aelvari", "Guardião"],
      ["Draken", "Guardião"],
      ["Nomos", "Guardião"],
      ["Livres", "Guardião"],
      ["Teriantes", "Guardião"],
      ["Vitrálios", "Guardião"],
      ["Aelvari", "Duelista"],
      ["Aelvari", "Evocador"],
      ["Aelvari", "Tecelão"],
    ] as const;
    const states = branchCases.map(([povo, oficio]) => {
      const draft = buildCharacterDraft("Matriz 129", povo, oficio, "", "Jogador");
      const trail = (draft.trilhas as Record<string, unknown>[])[0];
      trail.pericias = ["Combate"];
      trail.vinculosEvocados = [
        {
          nome: "Eco",
          porte: "pequeno",
          modelo: "animal",
          forma: "ave",
          ancora: "voz",
          impulso: "guardar",
          pacto: "sim",
          aparencia: "pluma",
          consciencia: "sim",
        },
      ];
      if (povo === "Nomos")
        draft.escolhasPovo = { modulos: ["Visão ampliada", "Interface de dados"] };
      if (povo === "Draken") draft.escolhasPovo = { afinidade: "Fogo" };
      if (povo === "Vitrálios") draft.escolhasPovo = { frequencia: "Harmônica" };
      if (povo === "Teriantes") {
        draft.escolhasPovo = { aspecto: "Outro Aspecto: teste" };
        draft.aspectoOutro = "Aspecto de teste";
      }
      if (povo === "Livres") {
        draft.heranca = "Múltiplos Caminhos";
        draft.pericaLivre = "Investigação";
        draft.tecnicaHeranca = { nome: "Técnica cruzada" };
      }
      draft.origem = "Outro";
      draft.origemBeneficio = "Benefício de teste";
      draft.dividaComunitaria = "Dívida de teste";
      if (povo === "Draken" && oficio === "Guardião") {
        draft.origem = "Trocado";
        draft.origemTrocado = {
          nascimento: "Mundo A",
          criacao: "Mundo B",
          descricao: "Ressonância",
        };
      }
      return getCharacterCreationState(draft);
    });
    const keys = new Set(states.flatMap((state) => state.fields.map((field) => field.key)));
    // The previous report used 129. The real conditional Forge contract has
    // one additional required item: Teriantes with "Outro Aspecto" requires
    // `aspectoOutro`.
    expect(keys.size).toBe(130);
    expect(
      new Set(
        states.flatMap((state) =>
          state.fields.filter((field) => field.required).map((field) => field.key),
        ),
      ).size,
    ).toBe(85);
    expect(
      states
        .flatMap((state) => state.fields)
        .every(
          (field) =>
            field.persistencePath && field.forgeReadback && field.validator && field.testExists,
        ),
    ).toBe(true);
    expect(
      states.flatMap((state) => state.fields).filter((field) => field.required).length,
    ).toBeGreaterThan(0);
  });

  it("exercita correção, ordem livre e resolução determinística da próxima pendência", () => {
    let draft = buildCharacterDraft("Antes", "Aelvari", "Guardião", "", "Jogador");
    draft = applyExplicitCharacterChoice(draft, { field: "oficio", value: "Evocador" });
    draft = applyExplicitCharacterChoice(draft, { field: "povo", value: "Nomos" });
    draft = applyExplicitCharacterChoice(draft, { field: "nome", value: "Depois" });
    expect(draft).toMatchObject({
      nome: "Depois",
      povo: "Nomos",
      trilhas: [{ oficio: "Evocador" }],
    });
    const state = getCharacterCreationState(draft);
    expect(state.nextField?.key).toBe("conceito.identidade");
    expect(state.fields.find((field) => field.key === "nome")?.complete).toBe(true);
    expect(state.fields.find((field) => field.key === "povo")?.complete).toBe(true);
    expect(state.fields.find((field) => field.key === "trilhas[0].oficio")?.complete).toBe(true);
  });

  it("fecha a matriz obrigatória em todos os ramos condicionais do contrato", () => {
    const cases = [
      ["Aelvari", "Guardião", "Criado na Luz"],
      ["Nomos", "Guardião", "Criado na Luz"],
      ["Draken", "Guardião", "Criado na Luz"],
      ["Vitrálios", "Guardião", "Criado na Luz"],
      ["Teriantes", "Guardião", "Criado na Luz"],
      ["Livres", "Guardião", "Criado na Luz"],
      ["Aelvari", "Tecelão", "Trocado"],
      ["Aelvari", "Evocador", "Outro"],
    ] as const;
    for (const [povo, oficio, origem] of cases) {
      const draft = completeContractDraft(povo, oficio, origem);
      const state = getCharacterCreationState(draft);
      expect(state.missing, `${povo}/${oficio}/${origem}`).toEqual([]);
      expect(
        state.fields
          .filter((field) => field.required)
          .every(
            (field) =>
              field.persistencePath && field.forgeReadback && field.validator && field.testExists,
          ),
      ).toBe(true);
    }
  });

  it("mantém cada dependência obrigatória visível e rejeita snapshot incompleto", () => {
    const cases = [
      ["Nomos", "escolhasPovo.modulos", "people_branch"],
      ["Draken", "escolhasPovo.afinidade", "people_branch"],
      ["Vitrálios", "escolhasPovo.frequencia", "people_branch"],
      ["Teriantes", "escolhasPovo.aspecto", "people_branch"],
      ["Livres", "pericaLivre", "people_branch"],
    ] as const;
    for (const [povo, key] of cases) {
      const draft = completeContractDraft(povo, "Guardião", "Criado na Luz");
      const choices = draft.escolhasPovo as Record<string, unknown>;
      if (key === "pericaLivre") draft.pericaLivre = "";
      else if (key === "escolhasPovo.modulos") choices.modulos = [];
      else delete choices[key.split(".")[1]];
      const state = getCharacterCreationState(draft);
      expect(
        state.missing.map((field) => field.key),
        `${povo}/${key}`,
      ).toContain(key);
      expect(validateCharacterSnapshot({ ...draft, completo: true }, true).ok).toBe(false);
    }
  });

  it("não trata opcionais, metadados derivados ou perguntas como bloqueadores", () => {
    const draft = completeContractDraft("Aelvari", "Guardião", "Criado na Luz");
    const state = getCharacterCreationState(draft);
    expect(state.complete).toBe(true);
    expect(state.fields.filter((field) => field.optional).every((field) => !field.required)).toBe(
      true,
    );
    expect(
      state.fields.filter((field) => field.derived).every((field) => !field.chatCanWrite),
    ).toBe(true);
    expect(
      detectExplicitCharacterChoices("Nomos parece uma boa ideia para esse conceito?"),
    ).toEqual([]);
  });

  it("não aceita valor canônico inválido nem grava o draft", async () => {
    const save = vi.fn();
    const runtime = {
      characters: { list: vi.fn(async () => []), create: vi.fn(), save },
    } as any;
    const result = await answerCharacterCreation({
      runtime,
      userId: "user-1",
      turns: [
        { role: "user", content: "quero criar personagem" },
        { role: "user", content: "o nome dela é Teste" },
        { role: "user", content: "vou de Elfo" },
      ],
    });
    expect(result).toContain("não existe no cânone local");
    expect(save).not.toHaveBeenCalled();
  });
});
