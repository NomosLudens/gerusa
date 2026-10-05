import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { listPlayerScenePulse } from "@/server/local-core/mesa-live-session-repository";

const headers = { "Cache-Control": "no-store" };

function mediaUrl(assetId: string | null) {
  return assetId ? "/api/gallery/file?path=" + encodeURIComponent(assetId) : null;
}

export const Route = createFileRoute("/api/session-pulse")({
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
          const sessions = await listPlayerScenePulse(sql, auth.userId);
          return Response.json(
            {
              sessions: sessions.map((session) => ({
                id: session.id,
                mesaId: session.mesaId,
                mesaName: session.mesaName,
                title: session.title,
                status: session.status,
                discoveries: session.discoveries.map((discovery) => ({
                  id: discovery.id,
                  type: discovery.eventType,
                  title: discovery.title,
                  content: discovery.publicContent,
                  mediaUrl: mediaUrl(discovery.mediaAssetId),
                  revealedAt: discovery.revealedAt,
                })),
              })),
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
