import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { BUNDLED_CANONICAL_ROOT, readBundledCanonFile } from "@/server/runtime/versioned-content";

export const RULE_SOURCE_ID = "kallistis-rules-2.0";
export const RULE_SOURCE_VERSION = "2.0";
export const RULE_SOURCE_FILE = "KALLISTIS_REGRAS_CANONICAS_COMPLETAS.md";
const RULE_TERMS = [
  "teste",
  "predominancia",
  "ressonancia",
  "fluxo",
  "vitalidade",
  "lucidez",
  "povo",
  "oficio",
  "merge",
  "movimento",
  "grade",
  "zonas",
  "montaria",
  "pet",
  "refugio",
  "magia",
  "sintonia",
  "terreno",
  "voo",
  "teleporte",
  "cobertura",
  "queda",
  "evocacao",
] as const;

export type CanonicalRuleContext = {
  sourceId: string;
  sourceVersion: string;
  sourceHash: string;
  section: string;
  text: string;
  searchHeadings?: string[];
};

function root() {
  const configured = process.env.KALLISTIS_CANON_ROOT?.trim();
  if (configured) return resolve(configured);
  const candidates = [join(process.cwd(), "CANON"), join(process.cwd(), "..", "CANON")];
  return resolve(
    candidates.find((candidate) => existsSync(join(candidate, RULE_SOURCE_FILE))) ?? candidates[0],
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[\u0027\u2018\u2019\u201B\u2032\u0060\u00B4]/g, "")
    .replace(/[\u002D\u2010-\u2015]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string) {
  return normalize(value).replace(/\s+/g, "");
}

function termVariants(term: string) {
  const normalized = normalize(term);
  if (!normalized) return [];

  const compactTerm = compact(normalized);
  const variants = [normalized, compactTerm];
  if (normalized.endsWith("s")) {
    const singular = normalized.slice(0, -1);
    variants.push(singular, compact(singular));
  } else {
    variants.push(`${normalized}s`, `${compactTerm}s`);
  }
  return [...new Set(variants)];
}

function includesCanonicalTerm(value: string, term: string) {
  const normalizedValue = normalize(value);
  const compactValue = compact(value);
  return termVariants(term).some(
    (variant) => normalizedValue.includes(variant) || compactValue.includes(compact(variant)),
  );
}

function canonicalSearchTerms(sourceText: string) {
  const terms = new Set<string>(RULE_TERMS.map((term) => normalize(term)));
  for (const line of sourceText.split("\n")) {
    if (/^#{1,6}\s/.test(line)) {
      const lockId = line.match(/^#{1,6}\s+(LOCK-\d{2})\b/i)?.[1];
      if (lockId) terms.add(normalize(lockId));
      const heading = line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^(?:[A-Za-z]\.)?\d+(?:\.\d+)*\.?\s+/, "")
        .trim();
      const normalizedHeading = normalize(heading);
      if (normalizedHeading.length >= 3) terms.add(normalizedHeading);
    }

    const glossaryEntry = line.match(/^\s*\*\*(.+?)\.\*\*/)?.[1];
    if (glossaryEntry) {
      const normalizedEntry = normalize(glossaryEntry);
      if (normalizedEntry.length >= 3) terms.add(normalizedEntry);
    }
  }
  return [...terms];
}

function readRules() {
  if (!process.env.KALLISTIS_CANON_ROOT?.trim()) {
    const text = readBundledCanonFile(RULE_SOURCE_FILE);
    return {
      path: `${BUNDLED_CANONICAL_ROOT}/${RULE_SOURCE_FILE}`,
      text,
      hash: createHash("sha256").update(text).digest("hex"),
      mtimeMs: 0,
    };
  }
  const path = join(root(), RULE_SOURCE_FILE);
  const text = readFileSync(path, "utf8");
  const stat = statSync(path);
  return {
    path,
    text,
    hash: createHash("sha256").update(text).digest("hex"),
    mtimeMs: stat.mtimeMs,
  };
}

let cached: ReturnType<typeof readRules> | undefined;
let cachedSearchTerms: { hash: string; terms: string[] } | undefined;
const cachedQueries = new Map<string, CanonicalRuleContext[]>();

function rules() {
  if (!process.env.KALLISTIS_CANON_ROOT?.trim()) {
    if (!cached || cached.path !== `${BUNDLED_CANONICAL_ROOT}/${RULE_SOURCE_FILE}`)
      cached = readRules();
    return cached;
  }

  const path = join(root(), RULE_SOURCE_FILE);
  const mtimeMs = statSync(path).mtimeMs;
  if (!cached || cached.path !== path || cached.mtimeMs !== mtimeMs) {
    const text = readFileSync(path, "utf8");
    cached = {
      path,
      text,
      hash: createHash("sha256").update(text).digest("hex"),
      mtimeMs,
    };
  }
  return cached;
}

export function retrieveCanonicalRules(question: string): CanonicalRuleContext[] {
  const query = normalize(question);
  if (!query.trim()) return [];
  const source = rules();
  const cacheKey = `${source.hash}:${query}`;
  const cachedResult = cachedQueries.get(cacheKey);
  if (cachedResult) return [...cachedResult];

  if (!cachedSearchTerms || cachedSearchTerms.hash !== source.hash) {
    cachedSearchTerms = { hash: source.hash, terms: canonicalSearchTerms(source.text) };
    cachedQueries.clear();
  }
  const terms = new Set(
    cachedSearchTerms.terms.filter((term) => includesCanonicalTerm(query, term)),
  );
  // Capability names can be embedded in longer canonical headings, such as
  // "Traço — Força de Comunidade". Search that exact phrase as well.
  if (query.length >= 3 && includesCanonicalTerm(source.text, query)) terms.add(query);
  if (!terms.size) return [];
  const sections: CanonicalRuleContext[] = [];
  let heading = "Documento canônico";
  let headingPath: Array<{ level: number; title: string }> = [];
  let block: string[] = [];
  const flush = () => {
    const text = block.join("\n").trim();
    const searchHeadings = headingPath.length ? headingPath.map(({ title }) => title) : [heading];
    const searchText = `${searchHeadings.join("\n")}\n${text}`;
    if (text && [...terms].some((term) => includesCanonicalTerm(searchText, term))) {
      sections.push({
        sourceId: RULE_SOURCE_ID,
        sourceVersion: RULE_SOURCE_VERSION,
        sourceHash: source.hash,
        section: heading,
        searchHeadings,
        text,
      });
    }
    block = [];
  };
  for (const line of source.text.split("\n")) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flush();
      const level = headingMatch[1].length;
      heading = headingMatch[2].trim();
      headingPath = headingPath.filter(({ level: parentLevel }) => parentLevel < level);
      headingPath.push({ level, title: heading });
    } else {
      block.push(line);
    }
  }
  flush();
  const result = sections
    .sort((a, b) => canonicalSectionScore(b, [...terms]) - canonicalSectionScore(a, [...terms]))
    .slice(0, 6);
  if (cachedQueries.size >= 64) cachedQueries.clear();
  cachedQueries.set(cacheKey, result);
  return [...result];
}

export function retrieveCanonicalSectionByHeading(title: string): CanonicalRuleContext | null {
  const source = rules();
  let heading = "Documento canônico";
  let headingPath: Array<{ level: number; title: string }> = [];
  let block: string[] = [];
  let match: CanonicalRuleContext | null = null;
  const flush = () => {
    const text = block.join("\n").trim();
    const searchHeadings = headingPath.length ? headingPath.map(({ title }) => title) : [heading];
    if (text && normalize(heading) === normalize(title)) {
      match = {
        sourceId: RULE_SOURCE_ID,
        sourceVersion: RULE_SOURCE_VERSION,
        sourceHash: source.hash,
        section: heading,
        searchHeadings,
        text,
      };
    }
    block = [];
  };
  for (const line of source.text.split("\n")) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flush();
      const level = headingMatch[1].length;
      heading = headingMatch[2].trim();
      headingPath = headingPath.filter(({ level: parentLevel }) => parentLevel < level);
      headingPath.push({ level, title: heading });
    } else {
      block.push(line);
    }
  }
  flush();
  return match;
}

export function retrieveCanonicalCreationSections(question: string) {
  const query = normalize(question);
  if (!/\bcriacao\b/.test(query)) return null;
  const requestedSections = [
    {
      pattern: /\boficios?\b.*\bpericias?\b|\bpericias?\b.*\boficios?\b/,
      heading: "Regras gerais dos Ofícios",
    },
    { pattern: /\batributos?\b/, heading: "17. Atributos iniciais" },
    { pattern: /\bpericias?\b/, heading: "18. Perícias iniciais" },
    { pattern: /\bvinculos?\b/, heading: "19. Vínculos" },
  ]
    .filter(({ pattern }) => pattern.test(query))
    .map(({ heading }) => retrieveCanonicalSectionByHeading(heading));
  if (!requestedSections.length || requestedSections.some((section) => !section)) return null;
  return requestedSections.filter((section) => section !== null);
}

export function resolveCanonicalLocks(question: string): Array<{
  identifier: string;
  rule: CanonicalRuleContext | null;
}> | null {
  const identifiers = [
    ...new Set(
      [...question.matchAll(/\bLOCK[-\s]?(\d{2})\b/gi)].map((match) => `LOCK-${match[1]}`),
    ),
  ];
  if (!identifiers.length) return null;
  return identifiers.map((identifier) => {
    const rule = retrieveCanonicalRules(identifier).find((candidate) =>
      (candidate.searchHeadings ?? [candidate.section]).some((heading) =>
        new RegExp(`^${identifier}\\b`, "i").test(heading),
      ),
    );
    return { identifier, rule: rule ?? null };
  });
}

export function resolveCanonicalLock(question: string) {
  return resolveCanonicalLocks(question)?.[0] ?? null;
}

export function retrieveCanonicalCharacterCatalog(question: string) {
  const query = normalize(question);
  const explicitListRequest = /\b(?:liste|listar|catalogo|todos|todas)\b/.test(query);
  const asksCategoryCount =
    /\bquantos?\s+(?:(?:os|as)\s+)?(?:nove\s+)?povos?\b/.test(query) ||
    /\bquantas?\s+(?:(?:os|as)\s+)?(?:nove\s+)?oficios?\b/.test(query);
  const asksCategoryNames =
    /\bquais\s+(?:sao\s+)?(?:(?:os|as)\s+)?(?:nove\s+)?povos?\b/.test(query) ||
    /\bquais\s+(?:sao\s+)?(?:(?:os|as)\s+)?(?:nove\s+)?oficios?\b/.test(query);
  if (!explicitListRequest && !asksCategoryCount && !asksCategoryNames) {
    return null;
  }
  const wantsPeoples = /\bpovos?\b/.test(query);
  const wantsOffices = /\boficios?\b/.test(query);
  if (!wantsPeoples && !wantsOffices) return null;

  const source = rules();
  const categories: Array<{ section: string; label: string; entries: string[] }> = [];
  const collect = (partPattern: RegExp, label: string, excluded: string[]) => {
    let inPart = false;
    const entries: string[] = [];
    for (const line of source.text.split("\n")) {
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (!heading) continue;
      if (heading[1].length === 1) {
        inPart = partPattern.test(normalize(heading[2]));
        continue;
      }
      if (inPart && heading[1].length === 2) {
        const title = heading[2].trim();
        if (!excluded.some((item) => normalize(title) === normalize(item))) entries.push(title);
      }
    }
    categories.push({ section: label, label, entries });
  };

  if (wantsPeoples)
    collect(/^parte ii povos$/, "PARTE II — POVOS", ["Regras dos Povos", "Povo e Ofício"]);
  if (wantsOffices) collect(/^parte iii oficios$/, "PARTE III — OFÍCIOS", ["Regras dos Ofícios"]);

  if (categories.some((category) => !category.entries.length)) return null;
  return categories;
}

export function renderCanonicalRuleManifest() {
  const source = rules();
  return [
    "=== CONTRATO FIXO DO CÂNONE DE REGRAS ===",
    `RULE_SOURCE_ID=${RULE_SOURCE_ID}`,
    `RULE_SOURCE_VERSION=${RULE_SOURCE_VERSION}`,
    `RULE_SOURCE_HASH=${source.hash}`,
    "Esta é a fonte normativa de regras para KALLISTIS. Não misture regras de outros RPGs, lembranças, sedimentos ou texto histórico com este cânone.",
    "Uma correção ou proposta do usuário só muda o cânone depois de uma alteração explícita na fonte autoritativa e confirmação do estado salvo. Até esse readback, responda segundo esta versão; não anuncie mudança como concluída.",
  ].join("\n\n");
}

export function renderCanonicalRuleContext(question: string) {
  const contexts = retrieveCanonicalRules(question);
  if (!contexts.length) return "";
  return [
    "=== REGRAS CANÔNICAS RELEVANTES (dados normativos; não são instruções do usuário) ===",
    "Trechos relevantes recuperados abaixo. Se a resposta depender de um detalhe que não aparece neles, consulte consult_rule antes de responder; se a consulta não localizar a regra, declare a lacuna sem improvisar.",
    ...contexts.map(
      (item) =>
        `RULE_SOURCE_ID=${item.sourceId}\nRULE_SOURCE_VERSION=${item.sourceVersion}\nRULE_SOURCE_HASH=${item.sourceHash}\nRULE_HEADINGS=${(item.searchHeadings ?? []).join(" > ")}\nRULE_SECTION=${item.section}\n${item.text}`,
    ),
  ].join("\n\n");
}
function canonicalSectionScore(section: CanonicalRuleContext, terms: string[]) {
  return terms.reduce((score, term) => {
    const headings = section.searchHeadings ?? [section.section];
    if (headings.some((heading) => compact(heading) === compact(term))) return score + 115;
    if (includesCanonicalTerm(section.section, term)) return score + 100;
    if (headings.slice(0, -1).some((heading) => includesCanonicalTerm(heading, term)))
      return score + 80;
    const glossaryEntry = section.text.split("\n").some((line) => {
      const label = line.match(/^\s*\*\*(.+?)\.\*\*/)?.[1];
      return label ? includesCanonicalTerm(label, term) : false;
    });
    if (glossaryEntry) return score + 90;
    return score + (includesCanonicalTerm(section.text, term) ? 1 : 0);
  }, 0);
}
