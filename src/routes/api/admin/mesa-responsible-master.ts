import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  assignResponsibleMaster,
  getResponsibleMaster,
  getSystemIdentity,
  listEligibleResponsibleMasters,
  removeResponsibleMaster,
} from "@/server/local-core/presence-repository";
import { provisionBestEffort } from "@/server/local-core/mesa-provision";

const headers = { "Cache-Control": "no-store" };
const origin = () => process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

async function authenticated(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return { error: auth.error } as const;
  const sql = runtime();
  if (!sql)
    return {
      error: Response.json({ error: "database_unavailable" }, { status: 503, headers }),
    } as const;
  return { auth, sql } as const;
}

function validBody(body: unknown): body is { mesa_id: string; master_user_id?: string } {
  return Boolean(
    body &&
    typeof body === "object" &&
    typeof (body as { mesa_id?: unknown }).mesa_id === "string" &&
    ((body as { master_user_id?: unknown }).master_user_id === undefined ||
      typeof (body as { master_user_id?: unknown }).master_user_id === "string"),
  );
}

export const Route = createFileRoute("/api/admin/mesa-responsible-master")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await authenticated(request);
        if ("error" in gate) return gate.error;
        try {
          const mesaId = new URL(request.url).searchParams.get("mesa_id");
          if (!mesaId)
            return Response.json({ error: "mesa_id_required" }, { status: 400, headers });
          const result = await getResponsibleMaster(gate.sql, mesaId);
          const tal = await getSystemIdentity(gate.sql);
          const eligibleMasters = await listEligibleResponsibleMasters(gate.sql, mesaId);
          return result
            ? Response.json(
                { ...result, isTal: gate.auth.userId === tal?.user_id, eligibleMasters },
                { headers },
              )
            : Response.json({ error: "mesa_not_found" }, { status: 404, headers });
        } finally {
          gate.sql.close();
        }
      },
      PUT: async ({ request }) => {
        if (!isSameOriginRequest(request, origin()))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const gate = await authenticated(request);
        if ("error" in gate) return gate.error;
        try {
          const body = await request.json().catch(() => null);
          if (!validBody(body) || typeof body.master_user_id !== "string")
            return Response.json({ error: "invalid_responsible_master" }, { status: 400, headers });
          const result = await assignResponsibleMaster({
            sql: gate.sql,
            mesaId: body.mesa_id,
            masterUserId: body.master_user_id,
            authenticatedTalUserId: gate.auth.userId,
          });
          await provisionBestEffort(gate.sql, [body.mesa_id]);
          return Response.json({ ok: true, ...result }, { headers });
        } catch (error) {
          const code = error instanceof Error ? error.message : "responsible_master_failed";
          const status = code === "tal_required" ? 403 : code === "mesa_not_found" ? 404 : 400;
          return Response.json({ error: code }, { status, headers });
        } finally {
          gate.sql.close();
        }
      },
      DELETE: async ({ request }) => {
        if (!isSameOriginRequest(request, origin()))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const gate = await authenticated(request);
        if ("error" in gate) return gate.error;
        try {
          const body = await request.json().catch(() => null);
          if (!validBody(body))
            return Response.json({ error: "invalid_responsible_master" }, { status: 400, headers });
          const result = await removeResponsibleMaster({
            sql: gate.sql,
            mesaId: body.mesa_id,
            authenticatedTalUserId: gate.auth.userId,
          });
          await provisionBestEffort(gate.sql, [body.mesa_id]);
          return Response.json({ ok: true, resolved: result }, { headers });
        } catch (error) {
          const code = error instanceof Error ? error.message : "responsible_master_remove_failed";
          const status = code === "tal_required" ? 403 : 400;
          return Response.json({ error: code }, { status, headers });
        } finally {
          gate.sql.close();
        }
      },
    },
  },
});
