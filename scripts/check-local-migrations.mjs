import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const migrationDirectory = join(root, "db", "migrations");
const names = [
  "0001_identity.sql",
  "0002_chat.sql",
  "0003_memory.sql",
  "0004_memory_atomic.sql",
  "0005_runtime_grants.sql",
  "0006_runtime_chat_grants.sql",
  "0007_schema_migrations.sql",
  "0008_core_hardening.sql",
  "0009_restore_chat_upsert.sql",
  "0010_characters.sql",
  "0011_character_publication_and_progression_hardening.sql",
  "0012_profiles.sql",
  "0013_contexto_externo.sql",
  "0014_handoff_ledger.sql",
  "0015_registro_vivo.sql",
  "0016_agenda.sql",
  "0017_mesas_memberships.sql",
];

function fail(message) {
  console.error(`SQL_STATIC_CHECK=FAIL ${message}`);
  process.exitCode = 1;
}

const contents = names.map((name) => {
  const path = join(migrationDirectory, name);
  if (!existsSync(path)) {
    fail(`missing ${name}`);
    return "";
  }
  return readFileSync(path, "utf8");
});

for (const [index, sql] of contents.entries()) {
  const withoutComments = sql.replace(/--[^\n]*/g, "");
  const statements = withoutComments
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!statements.length) fail(`invalid SQL envelope ${names[index]}`);
  if (/\bauth\.(uid|users)\b|service_role/i.test(withoutComments)) {
    fail(`external auth authority in ${names[index]}`);
  }
  if (/\bdrop\s+(role|schema|database|table)\b|\bcreate\s+role\b/i.test(withoutComments)) {
    fail(`unsafe bootstrap statement in ${names[index]}`);
  }
}

const [identity, chat, memory, atomic, grants] = contents;
for (const required of ["users", "credentials", "sessions"]) {
  if (!identity.includes(`CREATE TABLE IF NOT EXISTS ${required}`))
    fail(`missing table ${required}`);
}
for (const required of ["chat_threads", "chat_messages"]) {
  if (!chat.includes(`CREATE TABLE IF NOT EXISTS ${required}`)) fail(`missing table ${required}`);
}
for (const required of ["memory_candidates", "jardim_memorias", "sedimentos"]) {
  if (!memory.includes(`CREATE TABLE IF NOT EXISTS ${required}`)) fail(`missing table ${required}`);
}
for (const required of [
  "approve_memory_candidate_atomic",
  "confirm_sediment_atomic",
  "promote_sediment_batch_atomic",
]) {
  if (!atomic.includes(`FUNCTION ${required}`)) fail(`missing function ${required}`);
}
if (!grants.includes("GRANT USAGE ON SCHEMA public TO kallistis")) fail("missing schema grant");
if (!grants.includes("GRANT SELECT ON TABLE")) fail("missing read grants");
if (grants.includes("DELETE")) fail("runtime role has unnecessary DELETE grants");
if (!grants.includes("TO kallistis")) fail("missing runtime role grants");
if (!memory.includes("'rascunho', 'em_revisao', 'confirmado', 'descartado'")) {
  fail("legacy sediment status set was not preserved");
}

const agenda = contents[names.indexOf("0016_agenda.sql")] ?? "";
for (const required of [
  "agenda_events",
  "scope_type",
  "mesa_id",
  "target_user_id",
  "source_type",
  "source_ref",
]) {
  if (!agenda.includes(required)) fail("missing agenda contract field " + required);
}
if (!agenda.includes("'GLOBAL','MESA','INDIVIDUAL'")) fail("missing agenda scope domain");
if (!agenda.includes("agenda_events_scope_target_check")) fail("missing agenda scope constraint");

if (process.exitCode) process.exit();
console.log("SQL_STATIC_CHECK=PASS");
const psql = spawnSync("psql", ["--version"], { stdio: "ignore" });
console.log(
  psql.status === 0 ? "SQL_PARSE=NOT_EXECUTED_PSQL_AVAILABLE" : "SQL_PARSE=NOT_EXECUTED_NO_PSQL",
);
