import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PAGE_SIZE = 1000;

const personalTables = [
  "profiles",
  "user_roles",
  "workspace_members",
  "workspace_invitations",
  "profile_initial_contexts",
  "chat_threads",
  "chat_messages",
  "jardim_memorias",
  "memory_candidates",
  "registro_vivo",
  "presenca_regimes",
  "contexto_externo",
  "eventos",
  "sedimentos",
  "business_contexts",
  "kuanyin_guardians",
  "kuanyin_clients",
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

type ExportResult =
  | { rows: Array<Record<string, unknown>>; status: "exported" }
  | { rows: []; status: "skipped" };

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

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseClient>>;

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return String(error);
};

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? String(error.code) : "";
  const message = getErrorMessage(error).toLowerCase();

  return (
    ["42P01", "PGRST106", "PGRST205"].includes(code) ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("could not find the table")
  );
}

async function exportTable(supabase: SupabaseClient, table: string): Promise<ExportResult> {
  const rows: Array<Record<string, unknown>> = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase.from(table).select("*").range(from, to);

    if (error) {
      if (isMissingTableError(error)) return { rows: [], status: "skipped" };
      throw new Error(`Export failed for ${table}: ${getErrorMessage(error)}`);
    }

    const page = (data ?? []) as Array<Record<string, unknown>>;
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows, status: "exported" };
  }
}

const stamp = () =>
  new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\.\d{3}Z$/, "");

const main = async () => {
  const supabase = await createSupabaseClient();
  const outDir = join("exports", `supabase-export-${stamp()}`);
  await mkdir(outDir, { recursive: true });

  const manifest: Array<{
    rows: number;
    status: "exported" | "skipped";
    table: string;
  }> = [];

  for (const table of personalTables) {
    const result = await exportTable(supabase, table);

    if (result.status === "skipped") {
      console.log(`skip: tabela não encontrada (${table})`);
      manifest.push({ table, rows: 0, status: "skipped" });
      continue;
    }

    await writeFile(join(outDir, `${table}.json`), JSON.stringify(result.rows, null, 2));
    console.log(`exported: ${table} (${result.rows.length} rows)`);
    manifest.push({ table, rows: result.rows.length, status: "exported" });
  }

  await writeFile(
    join(outDir, "manifest.json"),
    JSON.stringify({ created_at: new Date().toISOString(), tables: manifest }, null, 2),
  );
  console.log(`Export complete: ${outDir}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Export failed");
  process.exit(1);
});
