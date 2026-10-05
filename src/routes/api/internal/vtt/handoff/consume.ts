import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { consumeVttHandoff } from "@/server/local-core/vtt-handoff";

const headers = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/internal/vtt/handoff/consume")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.KALLISTIS_VTT_SERVICE_SECRET;
        if (!secret || request.headers.get("authorization") !== "Bearer " + secret)
          return Response.json(
            { valid: false, error: "service_unauthorized" },
            { status: 401, headers },
          );
        const body = await request.json().catch(() => null);
        const code =
          body && typeof body === "object" && typeof (body as { code?: unknown }).code === "string"
            ? (body as { code: string }).code
            : "";
        const databaseUrl = getRuntimeDatabaseUrl();
        if (!databaseUrl)
          return Response.json(
            { valid: false, error: "database_unavailable" },
            { status: 503, headers },
          );
        const sql = createBunPostgresExecutor(databaseUrl);
        try {
          const handoff = await consumeVttHandoff(sql, code);
          if (!handoff)
            return Response.json(
              { valid: false, error: "invalid_or_expired_handoff" },
              { status: 401, headers },
            );
          return Response.json({ valid: true, ...handoff }, { headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
