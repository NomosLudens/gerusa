import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  claimPlayerInvite,
  createPlayerInviteOAuthState,
  normalizePlayerInviteIdentity,
} from "@/server/local-core/player-google-invites";
import type { SqlExecutor } from "@/server/local-core/postgres";
import { isMaster } from "@/server/local-core/player-access";
import { getRuntimeDatabaseUrl, getRuntimeEnv } from "@/server/runtime/context";
import {
  readSupabaseAccessToken,
  resolveSupabaseGoogleIdentity,
} from "@/server/runtime/supabase-auth";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createFileRoute } from "@tanstack/react-router";

const headers = { "Cache-Control": "no-store" };

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

function expectedOrigin() {
  return getRuntimeEnv().publicOrigin || "https://kallistis.app";
}

async function getStatus(sql: SqlExecutor, userId: string) {
  const rows = await sql.query<{
    display_name: string | null;
    pronouns: string | null;
    player_label: string | null;
  }>(
    `SELECT p.display_name, p.pronouns,
            (SELECT pi.player_label
               FROM public.player_invites pi
              WHERE pi.claimed_by_user_id = u.id
              LIMIT 1) AS player_label
       FROM public.users u
       LEFT JOIN public.profiles p ON p.id = u.id
      WHERE u.id = $1 AND u.status = 'active'
      LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) throw new Error("kallistis_identity_not_provisioned");
  const master = await isMaster(sql, userId);
  const hasName = Boolean(row.display_name?.trim());
  const hasPronouns = Boolean(row.pronouns?.trim());
  return {
    required: !master && (!row.player_label || !hasName || !hasPronouns),
    display_name: row.display_name,
    pronouns: row.pronouns,
    player_label: row.player_label,
    master,
  };
}

async function authenticatedUser(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return { error: auth.error } as const;
  const accessToken = readSupabaseAccessToken(request);
  const googleIdentity = accessToken ? await resolveSupabaseGoogleIdentity(accessToken) : null;
  return {
    userId: auth.userId,
    isGoogle: Boolean(googleIdentity && googleIdentity.id === auth.userId),
  } as const;
}

export const Route = createFileRoute("/api/auth/google-player-onboarding")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticatedUser(request);
        if ("error" in auth) {
          const response = auth.error;
          return response instanceof Response
            ? response
            : Response.json({ error: "unauthorized" }, { status: 401, headers });
        }
        if (!auth.isGoogle) return Response.json({ required: false }, { headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          return Response.json(await getStatus(sql, auth.userId), { headers });
        } catch (error) {
          const message = error instanceof Error ? error.message : "google_player_status_failed";
          return Response.json({ error: message }, { status: 503, headers });
        } finally {
          sql.close();
        }
      },
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request, expectedOrigin()))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await authenticatedUser(request);
        if ("error" in auth) {
          const response = auth.error;
          return response instanceof Response
            ? response
            : Response.json({ error: "unauthorized" }, { status: 401, headers });
        }
        if (!auth.isGoogle)
          return Response.json({ error: "google_auth_required" }, { status: 403, headers });
        const body = (await request.json().catch(() => null)) as {
          display_name?: unknown;
          pronouns?: unknown;
        } | null;
        let identity;
        try {
          identity = normalizePlayerInviteIdentity(body?.display_name, body?.pronouns);
        } catch (error) {
          const message = error instanceof Error ? error.message : "invite_identity_required";
          return Response.json({ error: message }, { status: 400, headers });
        }

        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const status = await getStatus(sql, auth.userId);
          if (status.master)
            return Response.json(
              { error: "google_player_onboarding_not_allowed" },
              { status: 403, headers },
            );
          if (!status.required && status.player_label)
            return Response.json(
              {
                ok: true,
                already_completed: true,
                player_label: status.player_label,
                display_name: status.display_name,
                pronouns: status.pronouns,
              },
              { headers },
            );

          const state = await createPlayerInviteOAuthState(sql, null, identity);
          const claim = await claimPlayerInvite(sql, state, auth.userId);
          return Response.json(
            {
              ok: true,
              already_completed: false,
              player_label: claim.player_label,
              display_name: identity.display_name,
              pronouns: identity.pronouns,
            },
            { headers },
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "google_player_onboarding_failed";
          const status =
            message === "invite_capacity_exhausted" || message === "invite_claim_conflict"
              ? 409
              : message === "invite_server_failure" || message === "database_unavailable"
                ? 503
                : 400;
          return Response.json({ error: message }, { status, headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
