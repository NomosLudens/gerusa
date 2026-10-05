import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { listPublishedContinuityMaps } from "@/server/local-core/continuity-maps";

const headers = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/continuity-maps")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const databaseUrl = getRuntimeDatabaseUrl();
        if (!databaseUrl)
          return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        const sql = createBunPostgresExecutor(databaseUrl);
        try {
          const maps = await listPublishedContinuityMaps(sql, auth.userId);
          return Response.json({ maps }, { headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
