import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeDatabaseUrl, getRuntimeEnv } from "@/server/runtime/context";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { isSystemMaster } from "@/server/local-core/player-access";
import { issueRecoveryCode } from "@/server/recovery-code.server";

const headers = { "Cache-Control": "no-store" };

function expectedOrigin(): string {
  return getRuntimeEnv().publicOrigin || "https://kallistis.app";
}

export const Route = createFileRoute("/api/admin/recovery-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request, expectedOrigin())) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        }
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const databaseUrl = getRuntimeDatabaseUrl();
        if (!databaseUrl)
          return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        const sql = createBunPostgresExecutor(databaseUrl);
        try {
          if (!(await isSystemMaster(sql, auth.userId))) {
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          }
          const body = (await request.json().catch(() => null)) as { user_id?: unknown } | null;
          const userId =
            typeof body?.user_id === "string" && body.user_id.trim()
              ? body.user_id.trim()
              : auth.userId;
          const recoveryCode = await issueRecoveryCode(sql, userId);
          return Response.json({ ok: true, recoveryCode }, { status: 201, headers });
        } catch (error) {
          const message = error instanceof Error ? error.message : "recovery_code_admin_failed";
          const status =
            message === "recovery_target_not_found"
              ? 404
              : message === "recovery_pepper_not_configured"
                ? 503
                : 400;
          return Response.json(
            { error: status === 404 ? "not_found" : "recovery_code_admin_failed" },
            { status, headers },
          );
        } finally {
          sql.close();
        }
      },
    },
  },
});
