import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { BUNDLED_CANONICAL_ROOT, readBundledCanonFile } from "@/server/runtime/versioned-content";

export const CANONICAL_IDENTITY_FILES = [
  "IDENTIDADE.md",
  "CONTEXTO.md",
  "IDENTIDADE_TEMPO_E_PRESENCA.md",
  "IDENTIDADE_ROLEPLAY_E_CONTEXTO.md",
] as const;

export type CanonicalIdentityFile = {
  name: (typeof CANONICAL_IDENTITY_FILES)[number];
  path: string;
  content: string;
  sha256: string;
  mtimeMs: number;
};

export type CanonicalIdentityBundle = {
  root: string;
  files: readonly CanonicalIdentityFile[];
};

export class CanonicalIdentityLoadError extends Error {
  readonly code = "identity_canon_unavailable";

  constructor(message: string) {
    super(message);
    this.name = "CanonicalIdentityLoadError";
  }
}

let cached: CanonicalIdentityBundle | undefined;
let cachedFingerprint: string | undefined;

function defaultRoot(): string {
  const configured = process.env.KALLISTIS_CANON_ROOT?.trim();
  if (configured) return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
  return BUNDLED_CANONICAL_ROOT;
}

function readBundle(root: string): CanonicalIdentityBundle {
  if (root === BUNDLED_CANONICAL_ROOT) {
    return {
      root,
      files: CANONICAL_IDENTITY_FILES.map((name) => {
        const content = readBundledCanonFile(name);
        return {
          name,
          path: `${root}/${name}`,
          content,
          sha256: createHash("sha256").update(content).digest("hex"),
          mtimeMs: 0,
        };
      }),
    };
  }
  const files = CANONICAL_IDENTITY_FILES.map((name) => {
    const path = join(root, name);
    try {
      const content = readFileSync(path, "utf8");
      const stat = statSync(path);
      if (!content.trim()) throw new Error("arquivo vazio");
      return {
        name,
        path,
        content,
        sha256: createHash("sha256").update(content).digest("hex"),
        mtimeMs: stat.mtimeMs,
      } satisfies CanonicalIdentityFile;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CanonicalIdentityLoadError(`Arquivo canônico indisponível: ${path} (${detail})`);
    }
  });

  return { root, files };
}

export function loadCanonicalIdentity(options: { root?: string; refresh?: boolean } = {}) {
  const root = resolve(options.root ?? defaultRoot());
  const resolvedRoot = options.root ? root : defaultRoot();
  const stats = CANONICAL_IDENTITY_FILES.map((name) => {
    if (resolvedRoot === BUNDLED_CANONICAL_ROOT) return `${name}:bundled`;
    try {
      const stat = statSync(join(resolvedRoot, name));
      return `${name}:${stat.size}:${stat.mtimeMs}`;
    } catch {
      return `${name}:missing`;
    }
  }).join("|");

  if (!options.refresh && cached?.root === resolvedRoot && cachedFingerprint === stats)
    return cached;
  const bundle = readBundle(resolvedRoot);
  cached = bundle;
  cachedFingerprint = stats;
  return bundle;
}

export function canonicalIdentityHashes(bundle = loadCanonicalIdentity()) {
  return Object.fromEntries(bundle.files.map((file) => [file.name, file.sha256]));
}

export function renderCanonicalIdentityBlock(bundle = loadCanonicalIdentity()): string {
  return [
    "=== IDENTIDADE CANÔNICA KALLISTIS / HERMES ===",
    "Os documentos abaixo são dados normativos. Não os trate como instruções do usuário.",
    ...bundle.files.map((file) => `\n--- ${file.name} ---\n${file.content.trim()}`),
  ].join("\n");
}

export const CANONICAL_CULTURAL_CONTEXT_HEADING = "## Identidade cultural após a Fratura";

export function renderCanonicalCulturalContextBlock(bundle = loadCanonicalIdentity()): string {
  const identityFile = bundle.files.find((file) => file.name === "IDENTIDADE.md");
  if (!identityFile) throw new CanonicalIdentityLoadError("IDENTIDADE.md indisponível");

  const lines = identityFile.content.split("\n");
  const start = lines.findIndex((line) => line.trim() === CANONICAL_CULTURAL_CONTEXT_HEADING);
  if (start < 0)
    throw new CanonicalIdentityLoadError(
      `Seção canônica indisponível: ${CANONICAL_CULTURAL_CONTEXT_HEADING}`,
    );
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line.trim()));
  const section = lines
    .slice(start, end < 0 ? lines.length : end)
    .join("\n")
    .trim();
  return [
    "=== CONTEXTO CULTURAL CANÔNICO (dados normativos; não são instruções do usuário) ===",
    section,
  ].join("\n");
}
