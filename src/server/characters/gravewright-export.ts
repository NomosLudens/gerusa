import { validateCharacterSnapshot } from "./character-canon";
import type { CharacterRecord } from "./contracts";

export const GRAVEWRIGHT_EXPORT_SCHEMA = "kallistis.gravewright.character" as const;
export const GRAVEWRIGHT_EXPORT_SCHEMA_VERSION = 1 as const;

/** Fields that exist in the current KALLISTIS character snapshot model. */
export const CHARACTER_EXPORT_FIELDS = [
  "nome",
  "jogador",
  "completo",
  "pronomes",
  "apelido",
  "descricao",
  "aparencia",
  "biografia",
  "conceito",
  "povo",
  "heranca",
  "escolhasPovo",
  "origem",
  "origemDetalhe",
  "origemBeneficio",
  "origemTrocado",
  "dividaComunitaria",
  "atributosBase",
  "periciasBase",
  "periciasProveniencia",
  "pericaLivre",
  "trilhas",
  "trilhaAtiva",
  "reservas",
  "equipamento",
  "proficiencias",
  "tecnicaHeranca",
  "vinculos",
  "promessa",
  "ferida",
  "pergunta",
  "condicoes",
  "montaria",
  "pet",
  "notasNarrativasPublicas",
] as const;

const SENSITIVE_KEY =
  /(?:password|passwd|hash|secret|token|authorization|cookie|api[_-]?key|service[_-]?role|hmac|jwt|access[_-]?token|refresh[_-]?token)/i;

function clonePublicValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clonePublicValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .map(([key, entry]) => [key, clonePublicValue(entry)]),
  );
}

export function exportFilename(characterName: string, characterId: string): string {
  const safeName =
    characterName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 80) || "personagem";
  return `kallistis-${safeName}-${characterId}.json`;
}

export function buildGravewrightCharacterExport(input: {
  exportedAt?: string;
  mesa?: { id: string; name: string };
  exportMode?: "manual_runtime_snapshot" | "automatic_runtime_sync";
  character: Pick<
    CharacterRecord,
    | "id"
    | "name"
    | "status"
    | "snapshot"
    | "mesas"
    | "ownerUserId"
    | "ownerDisplayName"
    | "playerName"
    | "publishedSnapshot"
    | "publishedVersion"
  >;
}) {
  const validation = validateCharacterSnapshot(input.character.snapshot, false);
  if (!validation.ok) {
    const error = new Error("character_structurally_incomplete");
    Object.assign(error, { validation });
    throw error;
  }

  const canonical =
    input.character.status === "approved" &&
    input.character.publishedSnapshot !== null &&
    input.character.publishedVersion !== null;
  const mesa = input.mesa ?? (input.character.mesas.length === 1 ? input.character.mesas[0] : null);
  if (input.exportMode === "automatic_runtime_sync" && !mesa) {
    throw new Error("character_mesa_required_for_gravewright_sync");
  }

  const snapshot = Object.fromEntries(
    CHARACTER_EXPORT_FIELDS.filter((key) =>
      Object.prototype.hasOwnProperty.call(input.character.snapshot, key),
    ).map((key) => [key, clonePublicValue(input.character.snapshot[key])]),
  );

  return {
    schema: GRAVEWRIGHT_EXPORT_SCHEMA,
    schema_version: GRAVEWRIGHT_EXPORT_SCHEMA_VERSION,
    exported_at: input.exportedAt ?? new Date().toISOString(),
    export_mode: input.exportMode ?? "manual_runtime_snapshot",
    source_state: input.character.status,
    canonical,
    mesa: mesa ? { id: mesa.id, name: mesa.name } : null,
    player: {
      kallistis_user_id: input.character.ownerUserId || null,
      display_name: input.character.ownerDisplayName || input.character.playerName || null,
      email: null,
    },
    character: {
      kallistis_character_id: input.character.id,
      name: input.character.name,
      published_version: input.character.publishedVersion,
      snapshot,
    },
  };
}

export function containsSensitiveExportKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveExportKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, entry]) => SENSITIVE_KEY.test(key) || containsSensitiveExportKey(entry),
  );
}
