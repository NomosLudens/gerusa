import { randomUUID } from "node:crypto";
import {
  ATTRIBUTE_NAMES,
  CHARACTER_OFFICES,
  CHARACTER_PEOPLES,
  CHARACTER_RULESET,
  SKILL_NAMES,
  tecelaoMagicTotals,
  validateCharacterSnapshot,
  mechanicalFingerprint,
  type CharacterSnapshot,
} from "./character-canon";
import type { LocalChatRuntime } from "@/server/local-core/chat-runtime";

type Turn = { role: "user" | "assistant"; content: string };
const clean = (value: string) => value.trim().replace(/\s+/g, " ");
const lower = (value: string) => value.toLocaleLowerCase("pt-BR");

export type ExplicitCharacterChoice =
  | { field: "nome"; value: string }
  | { field: "sobrenome"; value: string }
  | { field: "povo"; value: (typeof CHARACTER_PEOPLES)[number] }
  | { field: "oficio"; value: (typeof CHARACTER_OFFICES)[number] };
type ExplicitPovo = (typeof CHARACTER_PEOPLES)[number];
type ExplicitOficio = (typeof CHARACTER_OFFICES)[number];

function canonicalValueAtStart(text: string, values: readonly string[]): string | null {
  const source = clean(text);
  const sourceLower = lower(source);
  for (const value of values) {
    const valueLower = lower(value);
    if (!sourceLower.startsWith(valueLower)) continue;
    const next = source[value.length] ?? "";
    if (!next || /[\s,.;!?)]/.test(next)) return value;
  }
  return null;
}

function cleanName(value: string): string {
  return clean(value)
    .replace(/^["“']+|["”']+$/g, "")
    .replace(/[.!?,;:]+$/g, "")
    .trim()
    .slice(0, 160);
}

function explicitName(text: string): string | null {
  const source = clean(text);
  const patterns = [
    /(?:^|\b)(?:o\s+)?nome\s+(?:d[ae]la|do\s+personagem|da\s+personagem)\s*(?:é|e|será|sera|=|:)\s*([^.!?,;\n]+?)(?=\s+e\s+(?:vou\s+de|escolho|prefiro|quero)\b|[.!?,;\n]|$)/i,
    /(?:^|\b)nome\s*(?:é|será|sera|=|:)\s*([^.!?,;\n]+?)(?=\s+e\s+(?:vou\s+de|escolho|prefiro|quero)\b|[.!?,;\n]|$)/i,
    /(?:^|\b)(?:quero\s+que\s+(?:ele|ela|a\s+personagem)\s+se\s+chame|(?:ele|ela)\s+se\s+chama|meu\s+personagem\s+se\s+chama)\s+["“']?([^"”'!.?,;\n]{2,160})/i,
    /(?:^|\b)(?:troca|troque|muda|mude)\s+(?:o\s+)?nome\s+(?:para|por)\s+["“']?([^"”'!.?,;\n]{2,160})/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    const value = match?.[1] ? cleanName(match[1]) : "";
    if (value && !/^(?:um|uma|qual|que|ele|ela|personagem)$/i.test(value)) return value;
  }
  return null;
}

function explicitSurname(text: string): string | null {
  const match = clean(text).match(
    /(?:^|\b)sobrenome(?:\s+(?:d[ae]la|do\s+personagem|da\s+personagem))?\s*(?:é|e|será|sera|=|:)\s*([^.!?,;\n]+?)(?=\s+e\s+(?:vou\s+de|escolho|prefiro|quero)\b|[.!?,;\n]|$)/i,
  );
  const value = match?.[1] ? cleanName(match[1]) : "";
  if (!value || /^(?:um|uma|qual|que|ele|ela|personagem)$/i.test(value)) return null;
  return value;
}

function explicitChoiceForField(
  source: string,
  field: "povo" | "oficio",
): ExplicitCharacterChoice | null {
  const values = field === "povo" ? CHARACTER_PEOPLES : CHARACTER_OFFICES;
  const labels = field === "povo" ? "povo" : "of[ií]cio";
  const direct = source.match(
    new RegExp(
      `(?:^|[.!;]|\\s+e\\s+)\\s*(?:não,?\\s*)?(?:vou\\s+de|escolho|prefiro|quero\\s+ser|troca(?:r)?\\s+(?:o\\s+)?${labels}\\s+(?:para|por)|meu\\s+${labels}\\s+(?:será|sera|é|e|=|:))\\s*(.+)$`,
      "i",
    ),
  );
  if (!direct) return null;
  const value = canonicalValueAtStart(direct[1], values);
  if (!value) return null;
  return field === "povo"
    ? { field: "povo", value: value as ExplicitPovo }
    : { field: "oficio", value: value as ExplicitOficio };
}

/** Recognizes direct declarations only; questions and suggestions return no choices. */
export function detectExplicitCharacterChoices(text: string): ExplicitCharacterChoice[] {
  const source = clean(text);
  const choices: ExplicitCharacterChoice[] = [];
  const name = explicitName(source);
  if (name) choices.push({ field: "nome", value: name });
  else {
    const surname = explicitSurname(source);
    if (surname) choices.push({ field: "sobrenome", value: surname });
  }
  const povo = explicitChoiceForField(source, "povo");
  if (povo) choices.push(povo);
  const oficio = explicitChoiceForField(source, "oficio");
  if (oficio) choices.push(oficio);
  return choices;
}

/** Backwards-compatible singular detector for callers that handle one choice. */
export function detectExplicitCharacterChoice(text: string): ExplicitCharacterChoice | null {
  return detectExplicitCharacterChoices(text)[0] ?? null;
}

export function applyExplicitCharacterChoice(
  snapshotValue: CharacterSnapshot,
  choice: ExplicitCharacterChoice,
): CharacterSnapshot {
  const next = structuredClone(snapshotValue);
  if (choice.field === "nome") {
    next.nome = choice.value;
    return next;
  }
  if (choice.field === "sobrenome") {
    const currentName = clean(String(next.nome ?? ""));
    const normalizedName = lower(currentName);
    if (!normalizedName.endsWith(lower(choice.value)))
      next.nome = cleanName(`${currentName} ${choice.value}`);
    return next;
  }
  if (choice.field === "povo") {
    next.povo = choice.value;
    return next;
  }
  const trails = Array.isArray(next.trilhas) ? next.trilhas : [];
  const index = Number.isInteger(next.trilhaAtiva) ? Number(next.trilhaAtiva) : 0;
  const trail = trails[index];
  if (trail && typeof trail === "object" && !Array.isArray(trail))
    (trail as Record<string, unknown>).oficio = choice.value;
  return next;
}

export function applyExplicitCharacterChoices(
  snapshotValue: CharacterSnapshot,
  choices: readonly ExplicitCharacterChoice[],
): CharacterSnapshot {
  return choices.reduce(applyExplicitCharacterChoice, structuredClone(snapshotValue));
}

export type CharacterCreationContractItem = {
  key: string;
  label: string;
  required: boolean;
  optional: boolean;
  autoFilled: boolean;
  playerChoice: boolean;
  derived: boolean;
  dependencies: string[];
  chatCanRead: boolean;
  chatCanWrite: boolean;
  persistencePath: string;
  forgeReadback: string;
  validator: string;
  complete: boolean;
  testExists: boolean;
  realFlowProven: boolean;
  status: "PASS" | "UNFILLED" | "OPTIONAL_EMPTY";
};

export type CharacterCreationState = {
  fields: CharacterCreationContractItem[];
  missing: CharacterCreationContractItem[];
  nextField: CharacterCreationContractItem | null;
  nextPrompt: string | null;
  complete: boolean;
};

const nonEmpty = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function contractField(
  input: Omit<CharacterCreationContractItem, "complete" | "status">,
  complete: boolean,
): CharacterCreationContractItem {
  return {
    ...input,
    complete,
    status: complete ? "PASS" : input.required ? "UNFILLED" : "OPTIONAL_EMPTY",
  };
}

/** Deterministic creation contract derived from the Forge's real Marco 1 fields. */
export function getCharacterCreationState(
  snapshotValue: CharacterSnapshot,
): CharacterCreationState {
  const snapshot = snapshotValue || {};
  const concept = record(snapshot.conceito);
  const trail = record(array(snapshot.trilhas)[Number(snapshot.trilhaAtiva) || 0]);
  const equipment = record(snapshot.equipamento);
  const origin = String(snapshot.origem ?? "");
  const people = String(snapshot.povo ?? "");
  const heritage = String(snapshot.heranca ?? "");
  const freeSkill = String(snapshot.pericaLivre ?? "");
  const choices = record(snapshot.escolhasPovo);
  const attributes = record(snapshot.atributosBase);
  const skills = record(snapshot.periciasBase);
  const provenance = record(snapshot.periciasProveniencia);
  const evocations = array(trail.vinculosEvocados);
  const fields: CharacterCreationContractItem[] = [];
  const add = (
    key: string,
    label: string,
    complete: boolean,
    options: Partial<
      Omit<CharacterCreationContractItem, "key" | "label" | "complete" | "status">
    > = {},
  ) =>
    fields.push(
      contractField(
        {
          key,
          label,
          required: true,
          optional: false,
          autoFilled: false,
          playerChoice: true,
          derived: false,
          dependencies: [],
          chatCanRead: true,
          chatCanWrite: false,
          persistencePath: `characters.snapshot.${key}`,
          forgeReadback: `snapshot.${key}`,
          validator: "validateCharacterSnapshot",
          testExists: true,
          realFlowProven: false,
          ...options,
        },
        complete,
      ),
    );

  add("jogador", "Jogador", nonEmpty(snapshot.jogador), {
    autoFilled: true,
    playerChoice: false,
    chatCanWrite: false,
    persistencePath: "profiles.display_name → characters.player_name + snapshot.jogador",
    forgeReadback: "character.playerName + snapshot.jogador",
    validator: "authenticated profile",
  });
  add("nome", "Nome da personagem", nonEmpty(snapshot.nome), {
    chatCanWrite: true,
    validator: "name_required",
  });
  add("conceito.identidade", "Conceito · identidade", nonEmpty(concept.identidade), {
    persistencePath: "characters.snapshot.conceito.identidade",
    forgeReadback: "snapshot.conceito.identidade",
    validator: "concept_required",
  });
  add("conceito.objetivo", "Conceito · objetivo", nonEmpty(concept.objetivo), {
    persistencePath: "characters.snapshot.conceito.objetivo",
    forgeReadback: "snapshot.conceito.objetivo",
    validator: "concept_required",
  });
  add("conceito.perda", "Conceito · perda", nonEmpty(concept.perda), {
    persistencePath: "characters.snapshot.conceito.perda",
    forgeReadback: "snapshot.conceito.perda",
    validator: "concept_required",
  });
  for (const [key, label] of [
    ["pronomes", "Pronomes"],
    ["campanha", "Campanha"],
    ["apelido", "Título ou apelido"],
    ["descricao", "Descrição"],
    ["aparencia", "Aparência"],
    ["biografia", "Biografia"],
    ["manifestacao_pessoal", "Manifestação pessoal"],
  ] as const)
    add(key, label, nonEmpty(snapshot[key]), {
      required: false,
      optional: true,
      playerChoice: true,
      validator: "optional",
    });
  const mount = record(snapshot.montaria);
  const pet = record(snapshot.pet);
  for (const [group, value] of [
    ["montaria", mount],
    ["pet", pet],
  ] as const) {
    add(
      `${group}.nome`,
      `${group === "montaria" ? "Montaria" : "Pet"} · nome`,
      nonEmpty(value.nome),
      { required: false, optional: true, validator: "optional" },
    );
    add(
      `${group}.descricao`,
      `${group === "montaria" ? "Montaria" : "Pet"} · descrição`,
      nonEmpty(value.descricao),
      { required: false, optional: true, validator: "optional" },
    );
    add(
      `${group}.notas`,
      `${group === "montaria" ? "Montaria" : "Pet"} · notas`,
      nonEmpty(value.notas),
      { required: false, optional: true, validator: "optional" },
    );
  }
  add("povo", "Povo", CHARACTER_PEOPLES.includes(people as ExplicitPovo), {
    chatCanWrite: true,
    validator: "people_required + people_invalid",
  });
  add("heranca", "Herança do Povo", nonEmpty(heritage), {
    dependencies: ["povo"],
    validator: "heritage_invalid",
  });
  if (people === "Nomos")
    add(
      "escolhasPovo.modulos",
      "Módulos do chassi (2)",
      Array.isArray(choices.modulos) && choices.modulos.length === 2,
      { dependencies: ["povo"], validator: "Forge CANON.escolhas_povo.Nomos" },
    );
  if (people === "Draken")
    add("escolhasPovo.afinidade", "Afinidade elemental", nonEmpty(choices.afinidade), {
      dependencies: ["povo"],
      validator: "Forge CANON.escolhas_povo.Draken",
    });
  if (people === "Vitrálios")
    add("escolhasPovo.frequencia", "Frequência dominante", nonEmpty(choices.frequencia), {
      dependencies: ["povo"],
      validator: "Forge CANON.escolhas_povo.Vitrálios",
    });
  if (people === "Teriantes") {
    const aspect = String(choices.aspecto ?? "");
    add("escolhasPovo.aspecto", "Aspecto faunístico", nonEmpty(aspect), {
      dependencies: ["povo"],
      validator: "Forge CANON.escolhas_povo.Teriantes",
    });
    if (aspect.startsWith("Outro Aspecto"))
      add("aspectoOutro", "Outro Aspecto Teriante", nonEmpty(snapshot.aspectoOutro), {
        dependencies: ["escolhasPovo.aspecto"],
        validator: "creation dependency",
      });
  }
  if (people === "Livres") {
    add("pericaLivre", "Aprendizagem Cruzada", nonEmpty(freeSkill), {
      dependencies: ["povo", "oficio"],
      validator: "cross_learning_skill_required",
    });
    if (heritage === "Múltiplos Caminhos")
      add(
        "tecnicaHeranca",
        "Técnica inicial de outro Ofício",
        nonEmpty(record(snapshot.tecnicaHeranca).nome),
        { dependencies: ["povo", "heranca", "oficio"], validator: "heritage_technique_invalid" },
      );
  }
  add("origem", "Mundo de criação", nonEmpty(origin), { validator: "origin_required" });
  if (origin === "Outro") {
    add("origemBeneficio", "Benefício da origem Outro", nonEmpty(snapshot.origemBeneficio), {
      dependencies: ["origem"],
      validator: "origin_other_details_required",
    });
    add("dividaComunitaria", "Dívida comunitária", nonEmpty(snapshot.dividaComunitaria), {
      dependencies: ["origem"],
      validator: "origin_other_details_required",
    });
  }
  if (origin === "Trocado") {
    const exchanged = record(snapshot.origemTrocado);
    add("origemTrocado.nascimento", "Mundo de nascimento", nonEmpty(exchanged.nascimento), {
      dependencies: ["origem"],
      validator: "origin_exchanged_details_required",
    });
    add("origemTrocado.criacao", "Mundo de criação", nonEmpty(exchanged.criacao), {
      dependencies: ["origem"],
      validator: "origin_exchanged_details_required",
    });
    add("origemTrocado.descricao", "Adaptação ou ressonância", nonEmpty(exchanged.descricao), {
      dependencies: ["origem"],
      validator: "origin_exchanged_details_required",
    });
  }
  add(
    "trilhas[0].oficio",
    "Ofício",
    CHARACTER_OFFICES.includes(String(trail.oficio) as ExplicitOficio),
    {
      dependencies: ["povo"],
      chatCanWrite: true,
      persistencePath: "characters.snapshot.trilhas[trilhaAtiva].oficio",
      forgeReadback: "snapshot.trilhas[trilhaAtiva].oficio",
      validator: "office_invalid",
    },
  );
  add("trilhas[0].papel", "Papel de Ressonância", nonEmpty(trail.papel), {
    dependencies: ["trilhas[0].oficio"],
    persistencePath: "characters.snapshot.trilhas[trilhaAtiva].papel",
    forgeReadback: "snapshot.trilhas[trilhaAtiva].papel",
    validator: "role_invalid",
  });
  add("trilhas[0].chave", "Chave da Trilha", nonEmpty(trail.chave), {
    dependencies: ["trilhas[0].oficio"],
    persistencePath: "characters.snapshot.trilhas[trilhaAtiva].chave",
    forgeReadback: "snapshot.trilhas[trilhaAtiva].chave",
    validator: "key_invalid",
  });
  add("trilhas[0].tecnicas[0]", "Técnica inicial", array(trail.tecnicas).length > 0, {
    dependencies: ["trilhas[0].oficio"],
    derived: true,
    playerChoice: false,
    validator: "initial_technique_required",
  });
  if (array(trail.pericias).length && ["Duelista", "Evocador"].includes(String(trail.oficio)))
    add(
      "trilhas[0].pericaEscolhida",
      "Perícia escolhida do Ofício",
      nonEmpty(trail.pericaEscolhida),
      { dependencies: ["trilhas[0].oficio"], validator: "office_second_skill_required" },
    );
  for (const attribute of ATTRIBUTE_NAMES)
    add(
      `atributosBase.${attribute}`,
      `Atributo · ${attribute}`,
      Number.isFinite(Number(attributes[attribute])) && attributes[attribute] !== null,
      {
        dependencies: ["trilhas[0].oficio"],
        validator: "attribute_missing + attributes_distribution_invalid",
      },
    );
  for (const skill of SKILL_NAMES)
    add(
      `periciasBase.${skill}`,
      `Perícia · ${skill}`,
      Number.isFinite(Number(skills[skill])) &&
        skills[skill] !== null &&
        skills[skill] !== undefined,
      {
        dependencies: ["trilhas[0].oficio"],
        validator: "skill_missing + skills_distribution_invalid",
      },
    );
  for (const skill of SKILL_NAMES)
    add(
      `periciasProveniencia.${skill}`,
      `Proveniência · ${skill}`,
      Boolean(record(provenance[skill]).base !== undefined),
      {
        dependencies: ["periciasBase"],
        derived: true,
        playerChoice: false,
        validator: "skill_provenance_invalid",
      },
    );
  add("equipamento.arma", "Arma, foco ou ferramenta principal", nonEmpty(equipment.arma), {
    dependencies: ["trilhas[0].oficio"],
    validator: "equipment_weapon_required",
  });
  add(
    "equipamento.proficienciaConfirmada",
    "Confirmação de proficiência",
    equipment.proficienciaConfirmada === true,
    {
      dependencies: ["equipamento.arma"],
      validator: "equipment_proficiency_confirmation_required",
    },
  );
  add("equipamento.armadura", "Armadura", nonEmpty(equipment.armadura), {
    dependencies: ["trilhas[0].oficio"],
    validator: "equipment_armor_invalid",
  });
  add("equipamento.ferramenta", "Kit/ferramenta do Ofício", nonEmpty(equipment.ferramenta), {
    dependencies: ["trilhas[0].oficio"],
    validator: "equipment_kit_invalid",
  });
  add(
    "equipamento.consumiveis",
    "Dois consumíveis diferentes",
    Array.isArray(equipment.consumiveis) && new Set(equipment.consumiveis).size >= 2,
    { dependencies: ["equipamento"], validator: "equipment_consumables_invalid" },
  );
  add("equipamento.extras", "Extras do equipamento", Array.isArray(equipment.extras), {
    required: false,
    optional: true,
    validator: "optional + equipment_shield_proficiency_invalid",
  });
  add("trilhas[0].id", "Identidade da Trilha", nonEmpty(trail.id), {
    required: false,
    optional: true,
    playerChoice: false,
    derived: true,
    validator: "derived",
  });
  add("trilhas[0].chaveNome", "Nome editorial da Chave", nonEmpty(trail.chaveNome), {
    required: false,
    optional: true,
    playerChoice: false,
    derived: true,
    validator: "derived",
  });
  add("trilhas[0].especializacoes", "Especializações", Array.isArray(trail.especializacoes), {
    required: false,
    optional: true,
    validator: "specialization_locked_before_marco_3",
  });
  add(
    "trilhas[0].knownForms",
    "Formas conhecidas",
    String(trail.oficio) === "Tecelão"
      ? array(trail.knownForms).length === tecelaoMagicTotals(Number(trail.marco) || 1)
      : Array.isArray(trail.knownForms),
    {
      required: String(trail.oficio) === "Tecelão",
      optional: String(trail.oficio) !== "Tecelão",
      dependencies: ["trilhas[0].oficio", "trilhas[0].marco"],
      validator: "magic_choices",
    },
  );
  add("trilhas[0].ganhos", "Ganhos de progressão", record(trail.ganhos) !== null, {
    required: false,
    optional: true,
    playerChoice: false,
    derived: true,
    validator: "progression",
  });
  add("trilhas[0].atributosGanhos", "Atributos ganhos", record(trail.atributosGanhos) !== null, {
    required: false,
    optional: true,
    playerChoice: false,
    derived: true,
    validator: "progression",
  });
  add(
    "trilhas[0].manifestacoesEpicas",
    "Manifestações épicas",
    Array.isArray(trail.manifestacoesEpicas),
    { required: false, optional: true, validator: "epic_manifestations" },
  );
  add("trilhas[0].magiaEpica", "Magia épica", typeof trail.magiaEpica === "string", {
    required: false,
    optional: true,
    validator: "epic_magic",
  });
  add("trilhas[0].legado", "Legado", typeof trail.legado === "string", {
    required: false,
    optional: true,
    validator: "progression",
  });
  add("trilhas[0].acessoMagia", "Acesso à magia", typeof trail.acessoMagia === "boolean", {
    required: false,
    optional: true,
    validator: "magic_access",
  });
  add(
    "trilhas[0].advanceAuthorizedFor",
    "Autorização de avanço",
    trail.advanceAuthorizedFor === null || Number.isInteger(trail.advanceAuthorizedFor),
    { required: false, optional: true, playerChoice: false, validator: "master_authorization" },
  );
  add("trilhas[0].advanceNote", "Nota de avanço", typeof trail.advanceNote === "string", {
    required: false,
    optional: true,
    playerChoice: false,
    validator: "optional",
  });
  const extras = [
    ["origemDetalhe", "Detalhe de origem"],
    ["atributosGanhos", "Atributos ganhos legados"],
    ["reservas.vitalidade", "Reserva · Vitalidade"],
    ["reservas.lucidez", "Reserva · Lucidez"],
    ["reservas.fluxo", "Reserva · Fluxo"],
    ["reservas.folego", "Reserva · Fôlego"],
    ["reservas.determinacao", "Reserva · Determinação"],
    ["reservas.sombra", "Reserva · Sombra"],
    ["condicoes", "Condições"],
    ["anotacoes", "Anotações"],
    ["retrato", "Retrato"],
    ["galeria", "Galeria"],
    ["historico", "Histórico"],
    ["checkpoints", "Checkpoints"],
    ["artefatosVinculados", "Artefatos vinculados"],
    ["fulgor", "Fulgor"],
    ["capacidade_manifestacoes", "Capacidades de manifestação"],
    ["completo", "Estado completo"],
    ["passo", "Passo do Forge"],
    ["mesaIds", "Mesas atribuídas"],
  ] as const;
  const reservas = record(snapshot.reservas);
  for (const [key, label] of extras) {
    const value = key.startsWith("reservas.")
      ? reservas[key.slice("reservas.".length)]
      : snapshot[key];
    const isCollection = [
      "condicoes",
      "galeria",
      "historico",
      "checkpoints",
      "artefatosVinculados",
      "mesaIds",
    ].includes(key);
    add(key, label, isCollection ? Array.isArray(value) : value !== undefined && value !== null, {
      required: false,
      optional: true,
      playerChoice: !["completo", "passo", "mesaIds"].includes(key),
      derived: ["completo", "passo"].includes(key),
      validator: "optional/runtime",
    });
  }
  for (const [index, value] of evocations.entries()) {
    const item = record(value);
    for (const field of [
      "nome",
      "porte",
      "modelo",
      "forma",
      "ancora",
      "impulso",
      "pacto",
      "aparencia",
      "consciencia",
    ] as const)
      add(
        `trilhas[0].vinculosEvocados[${index}].${field}`,
        `Vínculo evocado ${index + 1} · ${field}`,
        nonEmpty(item[field]),
        {
          required: String(trail.oficio) === "Evocador",
          optional: String(trail.oficio) !== "Evocador",
          dependencies: ["trilhas[0].oficio"],
          validator: "evocation_*",
        },
      );
  }
  if (String(trail.oficio) === "Evocador")
    add(
      "trilhas[0].vinculosEvocados",
      "Vínculo evocado",
      evocations.length >= 1 &&
        evocations.every((value) => Object.values(record(value)).every(nonEmpty)),
      { dependencies: ["trilhas[0].oficio"], validator: "evocation_required + evocation_*" },
    );
  for (let index = 0; index < 3; index += 1)
    add(`vinculos[${index}]`, `Vínculo ${index + 1}`, nonEmpty(array(snapshot.vinculos)[index]), {
      validator: "links_required",
    });
  add("promessa", "Promessa", nonEmpty(snapshot.promessa), { validator: "promise_required" });
  add("ferida", "Ferida", nonEmpty(snapshot.ferida), { validator: "wound_required" });
  add("pergunta", "Pergunta pessoal", nonEmpty(snapshot.pergunta), {
    validator: "question_required",
  });
  add("trilhas[0].marco", "Marco", Number(trail.marco || 1) === 1, {
    required: true,
    playerChoice: false,
    derived: true,
    validator: "marco_invalid",
  });
  add("trilhaAtiva", "Trilha ativa", Number.isInteger(snapshot.trilhaAtiva), {
    required: true,
    playerChoice: false,
    derived: true,
    validator: "active_trail_invalid",
  });
  const missing = fields.filter((field) => field.required && !field.complete);
  const nextField = missing[0] ?? null;
  return {
    fields,
    missing,
    nextField,
    nextPrompt: nextField
      ? `O próximo ponto da ficha é **${nextField.label}**. Pergunte ao jogador somente o que ainda falta e não peça novamente campos já preenchidos.`
      : null,
    complete: missing.length === 0,
  };
}

function lastCanonical(text: string, values: readonly string[]): string | null {
  const source = lower(text);
  let found: string | null = null;
  for (const value of values) if (source.includes(lower(value))) found = value;
  return found;
}
function latestValue(turns: Turn[], values: readonly string[]): string | null {
  let found: string | null = null;
  for (const turn of turns)
    if (turn.role === "user") found = lastCanonical(turn.content, values) ?? found;
  return found;
}
function explicitInvalidChoice(text: string, label: string): string | null {
  const match = text.match(
    new RegExp(`${label}\\s*(?:é|=|:)?\\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ -]{1,40})`, "i"),
  );
  return match?.[1]?.trim() ?? null;
}
function latestName(turns: Turn[]): string | null {
  let found: string | null = null;
  for (const turn of turns) {
    if (turn.role !== "user") continue;
    const match = turn.content.match(
      /(?:meu personagem se chama|personagem chamado|nome(?: do personagem)?)[\s:=]+["“]?([^"”\n,.!?]{2,100})|(?:quero que ele se chame|ele se chama)[\s:=]+["“]?([^"”\n,.!?]{2,100})/i,
    );
    const name = match?.[1] ?? match?.[2];
    if (name) found = clean(name.replace(/^és+/i, ""));
  }
  return found;
}
function confirmed(text: string): boolean {
  return /\b(confirmo|confirmar|pode salvar|pode criar|sim,? (pode|quero)|está certo|esta certo)\b/i.test(
    text,
  );
}
function snapshot(name: string, povo: string, oficio: string, jogador = ""): CharacterSnapshot {
  const atributosBase = Object.fromEntries(ATTRIBUTE_NAMES.map((attribute) => [attribute, null]));
  const periciasBase = Object.fromEntries(SKILL_NAMES.map((skill) => [skill, 0]));
  return {
    ruleset: CHARACTER_RULESET,
    nome: name,
    jogador,
    pronomes: "",
    campanha: "",
    apelido: "",
    descricao: "",
    aparencia: "",
    biografia: "",
    montaria: { nome: "", descricao: "", notas: "" },
    pet: { nome: "", descricao: "", notas: "" },
    conceito: { identidade: "", objetivo: "", perda: "" },
    povo,
    heranca: "",
    escolhasPovo: {},
    pericaLivre: "",
    aspectoOutro: "",
    tecnicaHeranca: null,
    origem: "",
    origemDetalhe: "",
    origemBeneficio: "",
    dividaComunitaria: "",
    origemTrocado: { nascimento: "", criacao: "", descricao: "" },
    completo: false,
    atributosBase,
    atributosGanhos: {},
    periciasBase,
    periciasProveniencia: {},
    trilhas: [
      {
        id: "trilha-1",
        oficio,
        marco: 1,
        papel: "",
        chave: "",
        chaveNome: "",
        pericias: [],
        pericaEscolhida: "",
        especializacoes: [],
        tecnicas: [],
        knownForms: [],
        vinculosEvocados: [],
        ganhos: {},
        atributosGanhos: {},
        manifestacoesEpicas: [],
        magiaEpica: "",
        legado: "",
        acessoMagia: false,
      },
    ],
    trilhaAtiva: 0,
    equipamento: {
      arma: "",
      armadura: "",
      ferramenta: "",
      consumiveis: [],
      extras: [],
      proficienciaConfirmada: false,
    },
    vinculos: [],
    promessa: "",
    ferida: "",
    pergunta: "",
    reservas: {
      vitalidade: null,
      lucidez: null,
      fluxo: null,
      folego: 3,
      determinacao: 1,
      sombra: 0,
    },
    condicoes: [],
    anotacoes: "",
    retrato: null,
    galeria: [],
    historico: [],
    checkpoints: [],
    artefatosVinculados: [],
    passo: 0,
  };
}
export function buildCharacterDraft(
  name: string,
  povo: string,
  oficio: string,
  biografia = "",
  jogador = "",
): CharacterSnapshot {
  const candidate = snapshot(clean(name).slice(0, 160), povo, oficio, clean(jogador).slice(0, 160));
  if (biografia.trim()) candidate.biografia = biografia.trim().slice(0, 2500);
  return candidate;
}

export async function answerCharacterCreation(input: {
  runtime: LocalChatRuntime;
  userId: string;
  turns: Turn[];
}): Promise<string | null> {
  const latest = input.turns.at(-1)?.content ?? "";
  const all = input.turns.map((turn) => turn.content).join("\n");
  const creationTurn =
    /criar (?:meu |um )?personagem|criação de personagem|povo\s*[=:]|of[ií]cio\s*[=:]|confirmo|pode salvar|nome (?:do personagem )?(?:é|=|:)|(?:quero|vou de|escolho|prefiro|troca).*?(?:Aelvari|Kragor|Draken|Nomos|Livres|Dóreos|Teriantes|Nimari|Vitrálios|Guardião|Duelista|Atirador|Tecelão|Curador|Evocador|Artífice|Batedor|Satirista|Elfo)/i.test(
      latest,
    );
  if (!creationTurn || /^(?:quem|qual|onde|como)\b.*personagem/i.test(latest.trim())) return null;
  if (!/criar (?:meu |um )?personagem|criação de personagem|personagem/i.test(all)) return null;
  const povo = latestValue(input.turns, CHARACTER_PEOPLES),
    oficio = latestValue(input.turns, CHARACTER_OFFICES),
    name = latestName(input.turns);
  const invalidPeople =
      explicitInvalidChoice(latest, "povo") ??
      (/(?:quero ser|quero|vou de|escolho|prefiro)\s+Elfo\b/i.test(latest) ? "Elfo" : null),
    invalidOffice = explicitInvalidChoice(latest, "of[ií]cio");
  if (
    (invalidPeople && !CHARACTER_PEOPLES.some((value) => lower(value) === lower(invalidPeople))) ||
    (invalidOffice && !CHARACTER_OFFICES.some((value) => lower(value) === lower(invalidOffice)))
  )
    return `Essa escolha não existe no cânone local. Povo válido: ${CHARACTER_PEOPLES.join(", ")}. Ofícios válidos: ${CHARACTER_OFFICES.join(", ")}. A escolha não foi salva.`;
  if (!name) return "Vamos criar pela regra local. Primeiro, qual será o nome do personagem?";
  if (!povo)
    return `Nome recebido: **${name}**. Qual Povo você escolhe? Posso usar: ${CHARACTER_PEOPLES.join(", ")}.`;
  if (!oficio)
    return `Povo recebido: **${povo}**. Qual Ofício você escolhe? Posso usar: ${CHARACTER_OFFICES.join(", ")}.`;
  if (!confirmed(latest))
    return `Resumo para confirmação:\n\n- Nome: **${name}**\n- Povo: **${povo}**\n- Ofício: **${oficio}**\n- Marco inicial: **1**\n\nAs escolhas mecânicas serão validadas pelo domínio canônico. Diga **confirmo e pode salvar** para persistir, ou indique uma substituição.`;
  const candidate = buildCharacterDraft(name, povo, oficio),
    validation = validateCharacterSnapshot(candidate, false);
  if (!validation.ok)
    return `A criação foi rejeitada pelo validador canônico: ${validation.errors.join(", ")}. Nada foi salvo.`;
  if (!input.runtime.characters) return "O núcleo de personagens local não está disponível.";
  const existing = await input.runtime.characters.list(input.userId);
  if (existing.some((character) => character.name === name && character.status !== "archived"))
    return "Já existe uma personagem ativa com esse nome; não criei outra.";
  const character = await input.runtime.characters.create(
    input.userId,
    randomUUID(),
    candidate,
    CHARACTER_RULESET,
    mechanicalFingerprint(candidate),
  );
  return `Personagem persistido no Local Core: **${character.name}** (${character.id}). Povo **${povo}**, Ofício **${oficio}**, Marco 1. Você pode recarregar ou abrir uma nova conversa; o estado vem do personagem persistido.`;
}
