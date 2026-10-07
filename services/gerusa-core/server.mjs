import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { createServer } from "node:http";
import { Pool } from "pg";
import { getPedagogyAiContext, getPedagogyView, mutatePedagogy } from "./pedagogy.mjs";

const host = "127.0.0.1";
const port = Number(process.env.GERUSA_CORE_PORT || 4530);
const secret = process.env.GERUSA_CORE_SECRET;
const databaseUrl = process.env.GERUSA_DATABASE_URL;
const credentialLookupKey = process.env.GERUSA_CREDENTIAL_LOOKUP_KEY;
const threadIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxBodyBytes = 65_536;

if (!secret || secret.length < 32) throw new Error("GERUSA_CORE_SECRET is missing or too short");
if (!credentialLookupKey || credentialLookupKey.length < 32)
  throw new Error("GERUSA_CREDENTIAL_LOOKUP_KEY is missing or too short");
if (!databaseUrl) throw new Error("GERUSA_DATABASE_URL is not configured");
if (!Number.isInteger(port) || port < 1 || port > 65_535)
  throw new Error("Invalid GERUSA_CORE_PORT");

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
  parsedDatabaseUrl.pathname !== "/gerusa" ||
  decodeURIComponent(parsedDatabaseUrl.username) !== "gerusa" ||
  !parsedDatabaseUrl.password
) {
  throw new Error("GERUSA_DATABASE_URL must use the isolated gerusa database and role");
}

const pool = new Pool({
  connectionString: databaseUrl,
  application_name: "gerusa-core",
  max: 4,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10_000,
});

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(data));
}

function authorized(request) {
  const authorization = request.headers.authorization ?? "";
  if (!authorization.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function readJson(request) {
  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (contentLength > maxBodyBytes)
    throw Object.assign(new Error("payload_too_large"), { status: 413 });

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error("payload_too_large"), { status: 413 });
    chunks.push(chunk);
  }

  let value;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("invalid_json"), { status: 400 });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Object.assign(new Error("invalid_request"), { status: 400 });
  }
  return value;
}

function sessionToken(request) {
  const token = request.headers["x-gerusa-session"];
  return typeof token === "string" && token.length >= 32 ? token : null;
}

function tokenDigest(token) {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

function credentialDigest(email, password) {
  return createHmac("sha256", credentialLookupKey)
    .update(`${email.trim().toLowerCase()}\0${password.trim()}`, "utf8")
    .digest("base64url");
}

function identifierDigest(identifier) {
  return createHmac("sha256", credentialLookupKey)
    .update(identifier.trim().toLowerCase(), "utf8")
    .digest("base64url");
}

function normalizeIdentifier(value) {
  return value.trim().toLowerCase();
}

function validIdentifier(value) {
  return value.includes("@")
    ? value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    : /^[a-z0-9][a-z0-9._-]{1,39}$/.test(value);
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scryptCallback(
      password.trim(),
      salt,
      32,
      { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, digest) => {
        if (error) return reject(error);
        resolve(
          `scrypt$N=16384$r=8$p=1$${salt.toString("base64url")}$${digest.toString("base64url")}`,
        );
      },
    );
  });
}

const loginAttempts = new Map();
function blockedLogin(key) {
  const attempt = loginAttempts.get(key);
  return attempt && attempt.blockedUntil > Date.now() ? attempt.blockedUntil : 0;
}
function failedLogin(key) {
  const now = Date.now();
  const previous = loginAttempts.get(key);
  const count = previous && previous.windowUntil > now ? previous.count + 1 : 1;
  const blockedUntil = count >= 5 ? now + Math.min(15 * 60_000, 30_000 * 2 ** (count - 5)) : 0;
  loginAttempts.set(key, { count, windowUntil: now + 15 * 60_000, blockedUntil });
}

function verifyPassword(password, encodedHash) {
  return new Promise((resolve) => {
    const [prefix, n, r, p, encodedSalt, encodedDigest, extra] = String(encodedHash).split("$");
    if (extra || prefix !== "scrypt" || !n || !r || !p || !encodedSalt || !encodedDigest) {
      resolve(false);
      return;
    }
    const N = Number(n.slice(2));
    const costR = Number(r.slice(2));
    const costP = Number(p.slice(2));
    const salt = Buffer.from(encodedSalt, "base64url");
    const expected = Buffer.from(encodedDigest, "base64url");
    if (
      !Number.isSafeInteger(N) ||
      N < 16_384 ||
      !Number.isSafeInteger(costR) ||
      costR < 1 ||
      !Number.isSafeInteger(costP) ||
      costP < 1 ||
      salt.length < 16 ||
      expected.length !== 32
    ) {
      resolve(false);
      return;
    }
    scryptCallback(
      password.trim(),
      salt,
      expected.length,
      {
        N,
        r: costR,
        p: costP,
        maxmem: 64 * 1024 * 1024,
      },
      (error, actual) => {
        resolve(!error && actual.length === expected.length && timingSafeEqual(actual, expected));
      },
    );
  });
}

async function authenticatedUser(request) {
  const token = sessionToken(request);
  if (!token) return null;
  const result = await pool.query(
    `SELECT u.id::text AS id, u.email, p.display_name AS "displayName", p.pronouns,
            p.username, p.age_years AS "ageYears",
            EXISTS (SELECT 1 FROM gerusa.system_roles sr
                    WHERE sr.user_id=u.id AND sr.system_role='system_master') AS "isSystemMaster",
            EXISTS (SELECT 1 FROM gerusa.mesa_members mm
                    WHERE mm.user_id=u.id AND mm.member_role='mestre' AND mm.membership_status='active') AS "isMaster",
            COALESCE((SELECT json_agg(json_build_object(
              'id', m.id::text, 'slug', m.slug, 'name', m.name,
              'member_role', mm.member_role, 'membership_status', mm.membership_status,
              'campaigns', COALESCE((SELECT json_agg(json_build_object('id', c.id::text, 'name', c.name))
                FROM gerusa.campaigns c WHERE c.mesa_id=m.id AND c.status='active'), '[]'::json)
            ) ORDER BY m.name)
              FROM gerusa.mesa_members mm JOIN gerusa.mesas m ON m.id=mm.mesa_id
              WHERE mm.user_id=u.id AND mm.membership_status='active'), '[]'::json) AS mesas
       FROM gerusa.sessions s
       JOIN gerusa.users u ON u.id=s.user_id
       LEFT JOIN gerusa.profiles p ON p.id=u.id
       WHERE s.token_digest=$1 AND s.revoked_at IS NULL AND s.expires_at>now()
         AND s.last_seen_at > now() - interval '7 days' AND u.status='active'
       LIMIT 1`,
    [tokenDigest(token)],
  );
  if (!result.rowCount) return null;
  await pool.query("UPDATE gerusa.sessions SET last_seen_at=now() WHERE token_digest=$1", [
    tokenDigest(token),
  ]);
  return result.rows[0];
}

async function createThread(userId, mesaId) {
  const result = await pool.query(
    `INSERT INTO gerusa.conversations (user_id, mesa_id)
     SELECT $1, mm.mesa_id FROM gerusa.mesa_members mm
      WHERE mm.user_id=$1 AND mm.mesa_id=$2 AND mm.membership_status='active'
        AND mm.member_role='jogador'
     RETURNING id::text AS id, created_at AS "createdAt"`,
    [userId, mesaId],
  );
  return result.rows[0] ?? null;
}

async function readMessages(threadId, userId) {
  const thread = await pool.query(
    `SELECT c.id FROM gerusa.conversations c
      WHERE c.id=$1 AND (
        c.user_id=$2 OR EXISTS (
          SELECT 1 FROM gerusa.mesa_members mm
          WHERE mm.user_id=$2 AND mm.mesa_id=c.mesa_id
            AND mm.member_role='mestre' AND mm.membership_status='active'
        )
      )`,
    [threadId, userId],
  );
  if (!thread.rowCount) return null;
  const messages = await pool.query(
    `SELECT id::text AS id, role, content, created_at AS "createdAt"
     FROM (
       SELECT id, role, content, created_at
       FROM gerusa.messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 200
     ) recent
     ORDER BY created_at ASC, id ASC`,
    [threadId],
  );
  return messages.rows;
}

async function createMessage(threadId, userId, role, content) {
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const thread = await client.query(
      `SELECT c.id FROM gerusa.conversations c
        WHERE c.id=$1 AND (
          c.user_id=$2 OR EXISTS (
            SELECT 1 FROM gerusa.mesa_members mm
            WHERE mm.user_id=$2 AND mm.mesa_id=c.mesa_id
              AND mm.member_role='mestre' AND mm.membership_status='active'
          )
        ) FOR UPDATE OF c`,
      [threadId, userId],
    );
    if (!thread.rowCount) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return null;
    }
    const inserted = await client.query(
      `INSERT INTO gerusa.messages (conversation_id, role, content)
       VALUES ($1, $2, $3)
       RETURNING id::text AS id, role, content, created_at AS "createdAt"`,
      [threadId, role, content],
    );
    await client.query("UPDATE gerusa.conversations SET updated_at = now() WHERE id = $1", [
      threadId,
    ]);
    await client.query("COMMIT");
    transactionOpen = false;
    return inserted.rows[0];
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

const server = createServer(async (request, response) => {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  try {
    if (request.method === "GET" && url.pathname === "/health") {
      const identity = await pool.query("SELECT current_database() AS db, current_user AS role");
      const healthy = identity.rows[0]?.db === "gerusa" && identity.rows[0]?.role === "gerusa";
      return sendJson(response, healthy ? 200 : 503, { status: healthy ? "ok" : "unavailable" });
    }

    if (!authorized(request)) return sendJson(response, 401, { error: "unauthorized" });

    if (request.method === "GET" && url.pathname === "/setup/status") {
      const result = await pool.query(
        `SELECT NOT EXISTS (
           SELECT 1 FROM gerusa.system_roles sr JOIN gerusa.users u ON u.id=sr.user_id
            WHERE sr.system_role='system_master' AND u.status='active'
         ) AS available`,
      );
      return sendJson(response, 200, { available: result.rows[0].available });
    }

    if (request.method === "POST" && url.pathname === "/setup/initialize") {
      const body = await readJson(request);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const identifier =
        typeof body.identifier === "string" ? normalizeIdentifier(body.identifier) : "";
      const password = typeof body.secret === "string" ? body.secret : "";
      if (
        Object.keys(body).some((key) => !["name", "identifier", "secret"].includes(key)) ||
        name.length < 2 ||
        name.length > 60 ||
        !identifier.includes("@") ||
        !validIdentifier(identifier) ||
        password.length < 12 ||
        password.length > 256
      ) {
        return sendJson(response, 400, { error: "invalid_setup" });
      }
      const client = await pool.connect();
      let open = false;
      try {
        await client.query("BEGIN");
        open = true;
        await client.query("SELECT pg_advisory_xact_lock(hashtext('gerusa-first-system-master'))");
        const existing = await client.query(
          `SELECT 1 FROM gerusa.system_roles sr JOIN gerusa.users u ON u.id=sr.user_id
            WHERE sr.system_role='system_master' AND u.status='active' LIMIT 1`,
        );
        if (existing.rowCount) {
          await client.query("ROLLBACK");
          open = false;
          return sendJson(response, 409, { error: "setup_closed" });
        }
        const userId = randomUUID();
        const token = randomBytes(32).toString("base64url");
        const recoveryCode = randomBytes(18).toString("base64url").toUpperCase();
        const passwordHash = await hashPassword(password);
        const recoveryHash = await hashPassword(recoveryCode);
        await client.query("INSERT INTO gerusa.users (id,email) VALUES ($1,$2)", [
          userId,
          identifier,
        ]);
        await client.query(
          "INSERT INTO gerusa.profiles (id,display_name,onboarding_completed) VALUES ($1,$2,true)",
          [userId, name],
        );
        await client.query(
          "INSERT INTO gerusa.credentials (user_id,credential_lookup_digest,credential_hash,recovery_hash) VALUES ($1,$2,$3,$4)",
          [userId, credentialDigest(identifier, password), passwordHash, recoveryHash],
        );
        await client.query(
          "INSERT INTO gerusa.system_roles (user_id,system_role) VALUES ($1,'system_master')",
          [userId],
        );
        const mesaId = randomUUID();
        const slug = `mesa-${mesaId.slice(0, 8)}`;
        await client.query(
          "INSERT INTO gerusa.mesas (id,slug,name) VALUES ($1,$2,'Minha primeira mesa')",
          [mesaId, slug],
        );
        await client.query(
          "INSERT INTO gerusa.mesa_members (mesa_id,user_id,member_role) VALUES ($1,$2,'mestre')",
          [mesaId, userId],
        );
        await client.query(
          "INSERT INTO gerusa.sessions (user_id,token_digest,expires_at) VALUES ($1,$2,now()+interval '30 days')",
          [userId, tokenDigest(token)],
        );
        await client.query("COMMIT");
        open = false;
        return sendJson(response, 201, { token, recoveryCode, user: { id: userId } });
      } catch (error) {
        if (open) await client.query("ROLLBACK").catch(() => {});
        if (error?.code === "23505")
          return sendJson(response, 409, { error: "identifier_unavailable" });
        throw error;
      } finally {
        client.release();
      }
    }

    if (request.method === "POST" && url.pathname === "/auth/login") {
      const body = await readJson(request);
      const identifier =
        typeof body.identifier === "string" ? normalizeIdentifier(body.identifier) : "";
      const secretValue = typeof body.secret === "string" ? body.secret.trim() : "";
      const legacy = typeof body.email === "string" && typeof body.password === "string";
      const loginIdentifier = identifier || (legacy ? normalizeIdentifier(body.email) : "");
      const loginSecret = secretValue || (legacy ? body.password.trim() : "");
      const attemptKey = identifierDigest(loginIdentifier || "invalid");
      if (
        Object.keys(body).some(
          (key) => !["identifier", "secret", "email", "password"].includes(key),
        ) ||
        !validIdentifier(loginIdentifier) ||
        loginSecret.length < 6 ||
        loginSecret.length > 256 ||
        (!loginIdentifier.includes("@") && !/^\d{6}$/.test(loginSecret))
      ) {
        return sendJson(response, 400, { error: "invalid_credentials" });
      }
      if (blockedLogin(attemptKey))
        return sendJson(response, 429, { error: "invalid_credentials" });
      const credentials = await pool.query(
        `SELECT u.id::text AS id, c.credential_hash
           FROM gerusa.credentials c JOIN gerusa.users u ON u.id=c.user_id
          WHERE (c.login_identifier_digest=$1 OR c.credential_lookup_digest=$2)
            AND c.revoked_at IS NULL AND u.status='active'
          LIMIT 1`,
        [identifierDigest(loginIdentifier), credentialDigest(loginIdentifier, loginSecret)],
      );
      if (
        !credentials.rowCount ||
        !(await verifyPassword(loginSecret, credentials.rows[0].credential_hash))
      ) {
        failedLogin(attemptKey);
        return sendJson(response, 401, { error: "invalid_credentials" });
      }
      loginAttempts.delete(attemptKey);
      const token = randomBytes(32).toString("base64url");
      const sessionId = randomUUID();
      await pool.query(
        `INSERT INTO gerusa.sessions (id, user_id, token_digest, expires_at)
         VALUES ($1, $2, $3, now() + interval '30 days')`,
        [sessionId, credentials.rows[0].id, tokenDigest(token)],
      );
      return sendJson(response, 200, { token, user: { id: credentials.rows[0].id } });
    }

    if (request.method === "POST" && url.pathname === "/auth/change-password") {
      const user = await authenticatedUser(request);
      if (!user) return sendJson(response, 401, { error: "unauthorized" });
      if (!user.email) return sendJson(response, 409, { error: "password_change_unavailable" });
      const body = await readJson(request);
      const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      if (
        Object.keys(body).some((key) => !["currentPassword", "newPassword"].includes(key)) ||
        currentPassword.length < 8 ||
        newPassword.length < 12 ||
        newPassword.length > 256
      )
        return sendJson(response, 400, { error: "invalid_password" });
      const current = await pool.query(
        `SELECT credential_hash FROM gerusa.credentials WHERE user_id=$1 AND credential_lookup_digest=$2 AND revoked_at IS NULL LIMIT 1`,
        [user.id, credentialDigest(user.email, currentPassword)],
      );
      if (
        !current.rowCount ||
        !(await verifyPassword(currentPassword, current.rows[0].credential_hash))
      )
        return sendJson(response, 401, { error: "invalid_password" });
      const nextHash = await hashPassword(newPassword);
      const token = sessionToken(request);
      await pool.query(
        `UPDATE gerusa.credentials SET credential_lookup_digest=$1,credential_hash=$2,updated_at=now() WHERE user_id=$3 AND revoked_at IS NULL`,
        [credentialDigest(user.email, newPassword), nextHash, user.id],
      );
      await pool.query(
        `UPDATE gerusa.sessions SET revoked_at=now() WHERE user_id=$1 AND token_digest<>$2 AND revoked_at IS NULL`,
        [user.id, tokenDigest(token)],
      );
      return sendJson(response, 200, { ok: true });
    }

    if (request.method === "POST" && url.pathname === "/auth/recover") {
      const body = await readJson(request);
      const identifier =
        typeof body.identifier === "string" ? normalizeIdentifier(body.identifier) : "";
      const recoveryCode =
        typeof body.recoveryCode === "string" ? body.recoveryCode.trim().toUpperCase() : "";
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      if (
        Object.keys(body).some(
          (key) => !["identifier", "recoveryCode", "newPassword"].includes(key),
        ) ||
        !validIdentifier(identifier) ||
        !identifier.includes("@") ||
        recoveryCode.length < 16 ||
        recoveryCode.length > 128 ||
        newPassword.length < 12 ||
        newPassword.length > 256
      )
        return sendJson(response, 400, { error: "invalid_recovery" });
      const attemptKey = identifierDigest(identifier);
      if (blockedLogin(attemptKey)) return sendJson(response, 429, { error: "invalid_recovery" });
      const credential = await pool.query(
        `SELECT c.user_id::text AS user_id,c.recovery_hash FROM gerusa.credentials c
          JOIN gerusa.users u ON u.id=c.user_id
          JOIN gerusa.system_roles sr ON sr.user_id=u.id AND sr.system_role='system_master'
         WHERE lower(u.email)=lower($1) AND u.status='active' AND c.revoked_at IS NULL AND c.recovery_hash IS NOT NULL LIMIT 1`,
        [identifier],
      );
      if (
        !credential.rowCount ||
        !(await verifyPassword(recoveryCode, credential.rows[0].recovery_hash))
      ) {
        failedLogin(attemptKey);
        return sendJson(response, 401, { error: "invalid_recovery" });
      }
      const passwordHash = await hashPassword(newPassword);
      const client = await pool.connect();
      let open = false;
      try {
        await client.query("BEGIN");
        open = true;
        const updated = await client.query(
          `UPDATE gerusa.credentials SET credential_lookup_digest=$1,credential_hash=$2,recovery_hash=NULL,updated_at=now()
            WHERE user_id=$3 AND recovery_hash=$4 AND revoked_at IS NULL RETURNING user_id`,
          [
            credentialDigest(identifier, newPassword),
            passwordHash,
            credential.rows[0].user_id,
            credential.rows[0].recovery_hash,
          ],
        );
        if (!updated.rowCount) {
          await client.query("ROLLBACK");
          open = false;
          failedLogin(attemptKey);
          return sendJson(response, 401, { error: "invalid_recovery" });
        }
        await client.query(
          "UPDATE gerusa.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
          [credential.rows[0].user_id],
        );
        await client.query("COMMIT");
        open = false;
      } catch (error) {
        if (open) await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
      loginAttempts.delete(attemptKey);
      return sendJson(response, 200, { ok: true });
    }

    if (request.method === "GET" && url.pathname === "/auth/session") {
      const user = await authenticatedUser(request);
      return user
        ? sendJson(response, 200, { user })
        : sendJson(response, 401, { error: "unauthorized" });
    }

    if (request.method === "POST" && url.pathname === "/auth/logout") {
      const token = sessionToken(request);
      if (token)
        await pool.query(
          "UPDATE gerusa.sessions SET revoked_at=now() WHERE token_digest=$1 AND revoked_at IS NULL",
          [tokenDigest(token)],
        );
      return sendJson(response, 200, { ok: true });
    }

    if (url.pathname.startsWith("/pedagogy")) {
      const user = await authenticatedUser(request);
      if (!user) return sendJson(response, 401, { error: "unauthorized" });
      if (request.method === "GET" && url.pathname === "/pedagogy")
        return sendJson(response, 200, await getPedagogyView(pool, user, url.searchParams));
      if (request.method === "GET" && url.pathname === "/pedagogy/ai-context")
        return sendJson(response, 200, {
          context: await getPedagogyAiContext(pool, user, url.searchParams),
        });
      if (request.method === "POST" && url.pathname === "/pedagogy")
        return sendJson(response, 200, await mutatePedagogy(pool, user, await readJson(request)));
      return sendJson(response, 404, { error: "not_found" });
    }

    if (url.pathname === "/profile" && request.method === "GET") {
      const user = await authenticatedUser(request);
      return user
        ? sendJson(response, 200, { profile: user })
        : sendJson(response, 401, { error: "unauthorized" });
    }

    if (url.pathname === "/profile" && request.method === "PUT") {
      const user = await authenticatedUser(request);
      if (!user) return sendJson(response, 401, { error: "unauthorized" });
      const body = await readJson(request);
      const allowed = ["display_name", "pronouns"];
      if (
        Object.keys(body).some((key) => !allowed.includes(key)) ||
        !(
          body.display_name === undefined ||
          body.display_name === null ||
          (typeof body.display_name === "string" && body.display_name.trim().length <= 60)
        ) ||
        !(
          body.pronouns === undefined ||
          body.pronouns === null ||
          (typeof body.pronouns === "string" && body.pronouns.trim().length <= 80)
        )
      ) {
        return sendJson(response, 400, { error: "invalid_profile" });
      }
      const profile = await pool.query(
        `INSERT INTO gerusa.profiles (id, display_name, pronouns)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           display_name=COALESCE(EXCLUDED.display_name, gerusa.profiles.display_name),
           pronouns=COALESCE(EXCLUDED.pronouns, gerusa.profiles.pronouns), updated_at=now()
         RETURNING id::text AS id, display_name, pronouns, avatar_url`,
        [user.id, body.display_name?.trim() || null, body.pronouns?.trim() || null],
      );
      return sendJson(response, 200, { profile: profile.rows[0] });
    }

    if (url.pathname === "/admin/students" || url.pathname.startsWith("/admin/students/")) {
      const master = await authenticatedUser(request);
      if (!master) return sendJson(response, 401, { error: "unauthorized" });
      if (!master.isSystemMaster && !master.isMaster)
        return sendJson(response, 403, { error: "forbidden" });

      if (request.method === "GET" && url.pathname === "/admin/students") {
        const result = await pool.query(
          `SELECT u.id::text AS id,p.display_name AS name,p.age_years AS age,COALESCE(p.username,u.email) AS username,u.status,
                  m.id::text AS "mesaId",m.name AS "mesaName",c.name AS "campaignName",
                  (SELECT max(s.last_seen_at) FROM gerusa.sessions s WHERE s.user_id=u.id AND s.revoked_at IS NULL) AS "lastAccess"
             FROM gerusa.users u JOIN gerusa.profiles p ON p.id=u.id
             JOIN gerusa.mesa_members mm ON mm.user_id=u.id AND mm.member_role='jogador'
             JOIN gerusa.mesas m ON m.id=mm.mesa_id
             LEFT JOIN LATERAL (SELECT name FROM gerusa.campaigns WHERE mesa_id=m.id AND status='active' ORDER BY updated_at DESC LIMIT 1) c ON true
            WHERE u.id<>$1 AND EXISTS (SELECT 1 FROM gerusa.mesa_members own WHERE own.user_id=$1 AND own.mesa_id=m.id AND own.member_role='mestre' AND own.membership_status='active')
            ORDER BY p.display_name,m.name`,
          [master.id],
        );
        return sendJson(response, 200, { students: result.rows });
      }

      if (request.method === "POST" && url.pathname === "/admin/students") {
        const body = await readJson(request);
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const username =
          typeof body.username === "string" ? normalizeIdentifier(body.username) : "";
        const pin = typeof body.pin === "string" ? body.pin : "";
        const age =
          body.age === undefined || body.age === null || body.age === "" ? null : Number(body.age);
        const mesaId = typeof body.mesaId === "string" ? body.mesaId : null;
        const campaignId = typeof body.campaignId === "string" ? body.campaignId : null;
        const note = typeof body.note === "string" ? body.note.trim() : "";
        if (
          Object.keys(body).some(
            (key) =>
              !["name", "username", "pin", "age", "mesaId", "campaignId", "note"].includes(key),
          ) ||
          name.length < 2 ||
          name.length > 60 ||
          !/^[a-z0-9][a-z0-9._-]{1,39}$/.test(username) ||
          !/^\d{6}$/.test(pin) ||
          (age !== null && (!Number.isInteger(age) || age < 5 || age > 120)) ||
          note.length > 2000
        ) {
          return sendJson(response, 400, { error: "invalid_student" });
        }
        const client = await pool.connect();
        let open = false;
        try {
          await client.query("BEGIN");
          open = true;
          const mesa = mesaId
            ? await client.query(
                `SELECT m.id FROM gerusa.mesas m JOIN gerusa.mesa_members mm ON mm.mesa_id=m.id WHERE m.id=$1 AND mm.user_id=$2 AND mm.member_role='mestre' AND mm.membership_status='active'`,
                [mesaId, master.id],
              )
            : await client.query(
                `SELECT m.id FROM gerusa.mesas m JOIN gerusa.mesa_members mm ON mm.mesa_id=m.id WHERE mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active' ORDER BY m.created_at LIMIT 1`,
                [master.id],
              );
          if (!mesa.rowCount) {
            await client.query("ROLLBACK");
            open = false;
            return sendJson(response, 409, { error: "mesa_required" });
          }
          if (campaignId) {
            const campaign = await client.query(
              "SELECT id FROM gerusa.campaigns WHERE id=$1 AND mesa_id=$2 AND status='active'",
              [campaignId, mesa.rows[0].id],
            );
            if (!campaign.rowCount) {
              await client.query("ROLLBACK");
              open = false;
              return sendJson(response, 409, { error: "campaign_unavailable" });
            }
          }
          const userId = randomUUID();
          const passHash = await hashPassword(pin);
          await client.query("INSERT INTO gerusa.users (id) VALUES ($1)", [userId]);
          await client.query(
            "INSERT INTO gerusa.profiles (id,display_name,username,age_years,teacher_note,onboarding_completed) VALUES ($1,$2,$3,$4,$5,true)",
            [userId, name, username, age, note || null],
          );
          await client.query(
            `INSERT INTO gerusa.credentials (user_id,credential_lookup_digest,login_identifier_digest,credential_hash) VALUES ($1,$2,$3,$4)`,
            [userId, credentialDigest(username, pin), identifierDigest(username), passHash],
          );
          await client.query(
            `INSERT INTO gerusa.mesa_members (mesa_id,user_id,member_role,membership_status) VALUES ($1,$2,'jogador','active')`,
            [mesa.rows[0].id, userId],
          );
          await client.query(
            `INSERT INTO gerusa.characters (owner_user_id,mesa_id,campaign_id,name,sheet) VALUES ($1,$2,$3,$4,'{}'::jsonb)`,
            [userId, mesa.rows[0].id, campaignId, name],
          );
          await client.query(
            "INSERT INTO gerusa.user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING",
            [userId],
          );
          await client.query("COMMIT");
          open = false;
          return sendJson(response, 201, {
            student: { id: userId, name, age, username, status: "active", mesaId: mesa.rows[0].id },
            pin,
          });
        } catch (error) {
          if (open) await client.query("ROLLBACK").catch(() => {});
          if (error?.code === "23505")
            return sendJson(response, 409, { error: "username_unavailable" });
          throw error;
        } finally {
          client.release();
        }
      }

      const studentId = url.pathname.match(/^\/admin\/students\/([0-9a-f-]+)$/i)?.[1];
      if (studentId && request.method === "PATCH" && threadIdPattern.test(studentId)) {
        const body = await readJson(request);
        if (Object.keys(body).length !== 1 || !["resetPin", "status"].some((key) => key in body))
          return sendJson(response, 400, { error: "invalid_student_action" });
        const owned = await pool.query(
          `SELECT u.id FROM gerusa.users u WHERE u.id=$1 AND NOT EXISTS (SELECT 1 FROM gerusa.system_roles sr WHERE sr.user_id=u.id)
            AND EXISTS (SELECT 1 FROM gerusa.mesa_members own JOIN gerusa.mesa_members target USING (mesa_id) WHERE own.user_id=$2 AND own.member_role='mestre' AND own.membership_status='active' AND target.user_id=u.id AND target.member_role='jogador')`,
          [studentId, master.id],
        );
        if (!owned.rowCount) return sendJson(response, 404, { error: "student_not_found" });
        if (body.resetPin === true) {
          const pin = randomBytes(4).readUInt32BE(0).toString().padStart(10, "0").slice(-6);
          const passHash = await hashPassword(pin);
          const profile = await pool.query(
            "SELECT username,display_name FROM gerusa.profiles WHERE id=$1",
            [studentId],
          );
          let username = profile.rows[0]?.username;
          if (!username) {
            const stem =
              normalizeIdentifier(profile.rows[0]?.display_name ?? "aluno")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9._-]/g, "")
                .slice(0, 34) || "aluno";
            username = stem;
            let suffix = 2;
            while (
              (
                await pool.query("SELECT 1 FROM gerusa.profiles WHERE lower(username)=lower($1)", [
                  username,
                ])
              ).rowCount
            ) {
              username = `${stem.slice(0, 36)}${suffix++}`;
            }
            await pool.query(
              "UPDATE gerusa.profiles SET username=$1,updated_at=now() WHERE id=$2",
              [username, studentId],
            );
          }
          await pool.query(
            `UPDATE gerusa.credentials SET credential_lookup_digest=$1,login_identifier_digest=$2,credential_hash=$3,updated_at=now() WHERE user_id=$4 AND revoked_at IS NULL`,
            [credentialDigest(username, pin), identifierDigest(username), passHash, studentId],
          );
          await pool.query(
            "UPDATE gerusa.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
            [studentId],
          );
          return sendJson(response, 200, { pin });
        }
        if (!["active", "disabled"].includes(body.status))
          return sendJson(response, 400, { error: "invalid_status" });
        await pool.query(
          "UPDATE gerusa.users SET status=$1,disabled_at=CASE WHEN $1='disabled' THEN now() ELSE NULL END,updated_at=now() WHERE id=$2",
          [body.status, studentId],
        );
        if (body.status === "disabled")
          await pool.query(
            "UPDATE gerusa.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
            [studentId],
          );
        return sendJson(response, 200, { ok: true, status: body.status });
      }
      return sendJson(response, 404, { error: "not_found" });
    }

    if (url.pathname === "/master/summary" && request.method === "GET") {
      const user = await authenticatedUser(request);
      if (!user) return sendJson(response, 401, { error: "unauthorized" });
      if (!user.isMaster && !user.isSystemMaster)
        return sendJson(response, 403, { error: "forbidden" });
      const students = await pool.query(
        `SELECT u.id::text AS id, p.display_name AS name, u.email,
                m.id::text AS "mesaId", m.name AS "mesaName",
                (SELECT co.id::text FROM gerusa.conversations co
                  WHERE co.user_id=u.id AND co.mesa_id=m.id
                  ORDER BY co.updated_at DESC, co.id DESC LIMIT 1) AS "threadId",
                COALESCE((SELECT json_agg(json_build_object('id', c.id::text, 'name', c.name))
                  FROM gerusa.campaigns c WHERE c.mesa_id=m.id AND c.status='active'), '[]'::json) AS campaigns
           FROM gerusa.mesa_members master_mm
           JOIN gerusa.mesa_members student_mm ON student_mm.mesa_id=master_mm.mesa_id
             AND student_mm.member_role='jogador' AND student_mm.membership_status='active'
           JOIN gerusa.users u ON u.id=student_mm.user_id AND u.status='active'
           JOIN gerusa.profiles p ON p.id=u.id
           JOIN gerusa.mesas m ON m.id=master_mm.mesa_id
          WHERE master_mm.user_id=$1 AND master_mm.member_role='mestre'
            AND master_mm.membership_status='active'
          ORDER BY p.display_name, m.name`,
        [user.id],
      );
      const mesas = await pool.query(
        `SELECT m.id::text AS id, m.slug, m.name
           FROM gerusa.mesas m JOIN gerusa.mesa_members mm ON mm.mesa_id=m.id
          WHERE mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active'
          ORDER BY m.name`,
        [user.id],
      );
      const campaigns = await pool.query(
        `SELECT c.id::text AS id, c.mesa_id::text AS "mesaId", m.name AS "mesaName",
                c.name, c.status
           FROM gerusa.campaigns c JOIN gerusa.mesas m ON m.id=c.mesa_id
           JOIN gerusa.mesa_members mm ON mm.mesa_id=m.id
          WHERE mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active'
            AND c.status='active'
          ORDER BY c.name`,
        [user.id],
      );
      return sendJson(response, 200, {
        students: students.rows,
        mesas: mesas.rows,
        campaigns: campaigns.rows,
      });
    }

    if (request.method === "POST" && url.pathname === "/threads") {
      const body = await readJson(request);
      if (Object.keys(body).length) return sendJson(response, 400, { error: "invalid_request" });
      const user = await authenticatedUser(request);
      if (!user) return sendJson(response, 401, { error: "unauthorized" });
      const mesaId = user.mesas.find((mesa) => mesa.member_role === "jogador")?.id;
      if (!mesaId) return sendJson(response, 409, { error: "active_player_mesa_required" });
      const thread = await createThread(user.id, mesaId);
      if (!thread) return sendJson(response, 409, { error: "active_player_mesa_required" });
      return sendJson(response, 201, { thread });
    }

    const messagesMatch = url.pathname.match(/^\/threads\/([^/]+)\/messages$/);
    if (messagesMatch) {
      const threadId = messagesMatch[1];
      if (!threadIdPattern.test(threadId))
        return sendJson(response, 400, { error: "invalid_thread" });

      const user = await authenticatedUser(request);
      if (!user) return sendJson(response, 401, { error: "unauthorized" });

      if (request.method === "GET") {
        const messages = await readMessages(threadId, user.id);
        if (!messages) return sendJson(response, 404, { error: "thread_not_found" });
        return sendJson(response, 200, { messages });
      }

      if (request.method === "POST") {
        const body = await readJson(request);
        const role = body.role;
        const content = typeof body.content === "string" ? body.content.trim() : "";
        const maxLength = role === "assistant" ? 20_000 : 4_000;
        if (
          Object.keys(body).some((key) => !["role", "content"].includes(key)) ||
          !["user", "assistant"].includes(role) ||
          content.length < 1 ||
          content.length > maxLength
        ) {
          return sendJson(response, 400, { error: "invalid_message" });
        }
        const message = await createMessage(threadId, user.id, role, content);
        if (!message) return sendJson(response, 404, { error: "thread_not_found" });
        return sendJson(response, 201, { message });
      }
    }

    return sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    const status = Number(error?.status) || 503;
    if (status >= 500) {
      console.error(JSON.stringify({ type: "gerusa_core_error", request_id: requestId }));
    }
    return sendJson(response, status, {
      error: status >= 500 ? "core_unavailable" : error.message,
    });
  }
});

server.listen(port, host, () => {
  console.log(JSON.stringify({ type: "gerusa_core_started", host, port }));
});

async function shutdown(signal) {
  console.log(JSON.stringify({ type: "gerusa_core_stopping", signal }));
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
