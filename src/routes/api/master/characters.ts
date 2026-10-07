import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { gerusaCoreRequest } from "@/server/gerusa/store";
import { readSessionCookie } from "@/server/local-core/cookies";

const headers = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/master/characters")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const token = readSessionCookie(request.headers.get("cookie"));
        try {
          const result = await gerusaCoreRequest<{
            students: Array<{
              id: string;
              name: string | null;
              mesaId: string;
              mesaName: string;
              threadId: string | null;
            }>;
            mesas: Array<{ id: string; slug: string; name: string }>;
            campaigns: Array<{
              id: string;
              mesaId: string;
              mesaName: string;
              name: string;
              status: string;
            }>;
          }>("/master/summary", {}, token);
          const characterId = new URL(request.url).searchParams.get("characterId");
          if (characterId)
            return Response.json({ error: "character_not_found" }, { status: 404, headers });
          return Response.json(
            { ...result, players: result.students, characters: [], canEditCharacters: false },
            { headers },
          );
        } catch (error) {
          const status = error instanceof Error && error.message.includes("_403") ? 403 : 503;
          return Response.json(
            { error: status === 403 ? "forbidden" : "master_summary_unavailable" },
            { status, headers },
          );
        }
      },
      PUT: async () =>
        Response.json({ error: "character_editing_not_available" }, { status: 404, headers }),
    },
  },
});
