import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { isSystemMaster } from "@/server/local-core/player-access";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import {
  mechanicalFingerprint,
  validateCharacterSnapshot,
  validateMagicChoices,
  type CharacterSnapshot,
} from "@/server/characters/character-canon";
import { createPostgresCharacterRepository } from "@/server/characters/repository";
import type { CharacterRecord } from "@/server/characters/contracts";
import { buildGravewrightCharacterExport } from "@/server/characters/gravewright-export";

const headers = { "Cache-Control": "no-store" };
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const value = await request.json().catch(() => null);
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

function publicMasterCharacter(character: CharacterRecord) {
  return {
    id: character.id,
    ownerUserId: character.ownerUserId,
    name: character.name,
    playerName: character.playerName,
    ownerDisplayName: character.ownerDisplayName ?? "",
    status: character.status,
    snapshot: character.snapshot,
    kallistis: character.kallistis,
    mesas: character.mesas,
    version: character.version,
    updatedAt: character.updatedAt,
  };
}

export const Route = createFileRoute("/api/master/characters")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const repo = createPostgresCharacterRepository(sql);
          const mesas = await repo.listMasterMesas(auth.userId);
          const systemMaster = await isSystemMaster(sql, auth.userId);
          const url = new URL(request.url);
          const exportRequested = url.searchParams.get("export") === "gravewright";
          if (!systemMaster && !mesas.length && !exportRequested)
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          const characterId = url.searchParams.get("characterId");
          if (characterId) {
            const character = exportRequested
              ? await repo.getForManualExportAuthorizedMaster(auth.userId, characterId)
              : await repo.getForAuthorizedMaster(auth.userId, characterId);
            if (!character)
              return Response.json({ error: "character_not_found" }, { status: 404, headers });
            if (exportRequested) {
              try {
                const requestedMesaId = url.searchParams.get("mesaId");
                const mesa = requestedMesaId
                  ? character.mesas.find((entry) => entry.id === requestedMesaId)
                  : character.mesas.length === 1
                    ? character.mesas[0]
                    : undefined;
                if (requestedMesaId && !mesa)
                  return Response.json(
                    { error: "character_mesa_not_assigned" },
                    { status: 404, headers },
                  );
                if (character.mesas.length > 1 && !requestedMesaId)
                  return Response.json(
                    { error: "character_mesa_required" },
                    { status: 400, headers },
                  );
                const exported = buildGravewrightCharacterExport({ character, mesa });
                return Response.json(exported, { headers });
              } catch (error) {
                if (error instanceof Error && error.message === "character_structurally_incomplete")
                  return Response.json(
                    {
                      error: error.message,
                      validation: (error as Error & { validation?: unknown }).validation,
                    },
                    { status: 422, headers },
                  );
                throw error;
              }
            }
            return Response.json({ character: publicMasterCharacter(character) }, { headers });
          }
          const accessClause = systemMaster
            ? "TRUE"
            : "EXISTS (SELECT 1 FROM public.mesa_members master_mm WHERE master_mm.mesa_id=mm.mesa_id AND master_mm.user_id=$1 AND master_mm.member_role='mestre' AND master_mm.membership_status='active')";
          const players = await sql.query<{
            id: string;
            name: string | null;
            mesaId: string;
            mesaName: string;
          }>(
            `SELECT u.id::text AS id,p.display_name AS name,mm.mesa_id::text AS "mesaId",m.name AS "mesaName"
               FROM public.users u
               JOIN public.profiles p ON p.id=u.id
               JOIN public.mesa_members mm ON mm.user_id=u.id AND mm.member_role='jogador' AND mm.membership_status='active'
               JOIN public.mesas m ON m.id=mm.mesa_id
              WHERE u.status='active' AND ${accessClause}
              ORDER BY lower(COALESCE(p.display_name,'')),mm.mesa_id::text,u.id::text`,
            systemMaster ? [] : [auth.userId],
          );
          const campaigns = await sql.query<{
            id: string;
            mesaId: string;
            mesaName: string;
            name: string;
            status: string;
          }>(
            `SELECT c.id::text AS id,c.mesa_id::text AS "mesaId",m.name AS "mesaName",c.name,c.status
               FROM public.campaigns c
               JOIN public.mesas m ON m.id=c.mesa_id
              WHERE c.status='active'
                AND ${systemMaster ? "TRUE" : "EXISTS (SELECT 1 FROM public.mesa_members campaign_mm WHERE campaign_mm.mesa_id=c.mesa_id AND campaign_mm.user_id=$1 AND campaign_mm.member_role='mestre' AND campaign_mm.membership_status='active')"}
              ORDER BY lower(c.name),c.id`,
            systemMaster ? [] : [auth.userId],
          );

          const includeArchived =
            new URL(request.url).searchParams.get("includeArchived") === "true";
          const characters = await repo.listForAuthorizedMaster(auth.userId, includeArchived);
          return Response.json(
            {
              mesas,
              players,
              campaigns,
              characters: characters.map(publicMasterCharacter),
              canEditCharacters: systemMaster,
            },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
      PUT: async ({ request }) => {
        if (
          !isSameOriginRequest(
            request,
            process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app",
          )
        )
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await isSystemMaster(sql, auth.userId)))
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          const input = await readBody(request);
          const id = String(input?.id || "");
          const snapshot = (input?.snapshot ?? {}) as CharacterSnapshot;
          const expectedVersion = Number(input?.expectedVersion);
          if (!id || !Number.isInteger(expectedVersion))
            return Response.json({ error: "invalid_character_request" }, { status: 400, headers });
          const magicErrors = validateMagicChoices(snapshot);
          if (magicErrors.length)
            return Response.json(
              {
                error: "character_invalid",
                validation: { ok: false, errors: magicErrors, warnings: [] },
              },
              { status: 422, headers },
            );
          if (snapshot.completo === true) {
            const validation = validateCharacterSnapshot(snapshot, true);
            if (!validation.ok)
              return Response.json(
                { error: "character_invalid", validation },
                { status: 422, headers },
              );
          }
          const repo = createPostgresCharacterRepository(sql);
          const character = await repo.save(
            auth.userId,
            id,
            snapshot,
            mechanicalFingerprint(snapshot),
            expectedVersion,
          );
          return Response.json(
            { character: publicMasterCharacter(character), actor: "TAL" },
            { headers },
          );
        } catch (error) {
          const code = error instanceof Error ? error.message : "master_character_update_failed";
          const status =
            code === "stale_character_version"
              ? 409
              : code === "character_invalid"
                ? 422
                : code === "character_not_found"
                  ? 404
                  : 409;
          return Response.json({ error: code }, { status, headers });
        } finally {
          sql.close();
        }
      },
      POST: async ({ request }) => {
        if (
          !isSameOriginRequest(
            request,
            process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app",
          )
        )
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await isSystemMaster(sql, auth.userId)))
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          const input = await readBody(request);
          if (String(input?.action || "") !== "delete" || !input?.id)
            return Response.json({ error: "invalid_character_request" }, { status: 400, headers });
          const repo = createPostgresCharacterRepository(sql);
          const character = await repo.transition(
            auth.userId,
            String(input.id),
            "delete",
            String(input.note || ""),
          );
          return Response.json({ character: publicMasterCharacter(character) }, { headers });
        } catch (error) {
          const code = error instanceof Error ? error.message : "master_character_delete_failed";
          const status =
            code === "character_not_found"
              ? 404
              : code === "invalid_character_transition"
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
