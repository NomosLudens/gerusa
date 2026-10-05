import { MAGIC_FORMS } from "./magic-forms";
import type { CharacterSnapshot } from "./character-canon";
import { retrieveCanonicalRules } from "@/lib/canonical-rules.server";

export const PERSONAL_MANIFESTATION_MAX = 20_000;
export const ABILITY_MANIFESTATION_MAX = 10_000;

export type KallistisCapability = {
  id: string;
  type: "ability" | "technique" | "magic";
  name: string;
  canonical_definition: {
    id: string;
    source: "KALLISTIS_REGRAS_CANONICAS_2.0";
    summary: string;
  };
  character_manifestation_description: string;
};

export type KallistisCharacterProjection = {
  manifestation: string;
  manifestacao_pessoal: string;
  fulgor: number;
  fulgor_current: number;
  fulgor_max: 5;
  capabilities: KallistisCapability[];
  capability_manifestation_descriptions: Record<string, string>;
  source: "kallistis";
};

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const slug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "capacidade";

const PEOPLE_CAPABILITIES: Readonly<
  Record<string, { trait: string; domain: string; dissonance: string }>
> = {
  Aelvari: {
    trait: "Memória Estratificada",
    domain: "Eco Paralelo",
    dissonance: "Sobrecarga Temporal",
  },
  Kragor: {
    trait: "Força de Comunidade",
    domain: "Juramento Operante",
    dissonance: "Honra Fechada",
  },
  Draken: { trait: "Corpo Elemental", domain: "Manifestação Elemental", dissonance: "Hýbris" },
  Nomos: { trait: "Chassi Modular", domain: "Lei Interior", dissonance: "Otimização Absoluta" },
  Livres: {
    trait: "Aprendizagem Cruzada",
    domain: "Solução Improvisada",
    dissonance: "Identidade Oferecida",
  },
  Dóreos: {
    trait: "Memória da Matéria",
    domain: "Inscrição de Promessa",
    dissonance: "Permanência Rígida",
  },
  Teriantes: {
    trait: "Aspecto Faunístico",
    domain: "Instinto Inteiro",
    dissonance: "Redução ao Impulso",
  },
  Nimari: {
    trait: "Passo Liminal",
    domain: "Dado da Fortuna",
    dissonance: "Caminho Sem Compromisso",
  },
  Vitrálios: {
    trait: "Corpo Harmônico",
    domain: "Ressonância Prismática",
    dissonance: "Quebra Frequencial",
  },
};

export function capabilityKey(type: KallistisCapability["type"], id: string): string {
  return `${type}:${id}`;
}

function customDescriptions(snapshot: CharacterSnapshot): Record<string, string> {
  const value = record(snapshot.capacidade_manifestacoes);
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, description]) => {
      const clean = text(description);
      return clean ? [[key, clean]] : [];
    }),
  );
}

function canonicalSummary(value: unknown, name: string): string {
  const item = record(value);
  const direct = text(item?.texto) || text(item?.efeito) || text(item?.summary) || text(item?.g0);
  if (direct) return direct;
  return (
    retrieveCanonicalRules(name)[0]?.text || "Definição canônica registrada por ID no KALLISTIS."
  );
}

function capability(
  type: KallistisCapability["type"],
  id: string,
  name: string,
  canonical: unknown,
  descriptions: Record<string, string>,
): KallistisCapability {
  const key = capabilityKey(type, id);
  return {
    id,
    type,
    name,
    canonical_definition: {
      id,
      source: "KALLISTIS_REGRAS_CANONICAS_2.0",
      summary: canonicalSummary(canonical, name),
    },
    character_manifestation_description: descriptions[key] || "",
  };
}

export function kallistisCapabilities(snapshot: CharacterSnapshot): KallistisCapability[] {
  const descriptions = customDescriptions(snapshot);
  const capabilities: KallistisCapability[] = [];
  const seen = new Set<string>();
  const add = (item: KallistisCapability) => {
    const key = capabilityKey(item.type, item.id);
    if (!seen.has(key)) {
      seen.add(key);
      capabilities.push(item);
    }
  };

  const peopleCapabilities = PEOPLE_CAPABILITIES[text(snapshot.povo)];
  for (const [type, name] of peopleCapabilities
    ? ([
        ["ability", peopleCapabilities.trait],
        ["ability", peopleCapabilities.domain],
        ["ability", peopleCapabilities.dissonance],
      ] as const)
    : []) {
    add(capability(type, slug(name), name, name, descriptions));
  }
  for (const key of ["traco", "dom", "dissonancia"]) {
    const item = record(snapshot[key]);
    const name = text(item?.nome || item?.name);
    if (name) add(capability("ability", slug(name), name, item, descriptions));
  }
  const heritage = text(snapshot.heranca);
  const people = text(snapshot.povo);
  const heritageItem = record(snapshot.herancaDefinicao);
  if (heritage)
    add(capability("ability", slug(heritage), heritage, heritageItem || heritage, descriptions));
  if (people && text(snapshot.aspectoOutro)) {
    const name = text(snapshot.aspectoOutro);
    add(capability("ability", slug(name), name, name, descriptions));
  }

  const inheritedTechnique = record(snapshot.tecnicaHeranca);
  const inheritedTechniqueName = text(inheritedTechnique?.nome || inheritedTechnique?.name);
  const inheritedTechniqueOffice = slug(text(inheritedTechnique?.oficio));
  if (inheritedTechniqueName) {
    add(
      capability(
        "technique",
        `heritage.${inheritedTechniqueOffice || "universal"}.${slug(inheritedTechniqueName)}`,
        inheritedTechniqueName,
        inheritedTechnique,
        descriptions,
      ),
    );
  }

  const trails = list(snapshot.trilhas);
  for (const rawTrail of trails) {
    const trail = record(rawTrail);
    const office = slug(text(trail?.oficio));
    for (const rawTechnique of list(trail?.tecnicas)) {
      const item = record(rawTechnique);
      const name = text(item?.nome || item?.name || rawTechnique);
      if (name)
        add(
          capability(
            "technique",
            `${office || "trilha"}.${slug(name)}`,
            name,
            item || name,
            descriptions,
          ),
        );
    }
    for (const rawForm of list(trail?.knownForms)) {
      const form = record(rawForm);
      const formId = text(form?.formId);
      const canonical = MAGIC_FORMS.find((candidate) => candidate.id === formId);
      if (formId && canonical)
        add(capability("magic", formId, canonical.canonicalName, canonical, descriptions));
    }
  }
  return capabilities;
}

export function projectKallistisCharacter(
  snapshot: CharacterSnapshot,
): KallistisCharacterProjection {
  const fulgor = Number.isInteger(snapshot.fulgor)
    ? Math.max(0, Math.min(5, Number(snapshot.fulgor)))
    : 0;
  const capabilities = kallistisCapabilities(snapshot);
  return {
    manifestation: text(snapshot.manifestacao_pessoal),
    manifestacao_pessoal: text(snapshot.manifestacao_pessoal),
    fulgor,
    fulgor_current: fulgor,
    fulgor_max: 5,
    capabilities,
    capability_manifestation_descriptions: Object.fromEntries(
      capabilities.map((item) => [
        capabilityKey(item.type, item.id),
        item.character_manifestation_description,
      ]),
    ),
    source: "kallistis",
  };
}

export function validateCharacterPresentation(snapshot: CharacterSnapshot): string[] {
  const errors: string[] = [];
  if (
    snapshot.manifestacao_pessoal !== undefined &&
    (typeof snapshot.manifestacao_pessoal !== "string" ||
      snapshot.manifestacao_pessoal.length > PERSONAL_MANIFESTATION_MAX)
  ) {
    errors.push("personal_manifestation_invalid");
  }
  if (
    snapshot.fulgor !== undefined &&
    (!Number.isInteger(snapshot.fulgor) ||
      Number(snapshot.fulgor) < 0 ||
      Number(snapshot.fulgor) > 5)
  ) {
    errors.push("fulgor_invalid");
  }
  const descriptions = snapshot.capacidade_manifestacoes;
  if (descriptions !== undefined) {
    const value = record(descriptions);
    if (!value || Object.keys(value).length > 128) errors.push("ability_manifestations_invalid");
    else {
      for (const [key, description] of Object.entries(value)) {
        if (!/^(ability|technique|magic):[A-Za-z0-9._-]+$/.test(key))
          errors.push(`ability_manifestation_key_invalid_${key}`);
        if (typeof description !== "string" || description.length > ABILITY_MANIFESTATION_MAX)
          errors.push(`ability_manifestation_invalid_${key}`);
      }
    }
  }
  return errors;
}
