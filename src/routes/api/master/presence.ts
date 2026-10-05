import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { listPresenceForMasterMesa } from "@/server/local-core/presence-repository";

const headers = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/master/presence")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const mesaId = new URL(request.url).searchParams.get("mesa_id");
        if (!mesaId) return Response.json({ error: "mesa_id_required" }, { status: 400, headers });
        const url = getRuntimeDatabaseUrl();
        if (!url) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        const sql = createBunPostgresExecutor(url);
        try {
          const players = await listPresenceForMasterMesa(sql, auth.userId, mesaId);
          return players
            ? Response.json({ mesa_id: mesaId, players }, { headers })
            : Response.json({ error: "forbidden" }, { status: 403, headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
