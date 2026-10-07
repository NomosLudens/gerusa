import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Pool } from "pg";

const host = "127.0.0.1";
const port = Number(process.env.GERUSA_CORE_PORT || 4530);
const secret = process.env.GERUSA_CORE_SECRET;
const databaseUrl = process.env.GERUSA_DATABASE_URL;
const threadIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxBodyBytes = 16_384;

if (!secret || secret.length < 32) throw new Error("GERUSA_CORE_SECRET is missing or too short");
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

async function createThread() {
  const result = await pool.query(
    'INSERT INTO gerusa.conversations DEFAULT VALUES RETURNING id::text AS id, created_at AS "createdAt"',
  );
  return result.rows[0];
}

async function readMessages(threadId) {
  const thread = await pool.query("SELECT id FROM gerusa.conversations WHERE id = $1", [threadId]);
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

async function createMessage(threadId, role, content) {
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const thread = await client.query(
      "SELECT id FROM gerusa.conversations WHERE id = $1 FOR UPDATE",
      [threadId],
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

    if (request.method === "POST" && url.pathname === "/threads") {
      const body = await readJson(request);
      if (Object.keys(body).length) return sendJson(response, 400, { error: "invalid_request" });
      return sendJson(response, 201, { thread: await createThread() });
    }

    const messagesMatch = url.pathname.match(/^\/threads\/([^/]+)\/messages$/);
    if (messagesMatch) {
      const threadId = messagesMatch[1];
      if (!threadIdPattern.test(threadId))
        return sendJson(response, 400, { error: "invalid_thread" });

      if (request.method === "GET") {
        const messages = await readMessages(threadId);
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
        const message = await createMessage(threadId, role, content);
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
