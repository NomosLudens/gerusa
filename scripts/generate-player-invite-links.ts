import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import process from "node:process";
import { Client } from "pg";

const REPO_ROOT = resolve(import.meta.dir, "..");
const ORIGIN = (process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app").replace(/\/$/, "");
const artifactPath = resolve(
  process.env.PLAYER_INVITE_ARTIFACT_PATH ||
    `${homedir()}/.local/share/kallistis/player-invite-links.txt`,
);
const labels = Array.from(
  { length: 25 },
  (_, index) => `JOGADOR-${String(index + 1).padStart(2, "0")}`,
);

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertArtifactOutsideRepo(): void {
  if (!isAbsolute(artifactPath) || relative(REPO_ROOT, artifactPath) === "") {
    throw new Error("PLAYER_INVITE_ARTIFACT_PATH must be outside the authoritative repository");
  }
}

function token(): string {
  return randomBytes(32).toString("base64url");
}

const databaseUrl = process.env.KALLISTIS_DATABASE_URL;
if (!databaseUrl) throw new Error("KALLISTIS_DATABASE_URL is required; no token was generated");
assertArtifactOutsideRepo();

const client = new Client({ connectionString: databaseUrl });
let artifactWritten = false;
await client.connect();
try {
  await client.query("BEGIN");
  const existing = await client.query<{ player_label: string; claimed_by_user_id: string | null }>(
    `SELECT player_label, claimed_by_user_id
       FROM public.player_invites
      ORDER BY player_label
      FOR UPDATE`,
  );
  if (existing.rowCount) {
    const existingLabels = existing.rows.map((row) => row.player_label);
    if (
      existingLabels.length === labels.length &&
      labels.every((label, index) => existingLabels[index] === label)
    ) {
      throw new Error(
        "player_invites already initialized; plaintext links cannot be reconstructed",
      );
    }
    throw new Error("player_invites contains an unexpected partial or mismatched series");
  }

  const links: string[] = [];
  for (const label of labels) {
    const rawToken = token();
    await client.query(
      `INSERT INTO public.player_invites (player_label, token_hash)
       VALUES ($1, $2)`,
      [label, digest(rawToken)],
    );
    links.push(`${label}\t${ORIGIN}/convite?c=${encodeURIComponent(rawToken)}`);
  }
  await mkdir(dirname(artifactPath), { recursive: true, mode: 0o700 });
  const content = [
    "KALLISTIS — CONVITES GOOGLE — NÃO COMMITAR",
    "Distribuir somente pelo canal seguro. Cada linha é single-use.",
    "",
    ...links,
    "",
  ].join("\n");
  await writeFile(artifactPath, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  artifactWritten = true;
  await chmod(artifactPath, 0o600);
  // Read back only to prove the artifact count; never print the token values.
  const lineCount = (await readFile(artifactPath, "utf8"))
    .split("\n")
    .filter((line) => line.startsWith("JOGADOR-")).length;
  if (lineCount !== 25) throw new Error(`invite_artifact_count_${lineCount}`);
  await client.query("COMMIT");
  console.log(
    JSON.stringify({
      player_invites_total: 25,
      artifact_path: artifactPath,
      plaintext_stored_in_db: false,
    }),
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  if (artifactWritten) await unlink(artifactPath).catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
