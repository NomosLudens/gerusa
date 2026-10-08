import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";
import { readSessionCookie } from "@/server/local-core/cookies";

const usernamePattern = /^[a-z0-9][a-z0-9_\x2d]{2,31}$/;

export const Route = createFileRoute("/api/admin/students")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const token = readSessionCookie(request.headers.get("cookie"));
        try {
          return Response.json(await gerusaCoreRequest("/admin/students", {}, token), {
            headers: { "Cache-Control": "no-store" },
          });
        } catch {
          return Response.json({ error: "students_unavailable" }, { status: 503 });
        }
      },
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403 });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = await request.json().catch(() => null);
        if (!body) return Response.json({ error: "invalid_student" }, { status: 400 });
        if (
          typeof body.username !== "string" ||
          !usernamePattern.test(body.username.trim().toLowerCase())
        ) {
          return Response.json({ error: "invalid_username" }, { status: 400 });
        }
        const token = readSessionCookie(request.headers.get("cookie"));
        try {
          return Response.json(
            await gerusaCoreRequest(
              "/admin/students",
              { method: "POST", body: JSON.stringify(body) },
              token,
            ),
            { status: 201, headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error && error.message.endsWith("409")
                  ? "username_unavailable"
                  : error instanceof Error && error.message.endsWith("400")
                    ? "invalid_student"
                    : "student_unavailable",
            },
            {
              status:
                error instanceof Error && error.message.endsWith("409")
                  ? 409
                  : error instanceof Error && error.message.endsWith("400")
                    ? 400
                    : 503,
            },
          );
        }
      },
      PATCH: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403 });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = (await request.json().catch(() => null)) as {
          id?: unknown;
          action?: unknown;
          status?: unknown;
        } | null;
        if (!body || typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id))
          return Response.json({ error: "invalid_student" }, { status: 400 });
        const action = body.action === "reset_pin" ? { resetPin: true } : { status: body.status };
        const token = readSessionCookie(request.headers.get("cookie"));
        try {
          return Response.json(
            await gerusaCoreRequest(
              `/admin/students/${body.id}`,
              { method: "PATCH", body: JSON.stringify(action) },
              token,
            ),
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch {
          return Response.json({ error: "student_action_unavailable" }, { status: 503 });
        }
      },
    },
  },
});
