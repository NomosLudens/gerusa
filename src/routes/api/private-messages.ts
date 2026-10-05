import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  getPresenceForPlayerInMesa,
  resolveResponsibleMaster,
} from "@/server/local-core/presence-repository";
import {
  getUnreadCount,
  listPrivateMessages,
  markPrivateMessagesRead,
  sendPrivateMessage,
} from "@/server/local-core/private-messages-repository";

const headers = { "Cache-Control": "no-store" };
const origin = () => process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}
function invalidText(value: unknown) {
  return typeof value !== "string" || !value.trim() || value.trim().length > 2000;
}

export const Route = createFileRoute("/api/private-messages")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const mesaId = new URL(request.url).searchParams.get("mesa_id");
        if (!mesaId) return Response.json({ error: "mesa_id_required" }, { status: 400, headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await getPresenceForPlayerInMesa(sql, auth.userId, mesaId)))
            return Response.json({ error: "mesa_access_denied" }, { status: 403, headers });
          const resolved = await resolveResponsibleMaster(sql, mesaId);
          if (!resolved)
            return Response.json(
              { error: "responsible_master_unavailable" },
              { status: 503, headers },
            );
          const summaryOnly = new URL(request.url).searchParams.get("summary") === "1";
          const messages = summaryOnly
            ? []
            : await listPrivateMessages(sql, auth.userId, resolved.master_user_id);
          return Response.json(
            {
              mesa_id: mesaId,
              master_user_id: resolved.master_user_id,
              messages,
              unread_count: await getUnreadCount(
                sql,
                auth.userId,
                resolved.master_user_id,
                auth.userId,
              ),
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
          mesa_id?: unknown;
          body?: unknown;
        } | null;
        if (typeof body?.mesa_id !== "string" || invalidText(body.body))
          return Response.json({ error: "invalid_private_message" }, { status: 400, headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await getPresenceForPlayerInMesa(sql, auth.userId, body.mesa_id)))
            return Response.json({ error: "mesa_access_denied" }, { status: 403, headers });
          const resolved = await resolveResponsibleMaster(sql, body.mesa_id);
          if (!resolved)
            return Response.json(
              { error: "responsible_master_unavailable" },
              { status: 503, headers },
            );
          const message = await sendPrivateMessage({
            sql,
            playerUserId: auth.userId,
            masterUserId: resolved.master_user_id,
            senderUserId: auth.userId,
            body: body.body as string,
          });
          return Response.json(
            { message, master_user_id: resolved.master_user_id },
            { status: 201, headers },
          );
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
        const body = (await request.json().catch(() => null)) as { mesa_id?: unknown } | null;
        if (typeof body?.mesa_id !== "string")
          return Response.json({ error: "mesa_id_required" }, { status: 400, headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await getPresenceForPlayerInMesa(sql, auth.userId, body.mesa_id)))
            return Response.json({ error: "mesa_access_denied" }, { status: 403, headers });
          const resolved = await resolveResponsibleMaster(sql, body.mesa_id);
          if (!resolved)
            return Response.json(
              { error: "responsible_master_unavailable" },
              { status: 503, headers },
            );
          return Response.json(
            {
              ok: true,
              marked_read: await markPrivateMessagesRead(
                sql,
                auth.userId,
                resolved.master_user_id,
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
