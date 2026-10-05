import { randomUUID } from "node:crypto";
import { credentialLookupDigest, hashCredential } from "../src/server/local-core/credentials";
import { createBunPostgresExecutor } from "../src/server/local-core/postgres";

const databaseUrl = process.env.KALLISTIS_PROVISION_DATABASE_URL;
const lookupKey = process.env.KALLISTIS_CREDENTIAL_LOOKUP_KEY;
const credential = process.env.KALLISTIS_MASTER_WORD;

if (!databaseUrl || !lookupKey || !credential) {
  console.error(
    "MASTER_CREDENTIAL_INPUT_REQUIRED=YES (configure KALLISTIS_MASTER_WORD only for this ephemeral command)",
  );
  process.exit(2);
}

const userId = process.env.KALLISTIS_MASTER_USER_ID || randomUUID();
const credentialHash = await hashCredential(credential);
const lookupDigest = credentialLookupDigest(credential, lookupKey);
const sql = createBunPostgresExecutor(databaseUrl);

try {
  const existing = await sql.query<{ id: string }>(
    "SELECT id FROM credentials WHERE credential_lookup_digest = $1 LIMIT 1",
    [lookupDigest],
  );
  if (existing[0]) {
    console.error("MASTER_USER_PROVISIONED=NO (Palavra já registrada; nenhuma alteração feita)");
    process.exitCode = 1;
  } else {
    await sql.query(
      `INSERT INTO users (id, status, created_at, updated_at)
       VALUES ($1, 'active', now(), now())
       ON CONFLICT (id) DO UPDATE SET status = 'active', disabled_at = NULL, updated_at = now()`,
      [userId],
    );
    await sql.query(
      `INSERT INTO credentials (user_id, credential_lookup_digest, credential_hash)
       VALUES ($1, $2, $3)`,
      [userId, lookupDigest, credentialHash],
    );
    console.log("MASTER_USER_PROVISIONED=YES");
  }
} finally {
  sql.close();
}
