import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  assertPresenceState,
  getPresenceForPlayerInMesa,
  listPlayerPresenceMesas,
  upsertPresenceForPlayerInMesa,
  type PresenceState,
} from "@/server/local-core/presence-repository";

const headers = { "Cache-Control": "no-store" };
const origin = () => process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

export const Route = createFileRoute("/api/presence")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const mesas = await listPlayerPresenceMesas(sql, auth.userId);
          const mesaId = new URL(request.url).searchParams.get("mesa_id") ?? mesas[0]?.id;
          const presence = mesaId
            ? await getPresenceForPlayerInMesa(sql, auth.userId, mesaId)
            : null;
          return Response.json(
            {
              mesas: mesas.map((mesa) => ({ ...mesa, mesa_id: mesa.id, mesa_name: mesa.name })),
              presence:
                presence ??
                (mesaId ? { mesa_id: mesaId, regime: "green", updated_at: null } : null),
            },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
      PUT: async ({ request }) => {
        if (!isSameOriginRequest(request, origin()))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = (await request.json().catch(() => null)) as {
          mesa_id?: unknown;
          regime?: unknown;
        } | null;
        if (typeof body?.mesa_id !== "string")
          return Response.json({ error: "invalid_presence" }, { status: 400, headers });
        try {
          assertPresenceState(body.regime);
        } catch {
          return Response.json({ error: "invalid_presence_regime" }, { status: 400, headers });
        }
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const presence = await upsertPresenceForPlayerInMesa(
            sql,
            auth.userId,
            body.mesa_id,
            body.regime as PresenceState,
          );
          return presence
            ? Response.json({ presence }, { headers })
            : Response.json({ error: "mesa_access_denied" }, { status: 403, headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
