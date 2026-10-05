import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { createPostgresCharacterRepository } from "@/server/characters/repository";

const headers = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BODY_FIELDS = new Set(["source_user_id", "characterId"]);

function validCharacterId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 200;
}

export const Route = createFileRoute("/api/internal/vtt/characters/read")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.KALLISTIS_VTT_SERVICE_SECRET;
        if (!secret || request.headers.get("authorization") !== "Bearer " + secret)
          return Response.json(
            { valid: false, error: "service_unauthorized" },
            { status: 401, headers },
          );

        const body = await request.json().catch(() => null);
        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          Object.keys(body).some((key) => !BODY_FIELDS.has(key)) ||
          !UUID.test(String((body as { source_user_id?: unknown }).source_user_id ?? "")) ||
          !validCharacterId((body as { characterId?: unknown }).characterId)
        ) {
          return Response.json(
            { valid: false, error: "invalid_character_request" },
            { status: 400, headers },
          );
        }

        const databaseUrl = getRuntimeDatabaseUrl();
        if (!databaseUrl)
          return Response.json(
            { valid: false, error: "database_unavailable" },
            { status: 503, headers },
          );

        const sql = createBunPostgresExecutor(databaseUrl);
        try {
          const repo = createPostgresCharacterRepository(sql);
          const sourceUserId = (body as { source_user_id: string }).source_user_id;
          const characterId = (body as { characterId: string }).characterId.trim();
          const character = await repo.get(sourceUserId, characterId);
          if (!character)
            return Response.json(
              { valid: false, error: "character_not_found" },
              { status: 404, headers },
            );

          const kallistis = character.kallistis;
          if (!kallistis) throw new Error("character_projection_unavailable");

          return Response.json(
            {
              valid: true,
              character: {
                id: character.id,
                kallistis: {
                  manifestacao_pessoal: kallistis.manifestacao_pessoal,
                  fulgor_current: kallistis.fulgor_current,
                  capability_manifestation_descriptions:
                    kallistis.capability_manifestation_descriptions,
                },
              },
            },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
    },
  },
});
