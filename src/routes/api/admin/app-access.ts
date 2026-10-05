import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { listMesas } from "@/server/local-core/postgres-repositories";
import {
  isSystemMaster,
  listPlayerAccess,
  setPlayerAccess,
} from "@/server/local-core/player-access";
import { PLAYER_ACCESS_APPS, isPlayerAccessAppId } from "@/lib/player-access";

const headers = { "Cache-Control": "no-store" };
const expectedOrigin = () => process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

async function requireSystemMaster(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return { error: auth.error } as const;
  const sql = runtime();
  if (!sql)
    return {
      error: Response.json({ error: "database_unavailable" }, { status: 503, headers }),
    } as const;
  const allowed = await isSystemMaster(sql, auth.userId);
  if (!allowed) {
    sql.close();
    return { error: Response.json({ error: "forbidden" }, { status: 403, headers }) } as const;
  }
  return { auth, sql } as const;
}

export const Route = createFileRoute("/api/admin/app-access")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireSystemMaster(request);
        if ("error" in gate) return gate.error;
        try {
          return Response.json(
            {
              apps: PLAYER_ACCESS_APPS.map(({ id, label, path, group }) => ({
                id,
                label,
                path,
                group,
              })),
              users: await listPlayerAccess(gate.sql),
              mesas: await listMesas(gate.sql),
            },
            { headers },
          );
        } finally {
          gate.sql.close();
        }
      },
      PUT: async ({ request }) => {
        if (!isSameOriginRequest(request, expectedOrigin())) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        }
        const gate = await requireSystemMaster(request);
        if ("error" in gate) return gate.error;
        try {
          const body = (await request.json().catch(() => null)) as {
            user_id?: unknown;
            allowed_app_ids?: unknown;
          } | null;
          if (
            !body ||
            typeof body.user_id !== "string" ||
            !Array.isArray(body.allowed_app_ids) ||
            body.allowed_app_ids.some((appId) => !isPlayerAccessAppId(appId))
          ) {
            return Response.json({ error: "invalid_app_access" }, { status: 400, headers });
          }
          const uniqueAppIds = [...new Set(body.allowed_app_ids)];
          const target = await gate.sql.query(
            `SELECT 1 FROM public.users u
              JOIN public.profiles p ON p.id = u.id
             WHERE u.id = $1 AND u.status = 'active'
               AND NOT EXISTS (
                 SELECT 1 FROM public.system_roles sr
                  WHERE sr.user_id = u.id AND sr.system_role = 'system_master'
               )
             LIMIT 1`,
            [body.user_id],
          );
          if (!target.length)
            return Response.json({ error: "player_not_found" }, { status: 404, headers });
          await setPlayerAccess(gate.sql, gate.auth.userId, body.user_id, uniqueAppIds);
          return Response.json(
            { ok: true, user_id: body.user_id, allowed_app_ids: uniqueAppIds },
            { headers },
          );
        } finally {
          gate.sql.close();
        }
      },
    },
  },
});
