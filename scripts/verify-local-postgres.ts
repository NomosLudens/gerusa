import { strict as assert } from "node:assert";
import { credentialLookupDigest, hashCredential } from "../src/server/local-core/credentials";
import { requireUser } from "../src/server/local-core/auth-service";
import { createSession, hashSessionToken } from "../src/server/local-core/sessions";
import { readSessionCookie } from "../src/server/local-core/cookies";
import { createBunPostgresExecutor } from "../src/server/local-core/postgres";
import {
  createPostgresAuthRepository,
  createPostgresChatRepository,
  createPostgresMemoryRepository,
  createPostgresSedimentationRepository,
} from "../src/server/local-core/postgres-repositories";
import { createLocalChatRuntime } from "../src/server/local-core/chat-runtime";

const runtimeUrl = process.env.KALLISTIS_DATABASE_URL;
const adminUrl = process.env.KALLISTIS_ADMIN_DATABASE_URL;
if (!runtimeUrl || !adminUrl)
  throw new Error("KALLISTIS_DATABASE_URL and KALLISTIS_ADMIN_DATABASE_URL are required");

const ids = {
  userA: "10000000-0000-4000-8000-000000000001",
  userB: "10000000-0000-4000-8000-000000000002",
  threadA: "20000000-0000-4000-8000-000000000001",
  threadB: "20000000-0000-4000-8000-000000000002",
  messageA1: "30000000-0000-4000-8000-000000000001",
  messageA2: "30000000-0000-4000-8000-000000000002",
  messageB1: "30000000-0000-4000-8000-000000000003",
  candidate: "40000000-0000-4000-8000-000000000001",
  confirmationSediment: "50000000-0000-4000-8000-000000000006",
  promotionSediments: [
    "50000000-0000-4000-8000-000000000001",
    "50000000-0000-4000-8000-000000000002",
    "50000000-0000-4000-8000-000000000003",
    "50000000-0000-4000-8000-000000000004",
    "50000000-0000-4000-8000-000000000005",
  ],
  session: "60000000-0000-4000-8000-000000000001",
} as const;

const admin = createBunPostgresExecutor(adminUrl);
const lookupKey = "integration-only-lookup-key";
const credential = "integration-secret";
const credentialHash = await hashCredential(credential);
const credentialDigest = credentialLookupDigest(credential, lookupKey);
const sessionToken = "integration-session-token";
const sessionDigest = hashSessionToken(sessionToken);

await admin.query(
  `INSERT INTO users (id, status) VALUES ($1, 'active'), ($2, 'active')
   ON CONFLICT (id) DO NOTHING`,
  [ids.userA, ids.userB],
);
await admin.query(
  `INSERT INTO credentials (user_id, credential_lookup_digest, credential_hash)
   VALUES ($1, $2, $3) ON CONFLICT (credential_lookup_digest) DO NOTHING`,
  [ids.userA, credentialDigest, credentialHash],
);
await admin.query(
  `INSERT INTO sessions (id, user_id, token_digest, created_at, expires_at, last_seen_at)
   VALUES ($1, $2, $3, now(), now() + interval '30 days', now())
   ON CONFLICT (id) DO NOTHING`,
  [ids.session, ids.userA, sessionDigest],
);
await admin.query(
  `INSERT INTO chat_threads (id, user_id, surface, facet, title)
   VALUES ($1, $3, 'kaline', 'kaline', 'A'), ($2, $4, 'kaline', 'kaline', 'B')
   ON CONFLICT (id) DO NOTHING`,
  [ids.threadA, ids.threadB, ids.userA, ids.userB],
);
await admin.query(
  `INSERT INTO chat_messages (id, thread_id, user_id, role, content, created_at)
   VALUES ($1, $4, $3, 'user', 'mensagem A', now() - interval '2 minutes'),
          ($2, $4, $3, 'assistant', 'resposta A', now() - interval '1 minute'),
          ($5, $6, $7, 'user', 'mensagem B', now())
   ON CONFLICT (id) DO NOTHING`,
  [ids.messageA1, ids.messageA2, ids.userA, ids.threadA, ids.messageB1, ids.threadB, ids.userB],
);
await admin.query(
  `INSERT INTO memory_candidates (id, user_id, title, content, source)
   VALUES ($1, $2, 'Candidato', 'Conteúdo candidato', 'chat')
   ON CONFLICT (id) DO NOTHING`,
  [ids.candidate, ids.userA],
);
await admin.query(
  `INSERT INTO jardim_memorias (id, user_id, title, body, archived_at)
   VALUES ('70000000-0000-4000-8000-000000000001', $1, 'Ativa', 'Memória ativa', NULL),
          ('70000000-0000-4000-8000-000000000002', $1, 'Arquivada', 'Não deve entrar', now())
   ON CONFLICT (id) DO NOTHING`,
  [ids.userA],
);
await admin.query(
  `INSERT INTO sedimentos (id, user_id, thread_id, nivel, status, source_ids, hipotese, resumo, confianca)
   VALUES ($1, $2, $3, 'short_term', 'em_revisao', '{}', 'confirmar', 'confirmar', 2)
   ON CONFLICT (id) DO NOTHING`,
  [ids.confirmationSediment, ids.userA, ids.threadA],
);
for (const [index, sedimentId] of ids.promotionSediments.entries()) {
  await admin.query(
    `INSERT INTO sedimentos (id, user_id, thread_id, nivel, status, source_ids, hipotese, resumo, confianca)
     VALUES ($1, $2, $3, 'iconic', 'confirmado', '{}', $4, $4, 2)
     ON CONFLICT (id) DO NOTHING`,
    [sedimentId, ids.userA, ids.threadA, `fonte ${index + 1}`],
  );
}
admin.close();

const authSql = createBunPostgresExecutor(runtimeUrl);
const authenticated = await requireUser({
  request: new Request("https://kallistis.test", {
    headers: { cookie: `__Host-kallistis_session=${encodeURIComponent(sessionToken)}` },
  }),
  repository: createPostgresAuthRepository(authSql),
});
assert.equal(authenticated?.user.id, ids.userA);
assert.equal(readSessionCookie(`__Host-kallistis_session=${sessionToken}`), sessionToken);
authSql.close();
console.log("AUTH_SESSION=PASS");

const runtime = createLocalChatRuntime(runtimeUrl);
const threadA = await runtime.chat.getThreadById(ids.userA, ids.threadA);
assert.equal(threadA?.id, ids.threadA);
assert.equal(await runtime.chat.getThreadById(ids.userA, ids.threadB), null);
assert.equal((await runtime.chat.listThreadMessages(ids.userA, ids.threadA, 20)).length, 2);
assert.equal((await runtime.memory.listMemories(ids.userA)).length, 1);
assert.equal((await runtime.memory.listMemories(ids.userA))[0]?.title, "Ativa");

await runtime.chat.insertMessage({
  id: "30000000-0000-4000-8000-000000000004",
  threadId: ids.threadA,
  userId: ids.userA,
  role: "user",
  content: "persistência local",
  createdAt: new Date().toISOString(),
  derivedFrom: [],
  sourceChannel: null,
});
await assert.rejects(
  runtime.chat.insertMessage({
    id: "30000000-0000-4000-8000-000000000005",
    threadId: ids.threadB,
    userId: ids.userA,
    role: "user",
    content: "não atravessar ownership",
    createdAt: new Date().toISOString(),
    derivedFrom: [],
    sourceChannel: null,
  }),
);
runtime.close();

const reopened = createLocalChatRuntime(runtimeUrl);
assert.equal((await reopened.chat.listThreadMessages(ids.userA, ids.threadA, 20)).length, 3);
const candidateResult = await reopened.sedimentation.approveMemoryCandidate(
  ids.userA,
  ids.candidate,
  {
    title: "Candidato aprovado",
    content: "Conteúdo aprovado",
    domain: "geral",
    sensitivity: "medium",
    tags: ["integração"],
    importance: 2,
  },
);
const candidateAgain = await reopened.sedimentation.approveMemoryCandidate(
  ids.userA,
  ids.candidate,
  {
    title: "Candidato aprovado",
    content: "Conteúdo aprovado",
    domain: "geral",
    sensitivity: "medium",
    tags: ["integração"],
    importance: 2,
  },
);
assert.equal(candidateResult.ok, true);
assert.equal(candidateAgain.idempotent, true);
const confirmed = await reopened.sedimentation.confirmSediment(
  ids.userA,
  ids.confirmationSediment,
  { title: "Memória confirmada", content: "Corpo confirmado", importance: 2, tags: [] },
);
const confirmedAgain = await reopened.sedimentation.confirmSediment(
  ids.userA,
  ids.confirmationSediment,
  { title: "Memória confirmada", content: "Corpo confirmado", importance: 2, tags: [] },
);
assert.equal(confirmed.ok, true);
assert.equal(confirmedAgain.idempotent, true);
await assert.rejects(
  reopened.sedimentation.confirmSediment(ids.userB, ids.confirmationSediment, {
    title: "vazamento",
    content: "não",
    importance: 2,
    tags: [],
  }),
);
reopened.close();
console.log("PERSISTENCE_OWNERSHIP_IDEMPOTENCY=PASS");

const promotionInputs = {
  nextLevel: "echoic",
  hypothesis: "síntese cinco fontes",
  summary: "síntese",
  confidence: 2,
  parentStatus: "confirmado",
  newStatus: "em_revisao",
};
const promotionRuntimes = [createLocalChatRuntime(runtimeUrl), createLocalChatRuntime(runtimeUrl)];
const promotionResults = await Promise.allSettled(
  promotionRuntimes.map((item) =>
    item.sedimentation.promoteSedimentBatch(
      ids.userA,
      ids.threadA,
      ids.promotionSediments,
      promotionInputs,
    ),
  ),
);
for (const item of promotionRuntimes) item.close();
assert.equal(promotionResults.filter((item) => item.status === "fulfilled").length, 1);
assert.equal(promotionResults.filter((item) => item.status === "rejected").length, 1);
const verifyPromotion = createBunPostgresExecutor(runtimeUrl);
const promotedRows = await verifyPromotion.query<{ count: string }>(
  `SELECT count(*)::text AS count FROM sedimentos
   WHERE user_id = $1 AND thread_id = $2 AND nivel = 'echoic' AND status = 'em_revisao'`,
  [ids.userA, ids.threadA],
);
const linkedRows = await verifyPromotion.query<{ count: string }>(
  `SELECT count(*)::text AS count FROM sedimentos
   WHERE id = ANY($1::uuid[]) AND promovido_para IS NOT NULL`,
  [ids.promotionSediments],
);
assert.equal(promotedRows[0]?.count, "1");
assert.equal(linkedRows[0]?.count, "5");
verifyPromotion.close();
console.log("SEDIMENTATION_5_TO_1_CONCURRENCY=PASS");

const sessionRuntimes = [
  createBunPostgresExecutor(runtimeUrl),
  createBunPostgresExecutor(runtimeUrl),
];
const sessionRepos = sessionRuntimes.map(createPostgresAuthRepository);
await Promise.all([
  requireUser({
    request: new Request("https://kallistis.test", {
      headers: { cookie: `__Host-kallistis_session=${sessionToken}` },
    }),
    repository: sessionRepos[0],
  }),
  sessionRepos[1].revokeSession(ids.session, new Date()),
]);
for (const item of sessionRuntimes) item.close();
const postRevoke = createBunPostgresExecutor(runtimeUrl);
const revoked = await requireUser({
  request: new Request("https://kallistis.test", {
    headers: { cookie: `__Host-kallistis_session=${sessionToken}` },
  }),
  repository: createPostgresAuthRepository(postRevoke),
});
assert.equal(revoked, null);
postRevoke.close();
console.log("SESSION_TOUCH_REVOKE=PASS");

const ddl = createBunPostgresExecutor(runtimeUrl);
for (const statement of [
  "CREATE TABLE public.runtime_should_not_exist (id integer)",
  "ALTER TABLE public.users ADD COLUMN runtime_should_not_exist integer",
  "CREATE ROLE runtime_should_not_exist",
]) {
  await assert.rejects(ddl.query(statement));
}
ddl.close();
console.log("RUNTIME_DDL_DENIED=PASS");
console.log("LOCAL_POSTGRES_INTEGRATION=PASS");
