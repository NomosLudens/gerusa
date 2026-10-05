import { MAGIC_FORM_IDS, type KnownForm, magicGradeCap } from "./magic-forms";
import { validateCharacterPresentation } from "./presentation";

// Lista derivada do catálogo canônico 2.0.
// O Forge continua sendo a fonte editorial primária; este catálogo fechado é
// usado apenas para validação server-side, nunca para geração por IA.
// Must stay identical to the frozen ruleset emitted by the public Forge.
export const CHARACTER_RULESET = "KALLISTIS_REGRAS_CANONICAS_2.0" as const;
export const CHARACTER_PEOPLES = [
  "Aelvari",
  "Kragor",
  "Draken",
  "Nomos",
  "Livres",
  "Dóreos",
  "Teriantes",
  "Nimari",
  "Vitrálios",
] as const;
export const CHARACTER_OFFICES = [
  "Guardião",
  "Duelista",
  "Atirador",
  "Tecelão",
  "Curador",
  "Evocador",
  "Artífice",
  "Batedor",
  "Satirista",
] as const;
export const ATTRIBUTE_NAMES = [
  "Corpo",
  "Agilidade",
  "Intelecto",
  "Presença",
  "Vontade",
  "Sintonia",
] as const;
export const SKILL_NAMES = [
  "Atletismo",
  "Combate",
  "Pontaria",
  "Furtividade",
  "Percepção",
  "Sobrevivência",
  "Investigação",
  "Conhecimento",
  "Ofício",
  "Influência",
  "Empatia",
  "Cuidado",
  "Magia",
  "Evocação",
  "Velarim",
] as const;
export const CHARACTER_ORIGINS = [
  "Criado na Luz",
  "Criado na Escuridão",
  "Trocado",
  "Outro",
] as const;

export const PEOPLE_HERITAGES: Readonly<Record<string, readonly string[]>> = {
  Aelvari: ["Cronista", "Vidente Cauteloso"],
  Kragor: ["Escudo do Clã", "Voz da Assembleia"],
  Draken: ["Soberania", "Condutor"],
  Nomos: ["Reparador", "Processador"],
  Livres: ["Comunidade Escolhida", "Múltiplos Caminhos"],
  Dóreos: ["Forjador", "Guardião de Obra"],
  Teriantes: ["Caçador", "Protetor de Bando"],
  Nimari: ["Cartógrafo de Frestas", "Negociador de Risco"],
  Vitrálios: ["Lapidador de Si", "Coro Vitrálio"],
};

type OfficeRule = {
  roles: readonly string[];
  fixedSkills: readonly string[];
  optionalSkills: readonly string[];
  keys: readonly string[];
  initialTechnique: string;
};
const OFFICE_RULES: Readonly<Record<string, OfficeRule>> = {
  Guardião: {
    roles: ["Bastião", "Amparo"],
    fixedSkills: ["Combate", "Cuidado"],
    optionalSkills: [],
    keys: [
      "Escudo de Juramento",
      "Martelo de Vigília",
      "Lança de Interposição",
      "Insígnia de Guarda",
    ],
    initialTechnique: "Interpor",
  },
  Duelista: {
    roles: ["Vanguarda"],
    fixedSkills: ["Combate"],
    optionalSkills: ["Atletismo", "Furtividade"],
    keys: ["Sabre de Fresta", "Florete de Espelho", "Lâmina Ritual", "Par de Lâminas Gêmeas"],
    initialTechnique: "Abertura",
  },
  Atirador: {
    roles: ["Artilharia"],
    fixedSkills: ["Pontaria", "Percepção"],
    optionalSkills: [],
    keys: ["Arco de Quartzo", "Besta de Trilho", "Carabina Nomos", "Foco de Mira"],
    initialTechnique: "Linha Clara",
  },
  Tecelão: {
    roles: ["Artilharia", "Amparo"],
    fixedSkills: ["Magia", "Conhecimento"],
    optionalSkills: [],
    keys: ["Bastão de Convergência", "Grimório Estratificado", "Tear Ritual", "Prisma de Fórmulas"],
    initialTechnique: "Forma Estável",
  },
  Curador: {
    roles: ["Amparo"],
    fixedSkills: ["Cuidado", "Empatia"],
    optionalSkills: [],
    keys: ["Kit de Retorno", "Foco de Amparo", "Sino de Lucidez", "Símbolo de Cuidado"],
    initialTechnique: "Estabilizar Relação",
  },
  Evocador: {
    roles: ["Artilharia", "Amparo", "Bastião"],
    fixedSkills: ["Evocação"],
    optionalSkills: ["Magia", "Empatia"],
    keys: ["Âncora de Pacto", "Máscara de Convocação", "Totem de Presença", "Chave de Vínculo"],
    initialTechnique: "Vínculo Manifesto",
  },
  Artífice: {
    roles: ["Bastião", "Artilharia"],
    fixedSkills: ["Ofício", "Investigação"],
    optionalSkills: [],
    keys: ["Ferramentas Modulares", "Luva de Inscrição", "Dispositivo de Campo", "Obra Modular"],
    initialTechnique: "Preparação de Campo",
  },
  Batedor: {
    roles: ["Vanguarda", "Artilharia"],
    fixedSkills: ["Sobrevivência", "Furtividade"],
    optionalSkills: [],
    keys: ["Faca de Trilha", "Arco de Exploração", "Bússola de Frestas", "Kit de Rastreamento"],
    initialTechnique: "Primeiro a Ver",
  },
  Satirista: {
    roles: ["Amparo", "Artilharia"],
    fixedSkills: ["Empatia", "Velarim"],
    optionalSkills: [],
    keys: [
      "Instrumento de Memória",
      "Máscara",
      "Verso Guardado",
      "Objeto de Desejo",
      "Lembrança Corporal",
    ],
    initialTechnique: "Licença do Bobo",
  },
};

export function characterOfficeRules(office: string): OfficeRule | null {
  return OFFICE_RULES[office] ?? null;
}

const SIMPLE_WEAPONS = new Set([
  "Desarmado",
  "Arma improvisada",
  "Faca",
  "Clava",
  "Bastão",
  "Lança curta",
  "Funda",
  "Arma de arremesso",
  "Bastão ritual",
]);
const KNOWN_WEAPONS = new Set([
  ...SIMPLE_WEAPONS,
  "Espada",
  "Sabre",
  "Machado",
  "Martelo de guerra",
  "Lança longa",
  "Lâmina grande",
  "Arma de haste",
  "Arco",
  "Besta",
  "Besta pesada",
  "Arma de disparo",
  "Repetidor Nomos",
  "Projetor de quartzo",
  "Lâmina ressonante",
  "Luva de inscrição",
]);
const KNOWN_ARMORS = new Set(["Roupas reforçadas", "Leve", "Média", "Pesada"]);
const ARMOR_BY_OFFICE: Readonly<Record<string, readonly string[]>> = {
  Guardião: ["Roupas reforçadas", "Leve", "Média", "Pesada"],
  Duelista: ["Roupas reforçadas", "Leve"],
  Atirador: ["Roupas reforçadas", "Leve"],
  Tecelão: ["Roupas reforçadas"],
  Curador: ["Roupas reforçadas", "Leve"],
  Evocador: ["Roupas reforçadas"],
  Artífice: ["Roupas reforçadas", "Leve"],
  Batedor: ["Roupas reforçadas", "Leve"],
  Satirista: ["Roupas reforçadas", "Leve"],
};
const TOOL_BY_OFFICE: Readonly<Record<string, readonly string[]>> = {
  Curador: ["Kit de cura"],
  Evocador: ["Âncora de Evocação"],
  Artífice: ["Ferramentas de Artífice"],
  Tecelão: ["Foco de magia", "Conjunto de inscrição"],
  Batedor: ["Kit de exploração", "Equipamento de escalada"],
  Satirista: ["Kit de disfarce", "Instrumentos de frequência"],
};
const KNOWN_TOOLS = new Set([
  "Kit de cura",
  "Ferramentas de Artífice",
  "Conjunto de inscrição",
  "Foco de magia",
  "Âncora de Evocação",
  "Kit de exploração",
  "Analisador científico",
  "Equipamento de escalada",
  "Kit de disfarce",
  "Instrumentos de frequência",
]);
const KNOWN_CONSUMABLES = new Set([
  "Tônico de Vitalidade",
  "Estabilizador de Fluxo",
  "Sal de Memória",
  "Selo de Contenção",
  "Munição de Quartzo",
  "Fio de Retorno",
  "Carga de Reparo",
  "Ampola de Repouso",
]);
const EVOCATION_FORMS = new Set([
  "Guardião",
  "Predador",
  "Oráculo",
  "Tempestade",
  "Artífice",
  "Limiar",
]);
const EVOCATION_PORTES = new Set(["Menor", "Padrão", "Maior", "Instável"]);
const EVOCATION_MODELS = new Set([
  "Muralha de Ecos",
  "Guardião de Quartzo",
  "Colosso de Juramento",
  "Fera de Estilhaço",
  "Lobo de Fresta",
  "Garuda Fratal",
  "Eco do Jardim",
  "Olho de Vael",
  "Arquivo Aelvari",
  "Centelha Draken",
  "Serpente de Tormenta",
  "Coro dos Céus Partidos",
  "Mão Nomos",
  "Autômato de Ponte",
  "Oficina Caminhante",
  "Guia Nimari",
  "Andarilho do Umbral",
  "Navegante de Kethrell",
]);

export const MARCO_GAINS: Record<number, readonly string[]> = {
  1: [],
  2: ["m2"],
  3: ["m3"],
  4: ["m4a", "m4b"],
  5: ["m5"],
  6: ["m6"],
  7: ["m7"],
  8: ["m8a", "m8b"],
  9: ["m9"],
  10: ["m10"],
  11: ["m11"],
  12: ["m12"],
  13: ["m13"],
  14: ["m14"],
  15: ["m15"],
};
export type EpicMagicTier = "I" | "II" | "III";
export const EPIC_MANIFESTATION_STATUSES = [
  "RASCUNHO",
  "EM_ANALISE",
  "HOMOLOGADA",
  "HOMOLOGADA_PROVISORIAMENTE",
  "DEVOLVIDA_PARA_AJUSTE",
  "NAO_HOMOLOGADA",
] as const;
export type EpicManifestationStatus = (typeof EPIC_MANIFESTATION_STATUSES)[number];
export const EPIC_MANIFESTATION_TYPES = ["normal", "magia_epica"] as const;
export type EpicManifestationType = (typeof EPIC_MANIFESTATION_TYPES)[number];
export const EPIC_MAGIC_BY_MARCO: Partial<Record<number, EpicMagicTier>> = {
  11: "I",
  13: "II",
  15: "III",
};
export type MagicGrade = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const TECELAO_MAGIC_TOTALS: Record<number, number> = Object.fromEntries(
  Array.from({ length: 15 }, (_, i) => [i + 1, Math.min(22, 2 * (i + 2))]),
) as Record<number, number>;
export type CharacterSnapshot = Record<string, unknown>;
export const UNIVERSAL_MAGIC_CAP_ATTRIBUTE = "Sintonia" as const;

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const string = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function characterName(snapshot: CharacterSnapshot): string {
  return string(snapshot.nome).slice(0, 160);
}
export function activeTrail(snapshot: CharacterSnapshot): Record<string, unknown> | null {
  const trails = array(snapshot.trilhas);
  const index = Number.isInteger(snapshot.trilhaAtiva) ? Number(snapshot.trilhaAtiva) : 0;
  return object(trails[index]);
}
export function activeMarco(snapshot: CharacterSnapshot): number {
  const value = number(activeTrail(snapshot)?.marco);
  return value && Number.isInteger(value) ? Math.max(1, Math.min(15, value)) : 1;
}
export function activeTrailId(snapshot: CharacterSnapshot): string | null {
  return string(activeTrail(snapshot)?.id) || null;
}
export function characterAttribute(snapshot: CharacterSnapshot, attribute: string): number {
  const base = number(object(snapshot.atributosBase)?.[attribute]) ?? 0;
  const gained = number(object(activeTrail(snapshot)?.atributosGanhos)?.[attribute]) ?? 0;
  return Math.max(0, base + gained);
}
export function attributeCapForMarco(marco: number): number {
  const normalized = Number.isInteger(marco) ? Math.max(1, Math.min(15, marco)) : 1;
  if (normalized >= 11) return normalized - 5;
  if (normalized >= 7) return 5;
  if (normalized >= 5) return 4;
  return 3;
}
export function epicMagicTierForMarco(marco: number): EpicMagicTier | null {
  if (marco >= 15) return "III";
  if (marco >= 13) return "II";
  if (marco >= 11) return "I";
  return null;
}
export function epicHorizonForMarco(marco: number): string | null {
  return (
    ({ 11: "CENA", 12: "BAIRRO", 13: "CIDADE", 14: "POVO", 15: "MUNDO" } as Record<number, string>)[
      marco
    ] ?? null
  );
}
function epicMagicRank(tier: string): number {
  return tier === "I" ? 1 : tier === "II" ? 2 : tier === "III" ? 3 : 0;
}
export function universalMagicCap(snapshot: CharacterSnapshot): number {
  return characterAttribute(snapshot, UNIVERSAL_MAGIC_CAP_ATTRIBUTE);
}
export function universalMagicGradeMax(marco: number): MagicGrade {
  return magicGradeCap(marco);
}
export function tecelaoMagicTotals(marco: number): number {
  const normalized = Number.isInteger(marco) ? Math.max(1, Math.min(15, marco)) : 1;
  return TECELAO_MAGIC_TOTALS[normalized] ?? TECELAO_MAGIC_TOTALS[10];
}
function knownForms(snapshot: CharacterSnapshot): KnownForm[] {
  return array(activeTrail(snapshot)?.knownForms).flatMap((raw) => {
    const value = object(raw);
    const formId = string(value?.formId);
    const maxGrade = number(value?.maxGrade);
    return formId &&
      MAGIC_FORM_IDS.has(formId) &&
      maxGrade !== null &&
      Number.isInteger(maxGrade) &&
      maxGrade >= 0 &&
      maxGrade <= 6
      ? [{ formId: formId as KnownForm["formId"], maxGrade: maxGrade as KnownForm["maxGrade"] }]
      : [];
  });
}
export function validateMagicChoices(
  snapshot: CharacterSnapshot,
  requireTecelaoTotals = false,
): string[] {
  const errors: string[] = [];
  const trail = activeTrail(snapshot);
  if (!trail) return errors;
  if (!Array.isArray(trail.knownForms)) {
    if (Array.isArray(trail.magias) && trail.magias.length)
      errors.push("magic_legacy_reconciliation_required");
    return errors;
  }
  const choices = array(trail.knownForms).flatMap((raw, index) => {
    const value = object(raw);
    const formId = string(value?.formId);
    const maxGrade = number(value?.maxGrade);
    if (!formId || !MAGIC_FORM_IDS.has(formId)) {
      errors.push(`magic_form_invalid_${index}`);
      return [];
    }
    if (maxGrade === null || !Number.isInteger(maxGrade) || maxGrade < 0 || maxGrade > 6) {
      errors.push(`magic_grade_invalid_${index}`);
      return [];
    }
    return [{ formId: formId as KnownForm["formId"], maxGrade: maxGrade as KnownForm["maxGrade"] }];
  });
  const seen = new Set<string>();
  for (const choice of choices) {
    if (seen.has(choice.formId)) errors.push(`magic_duplicate_${choice.formId}`);
    seen.add(choice.formId);
    if (choice.maxGrade > universalMagicGradeMax(activeMarco(snapshot)))
      errors.push(`magic_grade_${choice.maxGrade}_locked`);
  }
  if (string(trail.oficio) !== "Tecelão") {
    const universalCap = universalMagicCap(snapshot);
    if (choices.length > universalCap) errors.push("magic_cap_exceeded");
    return errors;
  }
  const totals = tecelaoMagicTotals(activeMarco(snapshot));
  if (choices.length > totals) errors.push("magic_total_exceeded");
  if (requireTecelaoTotals && choices.length !== totals)
    errors.push(`magic_total_expected_${totals}_actual_${choices.length}`);
  return errors;
}
export function tecelaoMagicDeficit(
  snapshot: CharacterSnapshot,
  targetMarco = activeMarco(snapshot),
) {
  return Math.max(0, tecelaoMagicTotals(targetMarco) - knownForms(snapshot).length);
}

function values(snapshot: CharacterSnapshot, key: string): number[] {
  const source = object(snapshot[key]);
  return source
    ? Object.values(source)
        .map(number)
        .filter((v): v is number => v !== null)
    : [];
}
function sorted(values: number[]) {
  return [...values].sort((a, b) => a - b).join(",");
}

function validateAttributeCaps(snapshot: CharacterSnapshot): string[] {
  const errors: string[] = [];
  const base = object(snapshot.atributosBase) ?? {};
  for (const rawTrail of array(snapshot.trilhas)) {
    const trail = object(rawTrail);
    const marco = number(trail?.marco);
    if (marco === null || !Number.isInteger(marco)) continue;
    const gained = object(trail?.atributosGanhos) ?? {};
    const cap = attributeCapForMarco(marco);
    for (const attribute of ATTRIBUTE_NAMES) {
      const value = (number(base[attribute]) ?? 0) + (number(gained[attribute]) ?? 0);
      if (value > cap) errors.push(`attribute_cap_exceeded_${attribute}`);
    }
  }
  return errors;
}

export function validateEpicManifestations(
  snapshot: CharacterSnapshot,
  targetMarco = activeMarco(snapshot),
): string[] {
  if (targetMarco < 11) return [];
  const errors: string[] = [];
  const trail = activeTrail(snapshot);
  const manifestations = array(trail?.manifestacoesEpicas);
  const required = targetMarco - 10;
  if (manifestations.length < required) errors.push("epic_manifestation_missing");
  manifestations.forEach((raw, index) => {
    const item = object(raw);
    if (!item) {
      errors.push(`epic_manifestation_invalid_${index}`);
      return;
    }
    if (!string(item.nome)) errors.push(`epic_manifestation_name_required_${index}`);
    if (!string(item.descricao)) errors.push(`epic_manifestation_description_required_${index}`);
    if (!string(item.efeito)) errors.push(`epic_manifestation_effect_required_${index}`);
    if (!string(item.custo)) errors.push(`epic_manifestation_cost_required_${index}`);
    if (!string(item.limitacoes)) errors.push(`epic_manifestation_limits_required_${index}`);
    if (string(item.oficio) && string(item.oficio) !== string(trail?.oficio))
      errors.push(`epic_manifestation_office_invalid_${index}`);
    const marco = number(item.marco);
    if (marco === null || !Number.isInteger(marco) || marco < 11 || marco > targetMarco)
      errors.push(`epic_manifestation_marco_invalid_${index}`);
    const expectedHorizon = marco === null ? null : epicHorizonForMarco(marco);
    if (string(item.horizonte).toUpperCase() !== expectedHorizon)
      errors.push(`epic_manifestation_horizon_invalid_${index}`);
    const type = string(item.tipo) as EpicManifestationType;
    if (!(EPIC_MANIFESTATION_TYPES as readonly string[]).includes(type))
      errors.push(`epic_manifestation_type_invalid_${index}`);
    const epicTier = string(item.grauMagiaEpica);
    if (type === "magia_epica") {
      const maxTier = marco === null ? null : epicMagicTierForMarco(marco);
      if (
        !maxTier ||
        epicMagicRank(epicTier) === 0 ||
        epicMagicRank(epicTier) > epicMagicRank(maxTier)
      )
        errors.push(`epic_manifestation_magic_grade_invalid_${index}`);
    } else if (epicTier) {
      errors.push(`epic_manifestation_magic_grade_unexpected_${index}`);
    }
    const status = string(item.statusHomologacao);
    if (!(EPIC_MANIFESTATION_STATUSES as readonly string[]).includes(status))
      errors.push(`epic_manifestation_status_invalid_${index}`);
    if (item.mechanicallyActive !== undefined && typeof item.mechanicallyActive !== "boolean")
      errors.push(`epic_manifestation_active_invalid_${index}`);
    if (item.aprovadaPeloMestre !== undefined && typeof item.aprovadaPeloMestre !== "boolean")
      errors.push(`epic_manifestation_approval_invalid_${index}`);
  });
  return errors;
}

function validateEpicMagic(
  snapshot: CharacterSnapshot,
  targetMarco = activeMarco(snapshot),
): string[] {
  const expected = epicMagicTierForMarco(targetMarco);
  if (!expected) return [];
  return string(activeTrail(snapshot)?.magiaEpica) === expected ? [] : ["epic_magic_missing"];
}

function expectedSkillSources(snapshot: CharacterSnapshot): Record<string, string[]> {
  const sources: Record<string, string[]> = Object.fromEntries(
    SKILL_NAMES.map((skill) => [skill, []]),
  );
  const trail = activeTrail(snapshot);
  const office = string(trail?.oficio);
  const rule = OFFICE_RULES[office];
  const add = (skill: string, source: string) => {
    if (sources[skill] && !sources[skill].includes(source)) sources[skill].push(source);
  };
  rule?.fixedSkills.forEach((skill) => add(skill, `Ofício: ${office}`));
  const chosen = string(trail?.pericaEscolhida);
  if (chosen) add(chosen, `Ofício: ${office}`);
  if (string(snapshot.povo) === "Livres")
    add(string(snapshot.pericaLivre), "Povo: Livres · Aprendizagem Cruzada");
  if (string(snapshot.povo) === "Aelvari" && string(snapshot.heranca) === "Cronista")
    add("Conhecimento", "Herança: Cronista");
  const gains = object(trail?.ganhos) ?? {};
  Object.entries(gains).forEach(([id, raw]) => {
    const gain = object(raw);
    if (string(gain?.tipo) === "pericia") add(string(gain?.valor), `Marco: ${id}`);
  });
  return sources;
}

export function buildCharacterSkillProvenance(snapshot: CharacterSnapshot) {
  const expectedSources = expectedSkillSources(snapshot);
  const office = string(activeTrail(snapshot)?.oficio);
  const baseSkills = object(snapshot.periciasBase) ?? {};
  return Object.fromEntries(
    SKILL_NAMES.map((skill) => {
      const base = number(baseSkills[skill]) ?? 0;
      const sources = [...new Set(expectedSources[skill] ?? [])].sort();
      const hasOfficeSource = sources.includes(`Ofício: ${office}`);
      const bonus =
        sources.length -
        Number(hasOfficeSource) +
        (hasOfficeSource ? Math.max(0, Math.min(1, 3 - base)) : 0);
      return [skill, { base, bonus, fontes: sources }];
    }),
  );
}

function validateCreationContract(
  c: CharacterSnapshot,
  trail: Record<string, unknown>,
  errors: string[],
) {
  const povo = string(c.povo);
  const origem = string(c.origem);
  const office = string(trail.oficio);
  const rule = OFFICE_RULES[office];
  const marco = number(trail.marco) ?? 0;
  const concept = object(c.conceito);
  if (!(CHARACTER_PEOPLES as readonly string[]).includes(povo)) errors.push("people_required");
  if (!(CHARACTER_ORIGINS as readonly string[]).includes(origem)) errors.push("origin_required");
  if (
    !concept ||
    !string(concept.identidade) ||
    !string(concept.objetivo) ||
    !string(concept.perda)
  )
    errors.push("concept_required");
  if (!rule) return;
  if (!rule.roles.includes(string(trail.papel))) errors.push("role_invalid");
  if (!rule.keys.includes(string(trail.chave))) errors.push("key_invalid");
  if (!rule.initialTechnique || !array(trail.tecnicas).map(string).includes(rule.initialTechnique))
    errors.push("initial_technique_required");
  const trained = array(trail.pericias).map(string);
  for (const skill of rule.fixedSkills)
    if (!trained.includes(skill)) errors.push(`office_skill_missing_${skill}`);
  if (rule.optionalSkills.length && !rule.optionalSkills.includes(string(trail.pericaEscolhida)))
    errors.push("office_second_skill_required");
  if (!rule.optionalSkills.length && string(trail.pericaEscolhida))
    errors.push("office_second_skill_invalid");
  const specializations = array(trail.especializacoes).filter((value) => string(value));
  if (marco < 3 && specializations.length) errors.push("specialization_locked_before_marco_3");
  const heritage = string(c.heranca);
  if (!heritage || !(PEOPLE_HERITAGES[povo] ?? []).includes(heritage))
    errors.push("heritage_invalid");
  if (povo === "Livres") {
    const freeSkill = string(c.pericaLivre);
    if (!freeSkill || !(SKILL_NAMES as readonly string[]).includes(freeSkill))
      errors.push("cross_learning_skill_required");
    if (freeSkill && [...trained, string(trail.pericaEscolhida)].includes(freeSkill))
      errors.push("cross_learning_skill_must_be_outside_office");
    if (heritage === "Múltiplos Caminhos") {
      const external = object(c.tecnicaHeranca);
      const externalOffice = string(external?.oficio);
      const externalRule = OFFICE_RULES[externalOffice];
      if (
        !externalRule ||
        externalOffice === office ||
        string(external?.nome) !== externalRule.initialTechnique
      )
        errors.push("heritage_technique_invalid");
    }
  }
  if (origem === "Outro" && (!string(c.origemBeneficio) || !string(c.dividaComunitaria)))
    errors.push("origin_other_details_required");
  if (origem === "Trocado") {
    const exchanged = object(c.origemTrocado);
    if (
      !exchanged ||
      !string(exchanged.nascimento) ||
      !string(exchanged.criacao) ||
      !string(exchanged.descricao)
    )
      errors.push("origin_exchanged_details_required");
  }
  const baseAttributes = object(c.atributosBase);
  for (const attribute of ATTRIBUTE_NAMES)
    if (number(baseAttributes?.[attribute]) === null) errors.push(`attribute_missing_${attribute}`);
  if (sorted(values(c, "atributosBase")) !== "0,1,1,2,2,3")
    errors.push("attributes_distribution_invalid");
  const baseSkills = object(c.periciasBase);
  for (const skill of SKILL_NAMES)
    if (number(baseSkills?.[skill]) === null) errors.push(`skill_missing_${skill}`);
  const skillValues = values(c, "periciasBase");
  if (
    skillValues.filter((value) => value === 3).length !== 1 ||
    skillValues.filter((value) => value === 2).length !== 3 ||
    skillValues.filter((value) => value === 1).length !== 4
  )
    errors.push("skills_distribution_invalid");
  const expectedProvenance = buildCharacterSkillProvenance(c);
  const provenance = object(c.periciasProveniencia);
  if (!provenance) errors.push("skill_provenance_required");
  for (const skill of SKILL_NAMES) {
    const item = object(provenance?.[skill]);
    const expected = expectedProvenance[skill];
    const actual = Array.isArray(item?.fontes)
      ? item.fontes.map(string).filter(Boolean).sort()
      : [];
    if (
      !item ||
      number(item.base) !== expected.base ||
      number(item.bonus) !== expected.bonus ||
      JSON.stringify(actual) !== JSON.stringify(expected.fontes)
    )
      errors.push(`skill_provenance_invalid_${skill}`);
  }
  const equipment = object(c.equipamento);
  const weapon = string(equipment?.arma);
  if (!equipment || !KNOWN_WEAPONS.has(weapon)) errors.push("equipment_weapon_required");
  if (equipment?.proficienciaConfirmada !== true)
    errors.push("equipment_proficiency_confirmation_required");
  if (office === "Evocador" || office === "Curador" || office === "Satirista") {
    if (weapon && !SIMPLE_WEAPONS.has(weapon)) errors.push("equipment_weapon_proficiency_invalid");
  }
  const armor = string(equipment?.armadura);
  if (!KNOWN_ARMORS.has(armor) || !(ARMOR_BY_OFFICE[office] ?? []).includes(armor))
    errors.push("equipment_armor_invalid");
  const tool = string(equipment?.ferramenta);
  if (!KNOWN_TOOLS.has(tool) || (TOOL_BY_OFFICE[office] && !TOOL_BY_OFFICE[office].includes(tool)))
    errors.push("equipment_kit_invalid");
  const consumables = array(equipment?.consumiveis).map(string).filter(Boolean);
  if (
    consumables.length < 2 ||
    new Set(consumables).size !== consumables.length ||
    consumables.some((value) => !KNOWN_CONSUMABLES.has(value))
  )
    errors.push("equipment_consumables_invalid");
  if (array(equipment?.extras).map(string).includes("Escudo") && office !== "Guardião")
    errors.push("equipment_shield_proficiency_invalid");
  if (office === "Evocador") {
    const evocations = array(trail.vinculosEvocados)
      .map(object)
      .filter((value): value is Record<string, unknown> => Boolean(value));
    if (evocations.length < 1) errors.push("evocation_required");
    if (evocations.length > 2) errors.push("evocation_limit_exceeded");
    for (const [index, evocation] of evocations.entries()) {
      if (!string(evocation.nome)) errors.push(`evocation_name_required_${index}`);
      if (!EVOCATION_PORTES.has(string(evocation.porte)))
        errors.push(`evocation_porte_invalid_${index}`);
      if (marco === 1 && string(evocation.porte) !== "Menor")
        errors.push(`evocation_m1_porte_invalid_${index}`);
      if (!EVOCATION_FORMS.has(string(evocation.forma)))
        errors.push(`evocation_form_invalid_${index}`);
      if (!EVOCATION_MODELS.has(string(evocation.modelo)))
        errors.push(`evocation_model_invalid_${index}`);
      for (const field of ["aparencia", "ancora", "impulso", "pacto", "consciencia"])
        if (!string(evocation[field])) errors.push(`evocation_${field}_required_${index}`);
    }
  }
  const links = array(c.vinculos).map(string).filter(Boolean);
  if (links.length < 3) errors.push("links_required");
  if (!string(c.promessa)) errors.push("promise_required");
  if (!string(c.ferida)) errors.push("wound_required");
  if (!string(c.pergunta)) errors.push("question_required");
}

export type CharacterValidation = { ok: boolean; errors: string[]; warnings: string[] };
export function validateCharacterSnapshot(
  snapshot: unknown,
  requireComplete = true,
): CharacterValidation {
  const errors: string[] = [],
    warnings: string[] = [];
  const c = object(snapshot);
  if (!c) return { ok: false, errors: ["snapshot_invalid"], warnings };
  if (!characterName(c)) errors.push("name_required");
  if (requireComplete && c.completo !== true) errors.push("character_incomplete");
  const povo = string(c.povo);
  if (povo && !(CHARACTER_PEOPLES as readonly string[]).includes(povo))
    errors.push("people_invalid");
  const trails = array(c.trilhas);
  if (!trails.length) errors.push("trail_required");
  const active = activeTrail(c);
  const activeIndex = Number.isInteger(c.trilhaAtiva) ? Number(c.trilhaAtiva) : -1;
  if (activeIndex < 0 || activeIndex >= trails.length) errors.push("active_trail_invalid");
  for (const [index, raw] of trails.entries()) {
    const trail = object(raw);
    const office = string(trail?.oficio);
    if (!office || !(CHARACTER_OFFICES as readonly string[]).includes(office))
      errors.push(`office_invalid_${index}`);
    const marco = number(trail?.marco);
    if (marco === null || !Number.isInteger(marco) || marco < 1 || marco > 15)
      errors.push(`marco_invalid_${index}`);
  }
  if (requireComplete) validateCreationContract(c, active ?? {}, errors);
  errors.push(...validateMagicChoices(c, requireComplete));
  errors.push(...validateAttributeCaps(c));
  errors.push(...validateEpicMagic(c));
  errors.push(...validateEpicManifestations(c));
  errors.push(...validateCharacterPresentation(c));
  if (string(c.ruleset) && string(c.ruleset) !== CHARACTER_RULESET)
    warnings.push("ruleset_differs");
  return { ok: errors.length === 0, errors, warnings };
}

export function progressionGainIds(marco: number): readonly string[] {
  return MARCO_GAINS[marco] ?? [];
}
export function progressionGainIdsForSnapshot(
  snapshot: CharacterSnapshot,
  marco: number,
): readonly string[] {
  const ids = progressionGainIds(marco);
  return string(activeTrail(snapshot)?.oficio) === "Tecelão" && marco === 7
    ? ids.filter((id) => id !== "m7")
    : ids;
}
export function progressionComplete(snapshot: CharacterSnapshot, targetMarco: number): boolean {
  const gains = object(activeTrail(snapshot)?.ganhos) ?? {};
  const genericComplete = progressionGainIdsForSnapshot(snapshot, targetMarco).every((id) =>
    Boolean(gains[id]),
  );
  const trail = activeTrail(snapshot);
  const epicValid =
    validateEpicMagic(snapshot, targetMarco).length === 0 &&
    validateEpicManifestations(snapshot, targetMarco).length === 0;
  return (
    genericComplete &&
    (string(trail?.oficio) !== "Tecelão" || validateMagicChoices(snapshot, true).length === 0) &&
    epicValid
  );
}
function deepSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepSort);
  const record = object(value);
  if (!record) return value;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, deepSort(record[key])]),
  );
}
function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(deepSort(a)) === JSON.stringify(deepSort(b));
}
export function snapshotsEqual(a: unknown, b: unknown): boolean {
  return equal(a, b);
}
export function validateProgressionSnapshot(
  base: CharacterSnapshot,
  candidate: CharacterSnapshot,
  trailId: string,
  targetMarco: number,
): CharacterValidation {
  const errors: string[] = [];
  const baseTrails = array(base.trilhas).map(object);
  const candidateTrails = array(candidate.trilhas).map(object);
  const index = baseTrails.findIndex((trail) => string(trail?.id) === trailId);
  if (index < 0 || !candidateTrails[index])
    return { ok: false, errors: ["progression_trail_invalid"], warnings: [] };
  const allowedBase = structuredClone(base);
  const allowedCandidate = structuredClone(candidate);
  const allowedBaseTrail = object(array(allowedBase.trilhas)[index]);
  const allowedCandidateTrail = object(array(allowedCandidate.trilhas)[index]);
  if (!allowedBaseTrail || !allowedCandidateTrail)
    return { ok: false, errors: ["progression_trail_invalid"], warnings: [] };
  allowedBaseTrail.marco = targetMarco;
  allowedCandidateTrail.marco = targetMarco;
  const progressionKeys = new Set([
    "ganhos",
    "tecnicas",
    "magias",
    "knownForms",
    "especializacoes",
    "atributosGanhos",
    "pericias",
    "vinculosEvocados",
    "acessoMagia",
    "legado",
    "manifestacoesEpicas",
    "magiaEpica",
    "manifestacao_pessoal",
    "fulgor",
    "capacidade_manifestacoes",
  ]);
  for (const key of progressionKeys) {
    delete (allowedBaseTrail as Record<string, unknown>)[key];
    delete (allowedCandidateTrail as Record<string, unknown>)[key];
  }
  if (!equal(allowedBase, allowedCandidate)) errors.push("progression_patch_outside_allowlist");
  if (string(allowedCandidateTrail.oficio) === "Tecelão") {
    const baseChoices = new Set(knownForms(base).map((form) => form.formId));
    const candidateChoices = knownForms(candidate);
    if (candidateChoices.some((form) => !baseChoices.has(form.formId)))
      errors.push("progression_magic_invalid");
    if (
      !knownForms(base).every((form) =>
        candidateChoices.some((candidateForm) => candidateForm.formId === form.formId),
      )
    )
      errors.push("progression_magic_removed");
    if (activeMarco(base) !== targetMarco - 1) errors.push("progression_magic_transition_invalid");
  }
  if (!progressionComplete(candidate, targetMarco)) errors.push("progression_gain_missing");
  const valid = validateCharacterSnapshot(candidate, true);
  if (!valid.ok) errors.push(...valid.errors);
  return { ok: errors.length === 0, errors, warnings: valid.warnings };
}
export function stripServerMetadata(snapshot: CharacterSnapshot): CharacterSnapshot {
  const clone = structuredClone(snapshot);
  delete clone.manifestacao_pessoal;
  delete clone.fulgor;
  delete clone.capacidade_manifestacoes;
  for (const key of Object.keys(clone))
    if (key.startsWith("server") || key === "_server") delete clone[key];
  return clone;
}
export function mechanicalFingerprint(snapshot: CharacterSnapshot): string {
  const clone = stripServerMetadata(snapshot);
  const text = JSON.stringify(clone, Object.keys(clone).sort());
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash.toString(16).padStart(8, "0");
}
