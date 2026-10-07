import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";
import { readSessionCookie } from "@/server/local-core/cookies";

export const Route = createFileRoute("/api/auth/password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403 });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = (await request.json().catch(() => null)) as {
          currentPassword?: unknown;
          newPassword?: unknown;
        } | null;
        if (
          !body ||
          typeof body.currentPassword !== "string" ||
          typeof body.newPassword !== "string"
        )
          return Response.json({ error: "invalid_password" }, { status: 400 });
        try {
          const result = await gerusaCoreRequest<{ ok: boolean }>(
            "/auth/change-password",
            { method: "POST", body: JSON.stringify(body) },
            readSessionCookie(request.headers.get("cookie")),
          );
          return Response.json(result, { headers: { "Cache-Control": "no-store" } });
        } catch {
          return Response.json({ error: "password_change_failed" }, { status: 400 });
        }
      },
    },
  },
});
