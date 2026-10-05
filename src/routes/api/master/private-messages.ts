import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  getUnreadCount,
  listPrivateMessages,
  listThreadsForMaster,
  markPrivateMessagesRead,
  privateThreadExists,
  sendPrivateMessage,
} from "@/server/local-core/private-messages-repository";
import { resolveResponsibleMaster } from "@/server/local-core/presence-repository";

const headers = { "Cache-Control": "no-store" };
const origin = () => process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}
function invalidText(value: unknown) {
  return typeof value !== "string" || !value.trim() || value.trim().length > 2000;
}
async function canMasterUseThread(
  sql: ReturnType<typeof createBunPostgresExecutor>,
  masterUserId: string,
  playerUserId: string,
) {
  if (await privateThreadExists(sql, playerUserId, masterUserId)) return true;
  const mesas = await sql.query<{ id: string }>(
    "SELECT mesa_id AS id FROM public.mesa_members WHERE user_id=$1 AND member_role='jogador' AND membership_status='active'",
    [playerUserId],
  );
  for (const mesa of mesas) {
    const resolved = await resolveResponsibleMaster(sql, mesa.id);
    if (resolved?.master_user_id === masterUserId) return true;
  }
  return false;
}

export const Route = createFileRoute("/api/master/private-messages")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const url = new URL(request.url);
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const playerUserId = url.searchParams.get("player_user_id");
          if (!playerUserId)
            return Response.json(
              { threads: await listThreadsForMaster(sql, auth.userId) },
              { headers },
            );
          if (!(await canMasterUseThread(sql, auth.userId, playerUserId)))
            return Response.json({ error: "thread_not_found" }, { status: 404, headers });
          const messages = await listPrivateMessages(sql, playerUserId, auth.userId);
          return Response.json(
            {
              player_user_id: playerUserId,
              master_user_id: auth.userId,
              messages,
              unread_count: await getUnreadCount(sql, playerUserId, auth.userId, auth.userId),
            },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request, origin()))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = (await request.json().catch(() => null)) as {
          player_user_id?: unknown;
          body?: unknown;
        } | null;
        if (typeof body?.player_user_id !== "string" || invalidText(body.body))
          return Response.json({ error: "invalid_private_message" }, { status: 400, headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await canMasterUseThread(sql, auth.userId, body.player_user_id)))
            return Response.json({ error: "thread_not_authorized" }, { status: 403, headers });
          const message = await sendPrivateMessage({
            sql,
            playerUserId: body.player_user_id,
            masterUserId: auth.userId,
            senderUserId: auth.userId,
            body: body.body as string,
          });
          return Response.json({ message }, { status: 201, headers });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "private_message_failed" },
            { status: 400, headers },
          );
        } finally {
          sql.close();
        }
      },
      PATCH: async ({ request }) => {
        if (!isSameOriginRequest(request, origin()))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = (await request.json().catch(() => null)) as {
          player_user_id?: unknown;
        } | null;
        if (typeof body?.player_user_id !== "string")
          return Response.json({ error: "player_user_id_required" }, { status: 400, headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await canMasterUseThread(sql, auth.userId, body.player_user_id)))
            return Response.json({ error: "thread_not_authorized" }, { status: 403, headers });
          return Response.json(
            {
              ok: true,
              marked_read: await markPrivateMessagesRead(
                sql,
                body.player_user_id,
                auth.userId,
                auth.userId,
              ),
            },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
    },
  },
});
