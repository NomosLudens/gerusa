import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeDatabaseUrl, getRuntimeEnv } from "@/server/runtime/context";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { recoverWithCode } from "@/server/recovery-code.server";

const headers = { "Cache-Control": "no-store" };

function expectedOrigin(): string {
  return getRuntimeEnv().publicOrigin || "https://kallistis.app";
}

export const Route = createFileRoute("/api/auth/recovery-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request, expectedOrigin())) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        }
        const databaseUrl = getRuntimeDatabaseUrl();
        if (!databaseUrl)
          return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        const body = (await request.json().catch(() => null)) as {
          credential?: unknown;
          recoveryCode?: unknown;
          newPassword?: unknown;
        } | null;
        if (
          !body ||
          typeof body.credential !== "string" ||
          typeof body.recoveryCode !== "string" ||
          typeof body.newPassword !== "string"
        ) {
          return Response.json(
            {
              error: "recovery_failed",
              message:
                "Não foi possível validar a recuperação. Confira os dados e tente novamente.",
            },
            { status: 400, headers },
          );
        }
        const sql = createBunPostgresExecutor(databaseUrl);
        try {
          return await recoverWithCode(sql, request, {
            credential: body.credential,
            recoveryCode: body.recoveryCode,
            newPassword: body.newPassword,
          });
        } catch {
          return Response.json({ error: "recovery_unavailable" }, { status: 503, headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
