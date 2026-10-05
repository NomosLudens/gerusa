import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
const headers = { "Cache-Control": "no-store" };
export const Route = createFileRoute("/api/admin/tal-bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const url = getRuntimeDatabaseUrl();
        if (!url) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        const sql = createBunPostgresExecutor(url);
        try {
          const allowed = await sql.query(
            `SELECT 1 FROM public.system_roles WHERE user_id=$1 AND system_role='system_master'`,
            [auth.userId],
          );
          if (!allowed.length)
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          const rows = await sql.query(
            `INSERT INTO public.system_identities(identity_key,user_id) VALUES ('TAL',$1) ON CONFLICT (identity_key) DO NOTHING RETURNING identity_key,user_id`,
            [auth.userId],
          );
          if (!rows.length)
            return Response.json({ error: "tal_already_initialized" }, { status: 409, headers });
          return Response.json(
            { identity_key: "TAL", user_id: auth.userId },
            { status: 201, headers },
          );
        } finally {
          sql.close();
        }
      },
    },
  },
});
