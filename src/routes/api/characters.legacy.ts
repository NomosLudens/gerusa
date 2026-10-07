import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { buildCharacterContext } from "@/server/characters/context";
import {
  mechanicalFingerprint,
  validateMagicChoices,
  validateCharacterSnapshot,
} from "@/server/characters/character-canon";
import { createPostgresCharacterRepository } from "@/server/characters/repository";
import type { CharacterSnapshot } from "@/server/characters/character-canon";
import { isSystemMaster } from "@/server/local-core/player-access";
import { syncCharacterToGravewright } from "@/server/characters/gravewright-sync";

const headers = { "Cache-Control": "no-store" };
function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}
async function body(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  // Character Forge snapshots may include embedded portrait/gallery media and
  // structural checkpoints. Keep the limit bounded, but above the supported
  // authenticated Forge payload size.
  if (text.length > 8 * 1_048_576) throw new Error("body_too_large");
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
function errorResponse(error: unknown): Response {
  const code = error instanceof Error ? error.message : "character_request_failed";
  const status =
    code === "character_delete_forbidden"
      ? 403
      : code === "stale_character_version"
        ? 409
        : code === "character_not_found"
          ? 404
          : [
                "invalid_character_transition",
                "invalid_progression_transition",
                "character_not_editable",
                "mesa_assignment_forbidden",
                "progression_proposal_mismatch",
                "epic_review_required",
              ].includes(code)
            ? 409
            : [
                  "character_invalid",
                  "mesa_not_available",
                  "progression_target_invalid",
                  "progression_gain_missing",
                  "progression_patch_invalid",
                  "progression_proposal_required",
                  "progression_proposal_invalid",
                  "epic_manifestation_review_invalid",
                  "epic_feedback_required",
                ].includes(code)
              ? 422
              : code === "body_too_large"
                ? 413
                : code === "character_reviewer_unavailable"
                  ? 503
                  : 400;
  return Response.json({ error: code }, { status, headers });
}
async function withRepo<T>(
  fn: (
    repo: ReturnType<typeof createPostgresCharacterRepository>,
    sql: ReturnType<typeof createBunPostgresExecutor>,
  ) => Promise<T>,
): Promise<T | Response> {
  const sql = runtime();
  if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
  try {
    return await fn(createPostgresCharacterRepository(sql), sql);
  } finally {
    sql.close();
  }
}

export const Route = createFileRoute("/api/characters")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        return withRepo(async (repo, sql) => {
          const q = new URL(request.url).searchParams,
            id = q.get("characterId");
          if (q.get("reviewQueue") === "true") {
            return Response.json(
              {
                characters: await repo.submittedForReviewer(auth.userId),
                progression: await repo.pendingProgressionForReviewer(auth.userId),
                precedents: await repo.epicPrecedentsForReviewer(auth.userId),
              },
              { headers },
            );
          }
          if (id) {
            const character = await repo.get(auth.userId, id);
            if (!character)
              return Response.json({ error: "character_not_found" }, { status: 404, headers });
            return Response.json(
              {
                character,
                events: await repo.events(auth.userId, id),
                versions: await repo.versions(auth.userId, id),
                messages: await repo.messages(auth.userId, id),
                progression: await repo.progressionList(auth.userId, id),
                context: buildCharacterContext(character),
              },
              { headers },
            );
          }
          const canAssignMesas = await isSystemMaster(sql, auth.userId);
          return Response.json(
            {
              characters: await repo.list(auth.userId, q.get("includeArchived") === "true"),
              mesas: canAssignMesas ? await repo.listAllMesas() : [],
              canAssignMesas,
            },
            { headers },
          );
        });
      },
      PUT: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        try {
          const input = await body(request);
          if (!input) throw new Error("invalid_json");
          if (input.snapshot === undefined && Array.isArray(input.mesaIds)) {
            return await withRepo(async (repo) =>
              Response.json(
                {
                  character: await repo.setMesas(
                    auth.userId,
                    String(input.id || ""),
                    input.mesaIds as string[],
                  ),
                },
                { headers },
              ),
            );
          }
          const snapshot = (input.snapshot ?? {}) as CharacterSnapshot,
            id = String(input.id || randomUUID()),
            expected = input.expectedVersion == null ? null : Number(input.expectedVersion);
          return await withRepo(async (repo, sql) => {
            const current = await repo.get(auth.userId, id);
            const magicErrors = validateMagicChoices(snapshot);
            if (magicErrors.length)
              return Response.json(
                {
                  error: "character_invalid",
                  validation: { ok: false, errors: magicErrors, warnings: [] },
                },
                { status: 422, headers },
              );
            const validation =
              !current && snapshot.completo === true
                ? validateCharacterSnapshot(snapshot, true)
                : validateCharacterSnapshot(snapshot, false);
            if (!current && snapshot.completo === true && !validation.ok)
              return Response.json(
                { error: "character_invalid", validation },
                { status: 422, headers },
              );
            const canAssignMesas = await isSystemMaster(sql, auth.userId);
            if (Array.isArray(input.mesaIds) && !canAssignMesas) {
              throw new Error("mesa_assignment_forbidden");
            }
            const mesaIds =
              canAssignMesas && Array.isArray(input.mesaIds)
                ? (input.mesaIds as string[])
                : undefined;
            const character = current
              ? await repo.save(
                  auth.userId,
                  id,
                  snapshot,
                  mechanicalFingerprint(snapshot),
                  expected ?? current.version,
                  mesaIds,
                )
              : await repo.create(
                  auth.userId,
                  id,
                  snapshot,
                  String(snapshot.ruleset || "KALLISTIS_REGRAS_CANONICAS_2.0"),
                  mechanicalFingerprint(snapshot),
                  mesaIds,
                );
            return Response.json(
              { character, validation },
              { status: current ? 200 : 201, headers },
            );
          });
        } catch (e) {
          return errorResponse(e);
        }
      },
      POST: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        try {
          const input = await body(request);
          if (!input) throw new Error("invalid_json");
          const action = String(input.action || "");
          return await withRepo(async (repo, sql) => {
            const id = String(input.id || "");
            if (!id) throw new Error("character_id_required");
            if (["submit", "reject", "approve", "archive", "discard", "delete"].includes(action)) {
              if (action === "submit") {
                const c = await repo.get(auth.userId, id);
                if (!c) throw new Error("character_not_found");
                const valid = validateCharacterSnapshot(c.snapshot, true);
                if (!valid.ok)
                  return Response.json(
                    { error: "character_invalid", validation: valid },
                    { status: 422, headers },
                  );
              }
              const character = await repo.transition(
                auth.userId,
                id,
                action as "submit" | "reject" | "approve" | "archive" | "discard" | "delete",
                String(input.note || ""),
              );
              if (action === "approve") {
                const approved = await repo.getForAuthorizedMaster(auth.userId, id);
                if (approved) {
                  const gravewright_sync = await syncCharacterToGravewright(sql, approved);
                  return Response.json({ character: approved, gravewright_sync }, { headers });
                }
              }
              return Response.json({ character }, { headers });
            }
            if (
              [
                "request",
                "enable",
                "start",
                "apply",
                "reject_progression",
                "approve_epic",
                "provisionally_approve_epic",
                "return_epic",
                "reject_epic",
              ].includes(action)
            ) {
              const progressionResult = await repo.progression(
                auth.userId,
                id,
                action === "reject_progression"
                  ? "reject"
                  : (action as
                      | "request"
                      | "enable"
                      | "start"
                      | "apply"
                      | "reject"
                      | "approve_epic"
                      | "provisionally_approve_epic"
                      | "return_epic"
                      | "reject_epic"),
                input.expectedVersion == null ? undefined : Number(input.expectedVersion),
                (input.snapshot ?? undefined) as CharacterSnapshot | undefined,
                String(input.feedback ?? input.note ?? ""),
              );
              const character =
                action === "request" ? await repo.get(auth.userId, id) : progressionResult;
              if (!character) throw new Error("character_not_found");
              const gravewright_sync =
                action === "apply"
                  ? await repo
                      .getForAuthorizedMaster(auth.userId, id)
                      .then((updated) =>
                        updated ? syncCharacterToGravewright(sql, updated) : null,
                      )
                  : null;
              return Response.json(
                {
                  character,
                  progression: await repo.progressionList(auth.userId, id),
                  gravewright_sync,
                },
                { headers },
              );
            }
            throw new Error("unknown_character_action");
          });
        } catch (e) {
          return errorResponse(e);
        }
      },
    },
  },
});
