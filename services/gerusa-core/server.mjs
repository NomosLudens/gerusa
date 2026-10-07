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

const host = "127.0.0.1";
const port = Number(process.env.GERUSA_CORE_PORT || 4530);
const secret = process.env.GERUSA_CORE_SECRET;
const databaseUrl = process.env.GERUSA_DATABASE_URL;
const credentialLookupKey = process.env.GERUSA_CREDENTIAL_LOOKUP_KEY;
const threadIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxBodyBytes = 16_384;

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

    if (request.method === "POST" && url.pathname === "/auth/login") {
      const body = await readJson(request);
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password.trim() : "";
      if (
        Object.keys(body).some((key) => !["email", "password"].includes(key)) ||
        !email ||
        email.length > 254 ||
        password.length < 8 ||
        password.length > 256
      ) {
        return sendJson(response, 400, { error: "invalid_credentials" });
      }
      const credentials = await pool.query(
        `SELECT u.id::text AS id, c.credential_hash
           FROM gerusa.credentials c JOIN gerusa.users u ON u.id=c.user_id
          WHERE c.credential_lookup_digest=$1 AND c.revoked_at IS NULL AND u.status='active'
          LIMIT 1`,
        [credentialDigest(email, password)],
      );
      if (
        !credentials.rowCount ||
        !(await verifyPassword(password, credentials.rows[0].credential_hash))
      )
        return sendJson(response, 401, { error: "invalid_credentials" });
      const token = randomBytes(32).toString("base64url");
      const sessionId = randomUUID();
      await pool.query(
        `INSERT INTO gerusa.sessions (id, user_id, token_digest, expires_at)
         VALUES ($1, $2, $3, now() + interval '30 days')`,
        [sessionId, credentials.rows[0].id, tokenDigest(token)],
      );
      return sendJson(response, 200, { token, user: { id: credentials.rows[0].id } });
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
