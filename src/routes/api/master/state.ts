import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { isSameOriginRequest } from "@/server/local-core/csrf";

const headers = { "Cache-Control": "no-store" };
const allowedKeys = new Set(["sessao-zero", "sessao-zero-ui", "mapa-interativo", "refugio"]);

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

async function canMaster(
  sql: ReturnType<typeof createBunPostgresExecutor>,
  userId: string,
  mesaId: string | null,
) {
  const system = await sql.query(
    "SELECT 1 FROM system_roles WHERE user_id=$1 AND system_role='system_master'",
    [userId],
  );
  if (system.length) return true;
  if (!mesaId) return false;
  const membership = await sql.query(
    "SELECT 1 FROM mesa_members WHERE user_id=$1 AND mesa_id=$2 AND member_role='mestre' AND membership_status='active'",
    [userId, mesaId],
  );
  return membership.length > 0;
}

export const Route = createFileRoute("/api/master/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const url = new URL(request.url);
        const key = url.searchParams.get("surfaceKey");
        const mesaId = url.searchParams.get("mesaId");
        if (!key || !allowedKeys.has(key))
          return Response.json({ error: "invalid_surface_key" }, { status: 400, headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (mesaId && !(await canMaster(sql, auth.userId, mesaId)))
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          const rows = mesaId
            ? await sql.query(
                "SELECT state, updated_at FROM master_mesa_surface_state WHERE mesa_id=$1 AND surface_key=$2",
                [mesaId, key],
              )
            : await sql.query(
                "SELECT state, updated_at FROM master_user_surface_state WHERE user_id=$1 AND surface_key=$2",
                [auth.userId, key],
              );
          return Response.json(
            { state: rows[0]?.state ?? {}, updatedAt: rows[0]?.updated_at ?? null },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
      PUT: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = (await request.json().catch(() => null)) as {
          surfaceKey?: unknown;
          mesaId?: unknown;
          state?: unknown;
        } | null;
        if (
          !body ||
          typeof body.surfaceKey !== "string" ||
          !allowedKeys.has(body.surfaceKey) ||
          !body.state ||
          typeof body.state !== "object"
        )
          return Response.json({ error: "invalid_state" }, { status: 400, headers });
        const mesaId = typeof body.mesaId === "string" ? body.mesaId : null;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (mesaId) {
            if (!(await canMaster(sql, auth.userId, mesaId)))
              return Response.json({ error: "forbidden" }, { status: 403, headers });
            await sql.query(
              "INSERT INTO master_mesa_surface_state (mesa_id,surface_key,state,updated_by) VALUES ($1,$2,$3,$4) ON CONFLICT (mesa_id,surface_key) DO UPDATE SET state=EXCLUDED.state,updated_by=EXCLUDED.updated_by,updated_at=now()",
              [mesaId, body.surfaceKey, JSON.stringify(body.state), auth.userId],
            );
          } else {
            await sql.query(
              "INSERT INTO master_user_surface_state (user_id,surface_key,state) VALUES ($1,$2,$3) ON CONFLICT (user_id,surface_key) DO UPDATE SET state=EXCLUDED.state,updated_at=now()",
              [auth.userId, body.surfaceKey, JSON.stringify(body.state)],
            );
          }
          return Response.json({ ok: true }, { headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
