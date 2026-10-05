import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { isSystemMaster } from "@/server/local-core/player-access";
import {
  createMesa,
  linkExistingMesaToGravewright,
  listExistingGravewrightCampaigns,
  MesaProvisionError,
  provisionMesaToGravewright,
} from "@/server/local-core/mesa-provision";

const headers = { "Cache-Control": "no-store" };
const expectedOrigin = () => process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export const Route = createFileRoute("/api/admin/mesas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await isSystemMaster(sql, auth.userId))) {
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          }
          const [mesas, members, users] = await Promise.all([
            sql.query<{
              id: string;
              slug: string;
              name: string;
              vtt_available: boolean;
              vtt_campaign_id: string | null;
            }>(
              "SELECT m.id::text,m.slug,m.name,COALESCE(vm.active,false) AS vtt_available,vm.gravewright_campaign_id::text AS vtt_campaign_id " +
                "FROM public.mesas m LEFT JOIN public.vtt_campaign_mappings vm ON vm.mesa_id=m.id " +
                "ORDER BY lower(m.name),m.id",
            ),
            sql.query<{
              mesa_id: string;
              user_id: string;
              display_name: string | null;
              email: string | null;
              member_role: "mestre" | "jogador";
            }>(
              "SELECT mm.mesa_id::text AS mesa_id,mm.user_id::text AS user_id,p.display_name,mm.member_role " +
                "FROM public.mesa_members mm JOIN public.users u ON u.id=mm.user_id " +
                "LEFT JOIN public.profiles p ON p.id=mm.user_id " +
                "WHERE mm.membership_status='active' AND u.status='active' " +
                "ORDER BY mm.mesa_id,mm.member_role DESC,lower(COALESCE(p.display_name,'')),mm.user_id",
            ),
            sql
              .query<{
                id: string;
                display_name: string | null;
                email: string | null;
                status: "active" | "disabled";
              }>(
                "SELECT u.id::text AS id,p.display_name,au.email,u.status FROM public.users u " +
                  "JOIN auth.users au ON au.id=u.id " +
                  "LEFT JOIN public.profiles p ON p.id=u.id WHERE u.status='active' " +
                  "ORDER BY lower(COALESCE(p.display_name,'')),lower(COALESCE(au.email,'')),u.id",
              )
              .catch(() =>
                sql.query<{
                  id: string;
                  display_name: string | null;
                  email: string | null;
                  status: "active" | "disabled";
                }>(
                  "SELECT u.id::text AS id,p.display_name,NULL::text AS email,u.status FROM public.users u " +
                    "LEFT JOIN public.profiles p ON p.id=u.id WHERE u.status='active' " +
                    "ORDER BY lower(COALESCE(p.display_name,'')),u.id",
                ),
              ),
          ]);
          const membersByMesa = new Map<string, (typeof members)[number][]>();
          for (const member of members) {
            const list = membersByMesa.get(member.mesa_id) ?? [];
            list.push(member);
            membersByMesa.set(member.mesa_id, list);
          }
          return Response.json(
            {
              users,
              mesas: mesas.map((mesa) => ({
                ...mesa,
                members: (membersByMesa.get(mesa.id) ?? []).map((member) => ({
                  id: member.user_id,
                  display_name: member.display_name,
                  role: member.member_role,
                })),
              })),
            },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
      POST: async ({ request }) => {
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
          const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
          if (!body || typeof body.action !== "string") {
            return Response.json({ error: "invalid_mesa_action" }, { status: 400, headers });
          }
          if (body.action === "create") {
            const keys = Object.keys(body).sort();
            if (
              keys.join(",") !== "action,master_user_ids,name,player_user_ids" ||
              typeof body.name !== "string" ||
              !isStringArray(body.master_user_ids) ||
              !isStringArray(body.player_user_ids)
            ) {
              return Response.json({ error: "invalid_mesa_creation" }, { status: 400, headers });
            }
            const mesa = await createMesa(
              sql,
              body.master_user_ids,
              body.player_user_ids,
              body.name,
            );
            try {
              const provisioning = await provisionMesaToGravewright(sql, mesa.id);
              return Response.json({ ok: true, mesa, provisioning }, { status: 201, headers });
            } catch (error) {
              const code =
                error instanceof MesaProvisionError ? error.code : "gravewright_provision_failed";
              return Response.json(
                { ok: true, mesa, provisioning: { status: "pending", error: code } },
                { status: 202, headers },
              );
            }
          }
          if (body.action === "provision") {
            if (
              Object.keys(body).sort().join(",") !== "action,mesa_id" ||
              typeof body.mesa_id !== "string"
            ) {
              return Response.json({ error: "invalid_mesa_provision" }, { status: 400, headers });
            }
            try {
              const provisioning = await provisionMesaToGravewright(sql, body.mesa_id);
              return Response.json({ ok: true, mesa_id: body.mesa_id, provisioning }, { headers });
            } catch (error) {
              const code =
                error instanceof MesaProvisionError ? error.code : "gravewright_provision_failed";
              return Response.json(
                {
                  ok: false,
                  mesa_id: body.mesa_id,
                  provisioning: { status: "pending", error: code },
                },
                { status: 202, headers },
              );
            }
          }
          if (body.action === "list_existing_campaigns") {
            if (
              Object.keys(body).sort().join(",") !== "action,mesa_id" ||
              typeof body.mesa_id !== "string"
            ) {
              return Response.json(
                { error: "invalid_existing_campaign_list" },
                { status: 400, headers },
              );
            }
            const campaigns = await listExistingGravewrightCampaigns(sql, body.mesa_id);
            return Response.json({ ok: true, mesa_id: body.mesa_id, campaigns }, { headers });
          }
          if (body.action === "link_existing") {
            if (
              Object.keys(body).sort().join(",") !== "action,campaign_id,mesa_id" ||
              typeof body.mesa_id !== "string" ||
              typeof body.campaign_id !== "string"
            ) {
              return Response.json(
                { error: "invalid_existing_campaign_link" },
                { status: 400, headers },
              );
            }
            const mapping = await linkExistingMesaToGravewright(
              sql,
              body.mesa_id,
              body.campaign_id,
            );
            return Response.json({ ok: true, mesa_id: body.mesa_id, mapping }, { headers });
          }
          return Response.json({ error: "invalid_mesa_action" }, { status: 400, headers });
        } catch (error) {
          const code = error instanceof MesaProvisionError ? error.code : "mesa_create_failed";
          const status = ["vtt_mapping_conflict", "vtt_campaign_already_mapped"].includes(code)
            ? 409
            : 400;
          return Response.json({ error: code }, { status, headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
