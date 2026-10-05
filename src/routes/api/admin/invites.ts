import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { isSystemMaster } from "@/server/local-core/player-access";
import { createMesaInvite } from "@/server/local-core/mesa-invites";

const headers = { "Cache-Control": "no-store" };

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

export const Route = createFileRoute("/api/admin/invites")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await isSystemMaster(sql, auth.userId)))
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          const body = (await request.json().catch(() => null)) as {
            user_id?: unknown;
            mesa_id?: unknown;
          } | null;
          if (!body || typeof body.user_id !== "string" || typeof body.mesa_id !== "string")
            return Response.json({ error: "invalid_invite" }, { status: 400, headers });
          try {
            const result = await createMesaInvite(sql, auth.userId, body.user_id, body.mesa_id);
            const origin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
            const inviteUrl = `${origin.replace(/\/$/, "")}/convite?token=${encodeURIComponent(result.token)}`;
            const inviteText = `✦ KALLISTIS te chama\n\nVocê foi convidado para ${result.invite.mesa_name}.\n\nEntre em ${inviteUrl}\n\nUse a palavra de acesso que você recebeu pelo canal seguro da Mesa.`;
            return Response.json(
              { ok: true, invite: result.invite, invite_url: inviteUrl, invite_text: inviteText },
              { headers },
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : "invite_failed";
            return Response.json(
              { error: message },
              { status: message === "invite_target_not_found" ? 404 : 400, headers },
            );
          }
        } finally {
          sql.close();
        }
      },
    },
  },
});
