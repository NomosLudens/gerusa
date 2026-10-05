import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { credentialLookupDigest, hashCredential } from "@/server/local-core/credentials";
import { decryptPlayerPhrase, encryptPlayerPhrase } from "@/server/local-core/player-phrase-crypto";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { signMesaProvisionBody } from "@/server/local-core/mesa-provision";
import {
  generateVelarimPlayerPhrase,
  VELARIM_PLAYER_PHRASE_PIECES,
} from "@/server/local-core/player-phrase-velarim";

const headers = { "Cache-Control": "no-store" };
const SCHEMA = "kallistis.gravewright.player-phrase.v1";

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

export const Route = createFileRoute("/api/vtt/player-phrase")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const rows = await sql.query<{
            player_code: string;
            credential_ciphertext: string | null;
          }>(
            "SELECT player_code,credential_ciphertext FROM public.player_access " +
              "WHERE user_id=$1 AND revoked_at IS NULL LIMIT 1",
            [auth.userId],
          );
          const configuredOrigin = process.env.KALLISTIS_GRAVEWRIGHT_ORIGIN?.trim();
          let gravewrightUrl: string | null = null;
          if (configuredOrigin) {
            try {
              const url = new URL(configuredOrigin);
              if (url.protocol === "https:") gravewrightUrl = url.origin;
            } catch {
              // Keep the login link unavailable when the configured origin is malformed.
            }
          }
          let phrase: string | null = null;
          const encryptedPhrase = rows[0]?.credential_ciphertext;
          const phraseSecret = process.env.KALLISTIS_VTT_SERVICE_SECRET;
          if (encryptedPhrase && phraseSecret) {
            try {
              phrase = await decryptPlayerPhrase(encryptedPhrase, phraseSecret, {
                userId: auth.userId,
                playerCode: rows[0].player_code,
              });
            } catch (error) {
              console.error("[player-phrase] phrase decrypt failed", {
                errorName: error instanceof Error ? error.name : "unknown",
              });
            }
          }
          return Response.json(
            {
              configured: rows.length > 0,
              phrase,
              phrase_available: phrase !== null,
              gravewright_url: gravewrightUrl,
            },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
      POST: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const origin = process.env.KALLISTIS_GRAVEWRIGHT_ORIGIN?.trim().replace(/\/+$/, "");
        const secret = process.env.KALLISTIS_VTT_SERVICE_SECRET;
        const lookupKey = process.env.KALLISTIS_CREDENTIAL_LOOKUP_KEY;
        if (!origin || !secret || !lookupKey)
          return Response.json({ error: "vtt_phrase_not_configured" }, { status: 503, headers });

        const body = await request.json().catch(() => null);
        if (
          body !== null &&
          (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length)
        )
          return Response.json({ error: "invalid_request" }, { status: 400, headers });

        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        let failureStage = "player_slot";
        try {
          const player = await sql.query<{ player_code: string }>(
            "SELECT i.player_label AS player_code FROM public.player_invites i " +
              "JOIN public.users u ON u.id=i.claimed_by_user_id " +
              "WHERE i.claimed_by_user_id=$1 AND i.claimed_at IS NOT NULL " +
              "AND i.revoked_at IS NULL AND u.status='active' " +
              "AND EXISTS (SELECT 1 FROM public.mesa_members mm WHERE mm.user_id=u.id " +
              "AND mm.member_role='jogador' AND mm.membership_status='active') LIMIT 1",
            [auth.userId],
          );
          if (!player[0])
            return Response.json(
              { error: "active_player_slot_required" },
              { status: 403, headers },
            );

          failureStage = "mesa_eligibility";
          const eligibility = await sql.query<{
            mesa_id: string;
            gravewright_campaign_id: string;
          }>(
            "SELECT mm.mesa_id::text AS mesa_id,vcm.gravewright_campaign_id::text " +
              "FROM public.mesa_members mm JOIN public.vtt_campaign_mappings vcm " +
              "ON vcm.mesa_id=mm.mesa_id AND vcm.active=true " +
              "WHERE mm.user_id=$1 AND mm.member_role='jogador' " +
              "AND mm.membership_status='active' ORDER BY mm.joined_at LIMIT 1",
            [auth.userId],
          );
          if (!eligibility[0])
            return Response.json({ error: "vtt_mesa_mapping_required" }, { status: 409, headers });

          failureStage = "piece_assignment";
          const existingAccess = await sql.query<{
            user_id: string;
            player_code: string;
            credential_ciphertext: string | null;
          }>(
            "SELECT user_id::text,player_code,credential_ciphertext " +
              "FROM public.player_access WHERE revoked_at IS NULL",
          );
          const usedPieces = new Set<string>(["mi-raar"]);
          const approvedPieces = new Set<string>(VELARIM_PLAYER_PHRASE_PIECES);
          let unavailableLegacyPhrases = 0;
          for (const access of existingAccess) {
            if (!access.credential_ciphertext) {
              unavailableLegacyPhrases += 1;
              continue;
            }
            try {
              const existingPhrase = await decryptPlayerPhrase(
                access.credential_ciphertext,
                secret,
                { userId: access.user_id, playerCode: access.player_code },
              );
              if (approvedPieces.has(existingPhrase)) usedPieces.add(existingPhrase);
            } catch {
              throw new Error("player_phrase_allocation_unavailable");
            }
          }
          // One existing legacy phrase has no ciphertext; mi-raar is reserved for it.
          if (unavailableLegacyPhrases > 1) throw new Error("player_phrase_allocation_unavailable");

          failureStage = "credential_hash";
          const phrase = generateVelarimPlayerPhrase(usedPieces);
          const credential_hash = await hashCredential(phrase);
          const credential_lookup_digest = credentialLookupDigest(phrase, lookupKey);
          const credential_ciphertext = await encryptPlayerPhrase(phrase, secret, {
            userId: auth.userId,
            playerCode: player[0].player_code,
          });

          const payload = {
            schema: SCHEMA,
            source_user_id: auth.userId,
            player_code: player[0].player_code,
            source_mesa_id: eligibility[0].mesa_id,
            campaign_id: eligibility[0].gravewright_campaign_id,
            phrase,
          };
          const serialized = JSON.stringify(payload);
          const timestamp = Math.floor(Date.now() / 1000);
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          let response: Response;
          try {
            response = await fetch(origin + "/api/internal/kallistis/player-phrase", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + secret,
                "x-kallistis-timestamp": String(timestamp),
                "x-kallistis-signature": signMesaProvisionBody(serialized, secret, timestamp),
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: serialized,
              signal: controller.signal,
            });
          } catch {
            return Response.json({ error: "gravewright_unavailable" }, { status: 503, headers });
          } finally {
            clearTimeout(timer);
          }
          const text = await response.text().catch(() => "");
          let remote: Record<string, unknown> | null = null;
          if (text.length <= 4096) {
            try {
              remote = JSON.parse(text || "null") as Record<string, unknown> | null;
            } catch {
              remote = null;
            }
          }
          if (!response.ok || remote?.valid !== true || remote.source_user_id !== auth.userId) {
            const code =
              typeof remote?.error === "string" && /^[a-z0-9_]{1,80}$/i.test(remote.error)
                ? remote.error
                : "gravewright_phrase_sync_failed";
            console.warn("[player-phrase] Gravewright rejected credential sync", {
              status: response.status,
              code,
              valid: remote?.valid === true,
              sourceUserMatches: remote?.source_user_id === auth.userId,
            });
            return Response.json(
              { error: code },
              { status: response.status >= 500 ? 503 : 409, headers },
            );
          }

          // Keep the current KALLISTIS credential untouched until Gravewright confirms the
          // exact same one-piece phrase. A remote rejection or timeout must not lock the player out.
          failureStage = "kallistis_write";
          await sql.query(
            "INSERT INTO public.player_access " +
              "(player_code,user_id,credential_lookup_digest,credential_hash,credential_ciphertext,revoked_at) " +
              "VALUES ($1,$2,$3,$4,$5,NULL) ON CONFLICT (user_id) DO UPDATE SET " +
              "player_code=EXCLUDED.player_code,credential_lookup_digest=EXCLUDED.credential_lookup_digest, " +
              "credential_hash=EXCLUDED.credential_hash,credential_ciphertext=EXCLUDED.credential_ciphertext, " +
              "revoked_at=NULL,updated_at=now()",
            [
              player[0].player_code,
              auth.userId,
              credential_lookup_digest,
              credential_hash,
              credential_ciphertext,
            ],
          );
          return Response.json({ phrase, player_code: player[0].player_code }, { headers });
        } catch (error) {
          const databaseCode =
            error && typeof error === "object" && "code" in error
              ? String((error as { code: unknown }).code)
              : undefined;
          console.error("[player-phrase] save failed", {
            stage: failureStage,
            errorName: error instanceof Error ? error.name : "unknown",
            databaseCode,
          });
          const code =
            error instanceof Error && error.message.includes("duplicate key")
              ? "player_phrase_conflict"
              : error instanceof Error &&
                  ["player_phrase_pool_exhausted", "player_phrase_allocation_unavailable"].includes(
                    error.message,
                  )
                ? error.message
                : "player_phrase_save_failed";
          return Response.json(
            { error: code },
            { status: code === "player_phrase_pool_exhausted" ? 409 : 503, headers },
          );
        } finally {
          sql.close();
        }
      },
    },
  },
});
