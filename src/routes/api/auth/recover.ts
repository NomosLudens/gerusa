import { createFileRoute } from "@tanstack/react-router";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";

export const Route = createFileRoute("/api/auth/recover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403 });
        const body = (await request.json().catch(() => null)) as {
          identifier?: unknown;
          recoveryCode?: unknown;
          newPassword?: unknown;
        } | null;
        if (
          !body ||
          typeof body.identifier !== "string" ||
          typeof body.recoveryCode !== "string" ||
          typeof body.newPassword !== "string"
        )
          return Response.json({ error: "recovery_unavailable" }, { status: 400 });
        try {
          await gerusaCoreRequest("/auth/recover", {
            method: "POST",
            body: JSON.stringify(body),
          });
          return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
        } catch {
          return Response.json({ error: "recovery_unavailable" }, { status: 400 });
        }
      },
    },
  },
});
