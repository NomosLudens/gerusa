import { createFileRoute } from "@tanstack/react-router";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";
import { readSessionCookie } from "@/server/local-core/cookies";
import { requireUser } from "@/lib/require-user.server";

const headers = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const token = readSessionCookie(request.headers.get("cookie"));
        try {
          const result = await gerusaCoreRequest<{
            profile: {
              id: string;
              email: string;
              displayName: string | null;
              pronouns: string | null;
              isSystemMaster: boolean;
              isMaster: boolean;
              mesas: Array<Record<string, unknown>>;
            };
          }>("/profile", {}, token);
          const user = result.profile;
          const students =
            user.isMaster || user.isSystemMaster
              ? await gerusaCoreRequest<{ students: Array<Record<string, unknown>> }>(
                  "/master/summary",
                  {},
                  token,
                )
              : { students: [] };
          return Response.json(
            {
              profile: {
                id: user.id,
                email: user.email,
                display_name: user.displayName,
                pronouns: user.pronouns,
                avatar_url: null,
              },
              onboarding: null,
              mesas: user.mesas,
              students: students.students,
              is_system_master: user.isSystemMaster,
              is_master: user.isMaster || user.isSystemMaster,
              allowed_app_ids:
                user.isMaster || user.isSystemMaster
                  ? null
                  : ["personagens", "kallistis-chat", "perfil"],
            },
            { headers },
          );
        } catch {
          return Response.json({ error: "profile_unavailable" }, { status: 503, headers });
        }
      },
      PUT: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const token = readSessionCookie(request.headers.get("cookie"));
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (
          !body ||
          Object.keys(body).some((key) => !["display_name", "pronouns"].includes(key)) ||
          !(
            body.display_name === undefined ||
            body.display_name === null ||
            typeof body.display_name === "string"
          ) ||
          !(
            body.pronouns === undefined ||
            body.pronouns === null ||
            typeof body.pronouns === "string"
          ) ||
          (typeof body.display_name === "string" && body.display_name.trim().length > 60) ||
          (typeof body.pronouns === "string" && body.pronouns.trim().length > 80)
        ) {
          return Response.json({ error: "invalid_profile" }, { status: 400, headers });
        }
        try {
          const result = await gerusaCoreRequest<{ profile: Record<string, unknown> }>(
            "/profile",
            { method: "PUT", body: JSON.stringify(body) },
            token,
          );
          return Response.json(result, { headers });
        } catch {
          return Response.json({ error: "profile_unavailable" }, { status: 503, headers });
        }
      },
    },
  },
});
