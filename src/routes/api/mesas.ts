import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { listPlayerPresenceMesas } from "@/server/local-core/presence-repository";

const headers = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/mesas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const url = getRuntimeDatabaseUrl();
        if (!url) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        const sql = createBunPostgresExecutor(url);
        try {
          return Response.json(
            { mesas: await listPlayerPresenceMesas(sql, auth.userId) },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
    },
  },
});
