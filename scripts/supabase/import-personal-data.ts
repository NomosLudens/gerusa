import { readFile } from "node:fs/promises";
import { join } from "node:path";

const UPSERT_CHUNK_SIZE = 500;

const importOrder = [
  "profiles",
  "user_roles",
  "workspace_members",
  "workspace_invitations",
  "profile_initial_contexts",
  "business_contexts",
  "kuanyin_guardians",
  "kuanyin_clients",
  "chat_threads",
  "chat_messages",
  "jardim_memorias",
  "memory_candidates",
  "registro_vivo",
  "presenca_regimes",
  "contexto_externo",
  "eventos",
  "sedimentos",
  "kuanyin_appointments",
  "kuanyin_orders",
  "kuanyin_payments",
  "kuanyin_public_chat_threads",
  "kuanyin_public_chat_messages",
  "livros",
  "codice_margens",
  "camara_sessoes",
  "camara_segmentos",
  "corpo_sinais",
  "treino_sessoes",
  "treino_sessao_exercicios",
  "treino_series",
  "drive_vehicles",
  "drive_refuels",
  "drive_oil_changes",
  "drive_expenses",
  "drive_trips",
  "drive_docs",
] as const;

const USER_REFERENCE_FIELDS = [
  "user_id",
  "owner_id",
  "guardian_id",
  "reviewed_by",
  "created_by",
  "admin_user_id",
] as const;

const usage = [
  "Usage:",
  "bun scripts/supabase/import-personal-data.ts <export-dir> <old_user_id> <new_user_id>",
  "OR bun scripts/supabase/import-personal-data.ts <export-dir> --mapping <mapping.csv|json>",
].join(" ");

const env = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
};

const createSupabaseClient = async () => {
  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const { createClient } = await import("@supabase/supabase-js");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

const assertMapping = (mapping: Record<string, string>) => {
  if (!Object.keys(mapping).length) throw new Error("User id mapping is empty.");
  return mapping;
};

const parseJsonMapping = (raw: string) => {
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    return Object.fromEntries(
      parsed.map((entry) => {
        if (!entry || typeof entry !== "object") return ["", ""];
        const oldUserId = "old_user_id" in entry ? String(entry.old_user_id) : "";
        const newUserId = "new_user_id" in entry ? String(entry.new_user_id) : "";
        return [oldUserId.trim(), newUserId.trim()];
      }),
    );
  }

  if (parsed && typeof parsed === "object") {
    return Object.fromEntries(
      Object.entries(parsed).map(([oldUserId, newUserId]) => [
        oldUserId.trim(),
        String(newUserId).trim(),
      ]),
    );
  }

  return {};
};

const parseCsvMapping = (raw: string) => {
  const [headerLine, ...lines] = raw.split(/\r?\n/).filter((line) => line.trim());
  if (!headerLine) return {};

  const headers = headerLine.split(",").map((header) => header.trim());
  const oldIndex = headers.indexOf("old_user_id");
  const newIndex = headers.indexOf("new_user_id");
  if (oldIndex < 0 || newIndex < 0) {
    throw new Error("Mapping CSV must include old_user_id and new_user_id columns.");
  }

  return Object.fromEntries(
    lines
      .map((line) => line.split(",").map((value) => value.trim()))
      .map((columns) => [columns[oldIndex], columns[newIndex]])
      .filter(([oldUserId, newUserId]) => oldUserId && newUserId),
  );
};

const loadMapping = async (args: string[]) => {
  if (args[0] === "--mapping") {
    const file = args[1];
    if (!file) throw new Error(usage);

    const raw = await readFile(file, "utf8");
    return assertMapping(file.endsWith(".json") ? parseJsonMapping(raw) : parseCsvMapping(raw));
  }

  if (!args[0] || !args[1]) throw new Error(usage);
  return { [args[0]]: args[1] };
};

function remapRow(
  table: string,
  row: Record<string, unknown>,
  mapping: Record<string, string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const shouldRemapProfileId = table === "profiles" && key === "id";
      const shouldRemapUserReference = USER_REFERENCE_FIELDS.includes(
        key as (typeof USER_REFERENCE_FIELDS)[number],
      );

      if (
        typeof value === "string" &&
        mapping[value] &&
        (shouldRemapProfileId || shouldRemapUserReference)
      ) {
        return [key, mapping[value]];
      }

      return [key, value];
    }),
  );
}

const readRows = async (dir: string, table: string) => {
  try {
    const raw = await readFile(join(dir, `${table}.json`), "utf8");
    return JSON.parse(raw) as Array<Record<string, unknown>>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
};

const getArgv = () =>
  process.argv[1]?.endsWith(".ts") ? process.argv.slice(2) : process.argv.slice(1);

const main = async () => {
  const [exportDir, ...args] = getArgv();
  if (!exportDir) throw new Error(usage);

  const mapping = await loadMapping(args);
  const supabase = await createSupabaseClient();

  for (const table of importOrder) {
    const rows = await readRows(exportDir, table);
    if (!rows?.length) {
      console.log(`skip: ${table} (no export file or empty)`);
      continue;
    }

    for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
      const chunk = rows.slice(index, index + UPSERT_CHUNK_SIZE);
      const payload = chunk.map((row) => remapRow(table, row, mapping));
      const { error } = await supabase.from(table).upsert(payload);

      if (error) throw new Error(`Import failed for ${table}: ${error.message}`);
    }

    console.log(`imported: ${table} (${rows.length} rows)`);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Import failed");
  process.exit(1);
});
