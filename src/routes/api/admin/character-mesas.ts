import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { isSystemMaster } from "@/server/local-core/player-access";
import { createPostgresCharacterRepository } from "@/server/characters/repository";
import { buildCharacterDraft } from "@/server/characters/chat-creation";
import { mechanicalFingerprint } from "@/server/characters/character-canon";
import { syncCharacterToGravewright } from "@/server/characters/gravewright-sync";
import {
  createReadyCharacterPresetSnapshot,
  listReadyCharacterPresets,
} from "@/server/characters/presets";

const headers = { "Cache-Control": "no-store" };
const expectedOrigin = () => process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

async function gate(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return { error: auth.error } as const;
  const sql = runtime();
  if (!sql) {
    return {
      error: Response.json({ error: "database_unavailable" }, { status: 503, headers }),
    } as const;
  }
  if (!(await isSystemMaster(sql, auth.userId))) {
    sql.close();
    return { error: Response.json({ error: "forbidden" }, { status: 403, headers }) } as const;
  }
  return { auth, sql, repo: createPostgresCharacterRepository(sql) } as const;
}

export const Route = createFileRoute("/api/admin/character-mesas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const current = await gate(request);
        if ("error" in current) return current.error;
        try {
          const characters = await current.repo.listForMaster();
          return Response.json(
            {
              characters,
              templates: characters.filter(
                (character) =>
                  character.ownerUserId === current.auth.userId &&
                  character.status === "approved" &&
                  character.snapshot.completo === true &&
                  character.publishedSnapshot?.completo === true &&
                  character.mesas.length === 0,
              ),
              presets: listReadyCharacterPresets(),
              mesas: await current.repo.listAllMesas(),
            },
            { headers },
          );
        } finally {
          current.sql.close();
        }
      },
      PUT: async ({ request }) => {
        if (!isSameOriginRequest(request, expectedOrigin())) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        }
        const current = await gate(request);
        if ("error" in current) return current.error;
        try {
          const body = (await request.json().catch(() => null)) as {
            character_id?: unknown;
            mesa_ids?: unknown;
          } | null;
          if (
            !body ||
            typeof body.character_id !== "string" ||
            !Array.isArray(body.mesa_ids) ||
            body.mesa_ids.some((id) => typeof id !== "string")
          ) {
            return Response.json({ error: "invalid_character_mesas" }, { status: 400, headers });
          }
          const mesaIds = [...new Set(body.mesa_ids as string[])];
          const character = await current.repo.setMesas(
            current.auth.userId,
            body.character_id,
            mesaIds,
          );
          const sync = await syncCharacterToGravewright(current.sql, character);
          return Response.json({ character, gravewright_sync: sync }, { headers });
        } catch (error) {
          const message = error instanceof Error ? error.message : "invalid_character_mesas";
          const status = message === "character_not_found" ? 404 : 400;
          return Response.json({ error: message }, { status, headers });
        } finally {
          current.sql.close();
        }
      },
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request, expectedOrigin())) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        }
        const current = await gate(request);
        if ("error" in current) return current.error;
        try {
          const body = (await request.json().catch(() => null)) as {
            action?: unknown;
            owner_user_id?: unknown;
            character_id?: unknown;
            name?: unknown;
            mesa_ids?: unknown;
            template_id?: unknown;
          } | null;
          if (String(body?.action || "") === "create_template") {
            const snapshot = buildCharacterDraft(String(body?.name || ""), "", "");
            snapshot.completo = false;
            snapshot.jogador = "";
            snapshot.passo = 0;
            const character = await current.repo.create(
              current.auth.userId,
              randomUUID(),
              snapshot,
              String(snapshot.ruleset || "KALLISTIS_REGRAS_CANONICAS_2.0"),
              mechanicalFingerprint(snapshot),
              [],
            );
            return Response.json({ character }, { status: 201, headers });
          }
          if (
            String(body?.action || "") === "sync_character" &&
            typeof body?.character_id === "string"
          ) {
            const character = await current.repo.getForAuthorizedMaster(
              current.auth.userId,
              body.character_id,
            );
            if (!character)
              return Response.json({ error: "character_not_found" }, { status: 404, headers });
            const gravewright_sync = await syncCharacterToGravewright(current.sql, character);
            return Response.json({ character, gravewright_sync }, { headers });
          }
          if (
            String(body?.action || "") === "assign_template" &&
            typeof body?.template_id === "string" &&
            typeof body?.owner_user_id === "string" &&
            Array.isArray(body.mesa_ids) &&
            body.mesa_ids.every((id) => typeof id === "string")
          ) {
            if (body.template_id.startsWith("preset:")) {
              const ready = createReadyCharacterPresetSnapshot(
                body.template_id.slice("preset:".length),
              );
              if (!ready)
                return Response.json(
                  { error: "character_template_not_found" },
                  { status: 404, headers },
                );
              const character = await current.repo.assignReadySnapshot(
                current.auth.userId,
                ready.preset.id,
                ready.preset.name,
                "KALLISTIS_REGRAS_CANONICAS_2.0",
                ready.snapshot,
                body.owner_user_id,
                body.mesa_ids as string[],
              );
              const gravewright_sync = await syncCharacterToGravewright(current.sql, character);
              return Response.json({ character, gravewright_sync }, { status: 201, headers });
            }
            const character = await current.repo.assignApprovedTemplate(
              current.auth.userId,
              body.template_id,
              body.owner_user_id,
              body.mesa_ids as string[],
            );
            const gravewright_sync = await syncCharacterToGravewright(current.sql, character);
            return Response.json({ character, gravewright_sync }, { status: 201, headers });
          }
          if (String(body?.action || "") !== "create" || typeof body?.owner_user_id !== "string")
            return Response.json({ error: "invalid_character_create" }, { status: 400, headers });
          const player = await current.sql.query<{ display_name: string | null }>(
            `SELECT p.display_name FROM public.users u
              JOIN public.profiles p ON p.id = u.id
             WHERE u.id=$1 AND u.status='active'
               AND NOT EXISTS (SELECT 1 FROM public.system_roles sr WHERE sr.user_id=u.id AND sr.system_role='system_master')
             LIMIT 1`,
            [body.owner_user_id],
          );
          if (!player[0])
            return Response.json({ error: "player_not_found" }, { status: 404, headers });
          const snapshot = buildCharacterDraft(String(body.name || ""), "", "");
          snapshot.completo = false;
          snapshot.jogador = String(player[0].display_name || "");
          snapshot.passo = 0;
          const mesaIds =
            Array.isArray(body.mesa_ids) && body.mesa_ids.every((id) => typeof id === "string")
              ? (body.mesa_ids as string[])
              : [];
          const character = await current.repo.create(
            current.auth.userId,
            randomUUID(),
            snapshot,
            String(snapshot.ruleset || "KALLISTIS_REGRAS_CANONICAS_2.0"),
            mechanicalFingerprint(snapshot),
            mesaIds,
            body.owner_user_id,
          );
          return Response.json({ character }, { status: 201, headers });
        } catch (error) {
          const message = error instanceof Error ? error.message : "character_create_failed";
          const status =
            message === "player_not_found" || message === "character_template_not_found"
              ? 404
              : message === "mesa_not_available" || message === "player_not_in_mesa"
                ? 422
                : 400;
          return Response.json({ error: message }, { status, headers });
        } finally {
          current.sql.close();
        }
      },
    },
  },
});
