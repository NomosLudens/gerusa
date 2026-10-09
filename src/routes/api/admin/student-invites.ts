import { requireUser } from "@/lib/require-user.server";
import { readSessionCookie } from "@/server/local-core/cookies";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";
import { createFileRoute } from "@tanstack/react-router";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/admin/student-invites")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403 });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = (await request.json().catch(() => null)) as { mesaId?: unknown } | null;
        if (!body || typeof body.mesaId !== "string" || !uuidPattern.test(body.mesaId))
          return Response.json({ error: "invalid_invite" }, { status: 400 });
        const token = readSessionCookie(request.headers.get("cookie"));
        try {
          return Response.json(
            await gerusaCoreRequest(
              "/admin/student-invites",
              {
                method: "POST",
                body: JSON.stringify({ mesaId: body.mesaId }),
              },
              token,
            ),
            { status: 201, headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          const status = error instanceof Error && error.message.endsWith("403") ? 403 : 503;
          return Response.json(
            { error: status === 403 ? "forbidden" : "invite_creation_unavailable" },
            { status },
          );
        }
      },
    },
  },
});
