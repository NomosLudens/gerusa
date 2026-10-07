import { createFileRoute } from "@tanstack/react-router";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";
import { buildSessionCookie } from "@/server/local-core/cookies";

export const Route = createFileRoute("/api/setup/initialize")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403 });
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (
          !body ||
          Object.keys(body).some(
            (key) => !["name", "identifier", "secret", "confirmSecret"].includes(key),
          ) ||
          typeof body.name !== "string" ||
          typeof body.identifier !== "string" ||
          typeof body.secret !== "string" ||
          body.secret !== body.confirmSecret
        )
          return Response.json({ error: "invalid_setup" }, { status: 400 });
        try {
          const result = await gerusaCoreRequest<{
            token: string;
            recoveryCode: string;
            user: { id: string };
          }>("/setup/initialize", {
            method: "POST",
            body: JSON.stringify({
              name: body.name,
              identifier: body.identifier,
              secret: body.secret,
            }),
          });
          return Response.json(
            { user: result.user, recoveryCode: result.recoveryCode },
            {
              status: 201,
              headers: {
                "Cache-Control": "no-store",
                "Set-Cookie": buildSessionCookie(result.token, 30 * 24 * 60 * 60),
              },
            },
          );
        } catch (error) {
          const status = error instanceof Error && error.message.endsWith("409") ? 409 : 503;
          return Response.json(
            { error: status === 409 ? "setup_closed" : "setup_unavailable" },
            { status },
          );
        }
      },
    },
  },
});
