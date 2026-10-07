import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { createGerusaPool, isSameOrigin, THREAD_ID_PATTERN } from "@/server/gerusa/store";

const jsonHeaders = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/gerusa/thread")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers: jsonHeaders });
        }

        const raw = await request.text();
        if (raw.length > 1024) {
          return Response.json({ error: "invalid_request" }, { status: 413, headers: jsonHeaders });
        }
        try {
          if (raw.trim() && JSON.stringify(JSON.parse(raw)) !== "{}") {
            return Response.json(
              { error: "invalid_request" },
              { status: 400, headers: jsonHeaders },
            );
          }
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400, headers: jsonHeaders });
        }

        let pool;
        try {
          pool = createGerusaPool();
          const threadId = randomUUID();
          await pool.query("INSERT INTO gerusa.conversations (id) VALUES ($1)", [threadId]);
          return Response.json({ threadId }, { headers: jsonHeaders });
        } catch {
          return Response.json(
            { error: "thread_unavailable" },
            { status: 503, headers: jsonHeaders },
          );
        } finally {
          await pool?.end().catch(() => {});
        }
      },
      GET: async ({ request }) => {
        const threadId = new URL(request.url).searchParams.get("threadId") ?? "";
        if (!THREAD_ID_PATTERN.test(threadId)) {
          return Response.json({ error: "invalid_thread" }, { status: 400, headers: jsonHeaders });
        }

        let pool;
        try {
          pool = createGerusaPool();
          const thread = await pool.query(
            'SELECT id, created_at AS "createdAt" FROM gerusa.conversations WHERE id = $1',
            [threadId],
          );
          if (!thread.rowCount) {
            return Response.json(
              { error: "thread_not_found" },
              { status: 404, headers: jsonHeaders },
            );
          }
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
          return Response.json(
            { thread: thread.rows[0], messages: messages.rows },
            { headers: jsonHeaders },
          );
        } catch {
          return Response.json(
            { error: "history_unavailable" },
            { status: 503, headers: jsonHeaders },
          );
        } finally {
          await pool?.end().catch(() => {});
        }
      },
    },
  },
});
