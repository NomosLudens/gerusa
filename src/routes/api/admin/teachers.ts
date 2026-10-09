import { requireUser } from "@/lib/require-user.server";
import { readSessionCookie } from "@/server/local-core/cookies";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";
import { createFileRoute } from "@tanstack/react-router";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/admin/teachers")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const token = readSessionCookie(request.headers.get("cookie"));
        try {
          return Response.json(await gerusaCoreRequest("/admin/teachers", {}, token), {
            headers: { "Cache-Control": "no-store" },
          });
        } catch (error) {
          const status = error instanceof Error && error.message.endsWith("403") ? 403 : 503;
          return Response.json(
            { error: status === 403 ? "forbidden" : "teachers_unavailable" },
            { status, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403 });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = (await request.json().catch(() => null)) as {
          name?: unknown;
          email?: unknown;
          mesaIds?: unknown;
        } | null;
        if (
          !body ||
          typeof body.name !== "string" ||
          typeof body.email !== "string" ||
          typeof body.mesaIds !== "object" ||
          !Array.isArray(body.mesaIds) ||
          body.name.trim().length < 2 ||
          body.name.trim().length > 60 ||
          body.email.trim().length > 254 ||
          !emailPattern.test(body.email.trim()) ||
          body.mesaIds.length < 1 ||
          body.mesaIds.length > 20 ||
          body.mesaIds.some((id) => typeof id !== "string" || !uuidPattern.test(id))
        )
          return Response.json({ error: "invalid_teacher" }, { status: 400 });

        const token = readSessionCookie(request.headers.get("cookie"));
        try {
          return Response.json(
            await gerusaCoreRequest(
              "/admin/teachers",
              {
                method: "POST",
                body: JSON.stringify({
                  name: body.name.trim(),
                  email: body.email.trim().toLowerCase(),
                  mesaIds: body.mesaIds,
                }),
              },
              token,
            ),
            { status: 201, headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          const status = message.endsWith("409") ? 409 : message.endsWith("400") ? 400 : 503;
          const code =
            status === 409
              ? "teacher_conflict"
              : status === 400
                ? "invalid_teacher"
                : "teacher_creation_unavailable";
          return Response.json({ error: code }, { status });
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
        } | null;
        if (
          !body ||
          typeof body.id !== "string" ||
          !uuidPattern.test(body.id) ||
          body.action !== "reset_password"
        )
          return Response.json({ error: "invalid_teacher_action" }, { status: 400 });
        const token = readSessionCookie(request.headers.get("cookie"));
        try {
          return Response.json(
            await gerusaCoreRequest(
              `/admin/teachers/${body.id}`,
              { method: "PATCH", body: JSON.stringify({ resetPassword: true }) },
              token,
            ),
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          const status = error instanceof Error && error.message.endsWith("403") ? 403 : 503;
          return Response.json(
            { error: status === 403 ? "forbidden" : "teacher_password_reset_unavailable" },
            { status },
          );
        }
      },
    },
  },
});
