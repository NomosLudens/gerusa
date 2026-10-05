import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  isSystemMaster,
  setPlayerAccessStatus,
  type PlayerAccessAction,
} from "@/server/local-core/player-access";

const headers = { "Cache-Control": "no-store" };
const expectedOrigin = () => process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

export const Route = createFileRoute("/api/admin/player-access-status")({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        if (!isSameOriginRequest(request, expectedOrigin())) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        }
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await isSystemMaster(sql, auth.userId))) {
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          }
          const body = (await request.json().catch(() => null)) as {
            user_id?: unknown;
            action?: unknown;
            reason?: unknown;
          } | null;
          if (
            !body ||
            typeof body.user_id !== "string" ||
            (body.action !== "revoke" && body.action !== "restore") ||
            !(body.reason === undefined || body.reason === null || typeof body.reason === "string")
          ) {
            return Response.json(
              { error: "invalid_player_access_status" },
              { status: 400, headers },
            );
          }
          const reason = typeof body.reason === "string" ? body.reason.trim() : null;
          if (reason && reason.length > 500) {
            return Response.json(
              { error: "invalid_player_access_reason" },
              { status: 400, headers },
            );
          }
          const result = await setPlayerAccessStatus(
            sql,
            auth.userId,
            body.user_id,
            body.action as PlayerAccessAction,
            reason,
          );
          return Response.json(
            { ok: true, user_id: result.target_user_id, status: result.access_status },
            { headers },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "player_access_status_failed";
          const status =
            message === "player not found" ? 404 : message.includes("forbidden") ? 403 : 400;
          return Response.json({ error: message }, { status, headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
