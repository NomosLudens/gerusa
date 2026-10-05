import { getRuntimeDatabaseUrl, getRuntimeEnv } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { getMesaInvite, redeemMesaInvite } from "@/server/local-core/mesa-invites";
import {
  readSupabaseAccessToken,
  resolveSupabaseGoogleIdentity,
} from "@/server/runtime/supabase-auth";
import {
  claimPlayerInvite,
  createPlayerInviteOAuthState,
  getPlayerInviteStatus,
  normalizePlayerInviteIdentity,
} from "@/server/local-core/player-google-invites";

const headers = { "Cache-Control": "no-store" };

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

export const Route = createFileRoute("/api/invite")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const search = new URL(request.url).searchParams;
        const playerInviteToken = search.get("c");
        if (playerInviteToken !== null) {
          if (!playerInviteToken || playerInviteToken.length > 200) {
            return Response.json({ status: "INVALID" }, { headers });
          }
          const sql = runtime();
          if (!sql) return Response.json({ status: "INVALID" }, { status: 503, headers });
          try {
            return Response.json(
              { status: await getPlayerInviteStatus(sql, playerInviteToken) },
              { headers },
            );
          } finally {
            sql.close();
          }
        }

        const token = search.get("token");
        if (!token || token.length > 200)
          return Response.json({ error: "invite_not_found" }, { status: 404, headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const invite = await getMesaInvite(sql, token);
          return invite
            ? Response.json({ invite }, { headers })
            : Response.json({ error: "invite_not_found" }, { status: 404, headers });
        } finally {
          sql.close();
        }
      },
      POST: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const body = (await request.json().catch(() => null)) as {
          action?: unknown;
          token?: unknown;
          state?: unknown;
          display_name?: unknown;
          pronouns?: unknown;
        } | null;
        if (!body) {
          return Response.json({ error: "invite_not_found" }, { status: 404, headers });
        }

        if (body.action === "start_google") {
          const token = typeof body.token === "string" ? body.token : null;
          let identity;
          if (
            token ||
            typeof body.display_name !== "undefined" ||
            typeof body.pronouns !== "undefined"
          ) {
            try {
              identity = normalizePlayerInviteIdentity(body.display_name, body.pronouns);
            } catch (error) {
              const message = error instanceof Error ? error.message : "invite_identity_required";
              return Response.json({ error: message }, { status: 400, headers });
            }
          }
          const sql = runtime();
          if (!sql)
            return Response.json({ error: "database_unavailable" }, { status: 503, headers });
          try {
            const state = await createPlayerInviteOAuthState(sql, token, identity);
            const runtime = getRuntimeEnv();
            if (!runtime.supabaseUrl)
              return Response.json({ error: "database_unavailable" }, { status: 503, headers });
            const configuredOrigin = runtime.publicOrigin
              ?.split(",")
              .map((value) => value.trim())
              .find(Boolean);
            let origin = new URL(request.url).origin;
            if (configuredOrigin) {
              try {
                const parsedOrigin = new URL(configuredOrigin);
                if (parsedOrigin.protocol === "https:" || parsedOrigin.protocol === "http:") {
                  origin = parsedOrigin.origin;
                }
              } catch {
                // Keep the origin from the incoming request when configuration is invalid.
              }
            }
            const callback = new URL("/convite", origin);
            callback.searchParams.set("invite_state", state);
            const authorize = new URL("/auth/v1/authorize", runtime.supabaseUrl);
            authorize.searchParams.set("provider", "google");
            authorize.searchParams.set("redirect_to", callback.toString());
            return Response.json({ ok: true, state, oauth_url: authorize.toString() }, { headers });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "invite_invalid_or_unavailable";
            const status =
              message === "invite_capacity_exhausted"
                ? 409
                : message === "invite_server_failure"
                  ? 503
                  : 400;
            return Response.json({ error: message }, { status, headers });
          } finally {
            sql.close();
          }
        }

        const auth = await requireUser(request);
        if (body.action === "claim_google") {
          if ("error" in auth) return auth.error;
          const accessToken = readSupabaseAccessToken(request);
          const googleIdentity = accessToken
            ? await resolveSupabaseGoogleIdentity(accessToken)
            : null;
          if (!googleIdentity || googleIdentity.id !== auth.userId) {
            return Response.json({ error: "google_auth_required" }, { status: 403, headers });
          }
          const state = body.state;
          if (typeof state !== "string" || state.length > 200) {
            return Response.json(
              { error: "invite_state_invalid_or_expired" },
              { status: 400, headers },
            );
          }
          const sql = runtime();
          if (!sql)
            return Response.json({ error: "database_unavailable" }, { status: 503, headers });
          try {
            const claim = await claimPlayerInvite(sql, state, auth.userId);
            return Response.json({ ok: true, player_label: claim.player_label }, { headers });
          } catch (error) {
            const message = error instanceof Error ? error.message : "invite_claim_failed";
            const status =
              message === "invite_capacity_exhausted" || message === "invite_claim_conflict"
                ? 409
                : message === "invite_server_failure"
                  ? 503
                  : 400;
            return Response.json({ error: message }, { status, headers });
          } finally {
            sql.close();
          }
        }

        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          try {
            if (typeof body.token !== "string" || body.token.length > 200) {
              return Response.json({ error: "invite_not_found" }, { status: 404, headers });
            }
            const invite = await redeemMesaInvite(sql, body.token, auth.userId);
            return Response.json({ ok: true, invite }, { headers });
          } catch (error) {
            const message = error instanceof Error ? error.message : "invite_invalid_or_wrong_user";
            return Response.json({ error: message }, { status: 400, headers });
          }
        } finally {
          sql.close();
        }
      },
    },
  },
});
