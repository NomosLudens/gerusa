import { createFileRoute } from "@tanstack/react-router";
import { buildSessionCookie } from "@/server/local-core/cookies";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";

const headers = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/student-invites")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token") ?? "";
        try {
          const result = await gerusaCoreRequest<{
            available: boolean;
            mesaName?: string;
            expiresAt?: string;
          }>(`/student-invites/validate?token=${encodeURIComponent(token)}`);
          return Response.json(result, { headers });
        } catch {
          return Response.json({ available: false }, { status: 503, headers });
        }
      },
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const body = (await request.json().catch(() => null)) as {
          token?: unknown;
          name?: unknown;
          username?: unknown;
          pin?: unknown;
          age?: unknown;
        } | null;
        if (!body)
          return Response.json({ error: "invalid_student_signup" }, { status: 400, headers });
        try {
          const result = await gerusaCoreRequest<{
            token: string;
            user: { id: string };
          }>("/student-invites/claim", {
            method: "POST",
            headers: { "x-gerusa-client-ip": request.headers.get("cf-connecting-ip") ?? "" },
            body: JSON.stringify(body),
          });
          return Response.json(
            { user: result.user },
            {
              status: 201,
              headers: {
                ...headers,
                "Set-Cookie": buildSessionCookie(result.token, 30 * 24 * 60 * 60),
              },
            },
          );
        } catch (error) {
          const status =
            error instanceof Error && error.message.endsWith("409")
              ? 409
              : error instanceof Error && error.message.endsWith("410")
                ? 410
                : error instanceof Error && error.message.endsWith("429")
                  ? 429
                  : error instanceof Error && error.message.endsWith("400")
                    ? 400
                    : 503;
          return Response.json(
            {
              error:
                status === 409
                  ? "username_unavailable"
                  : status === 410
                    ? "invite_unavailable"
                    : status === 429
                      ? "registration_rate_limited"
                      : status === 400
                        ? "invalid_student_signup"
                        : "student_signup_unavailable",
            },
            { status, headers },
          );
        }
      },
    },
  },
});
