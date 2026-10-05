import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { MesaProvisionError, provisionMesaToGravewright } from "@/server/local-core/mesa-provision";
import {
  isSystemMaster,
  setMesaMemberships,
  setPlayerMesas,
} from "@/server/local-core/player-access";

const headers = { "Cache-Control": "no-store" };
const expectedOrigin = () => process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

async function provisionAffected(
  sql: ReturnType<typeof createBunPostgresExecutor>,
  mesaIds: string[],
) {
  const results = [] as Array<{ mesa_id: string; status: "synced" | "pending"; error?: string }>;
  for (const mesaId of [...new Set(mesaIds)]) {
    try {
      await provisionMesaToGravewright(sql, mesaId);
      results.push({ mesa_id: mesaId, status: "synced" });
    } catch (error) {
      results.push({
        mesa_id: mesaId,
        status: "pending",
        error: error instanceof MesaProvisionError ? error.code : "gravewright_provision_failed",
      });
    }
  }
  return results;
}

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

export const Route = createFileRoute("/api/admin/mesa-memberships")({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        if (!isSameOriginRequest(request, expectedOrigin())) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        }
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await isSystemMaster(sql, auth.userId))) {
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          }
          const body = (await request.json().catch(() => null)) as {
            action?: unknown;
            mesa_id?: unknown;
            master_user_ids?: unknown;
            player_user_ids?: unknown;
            user_id?: unknown;
            mesa_ids?: unknown;
          } | null;
          if (body?.action === "replace_mesa") {
            if (
              Object.keys(body).sort().join(",") !==
                "action,master_user_ids,mesa_id,player_user_ids" ||
              typeof body.mesa_id !== "string" ||
              !isStringArray(body.master_user_ids) ||
              !isStringArray(body.player_user_ids)
            ) {
              return Response.json({ error: "invalid_mesa_memberships" }, { status: 400, headers });
            }
            await setMesaMemberships(sql, body.mesa_id, body.master_user_ids, body.player_user_ids);
            const provisioning = await provisionAffected(sql, [body.mesa_id]);
            return Response.json({ ok: true, mesa_id: body.mesa_id, provisioning }, { headers });
          }
          if (
            !body ||
            typeof body.user_id !== "string" ||
            !Array.isArray(body.mesa_ids) ||
            body.mesa_ids.some((id) => typeof id !== "string")
          ) {
            return Response.json({ error: "invalid_mesa_memberships" }, { status: 400, headers });
          }
          const mesaIds = [...new Set(body.mesa_ids as string[])];
          const previous = await sql.query<{ mesa_id: string }>(
            "SELECT mesa_id::text FROM public.mesa_members WHERE user_id=$1 AND membership_status='active'",
            [body.user_id],
          );
          await setPlayerMesas(sql, body.user_id, mesaIds);
          const affectedMesaIds = [...previous.map((row) => row.mesa_id), ...mesaIds];
          const provisioning = await provisionAffected(sql, affectedMesaIds);
          return Response.json(
            { ok: true, user_id: body.user_id, mesa_ids: mesaIds, provisioning },
            { headers },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "invalid_mesa_memberships";
          const status = message === "player_not_found" ? 404 : 400;
          return Response.json({ error: message }, { status, headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
