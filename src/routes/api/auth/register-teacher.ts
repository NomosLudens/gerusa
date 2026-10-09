import { createFileRoute } from "@tanstack/react-router";
import { buildSessionCookie } from "@/server/local-core/cookies";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";

const headers = { "Cache-Control": "no-store" };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Route = createFileRoute("/api/auth/register-teacher")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const body = (await request.json().catch(() => null)) as {
          name?: unknown;
          email?: unknown;
          password?: unknown;
          confirmPassword?: unknown;
          mesaName?: unknown;
        } | null;
        if (
          !body ||
          typeof body.name !== "string" ||
          typeof body.email !== "string" ||
          typeof body.password !== "string" ||
          typeof body.confirmPassword !== "string" ||
          typeof body.mesaName !== "string" ||
          body.password !== body.confirmPassword ||
          body.name.trim().length < 2 ||
          body.name.trim().length > 60 ||
          body.email.trim().length > 254 ||
          !emailPattern.test(body.email.trim()) ||
          body.password.length < 12 ||
          body.password.length > 256 ||
          body.mesaName.trim().length < 2 ||
          body.mesaName.trim().length > 120
        )
          return Response.json({ error: "invalid_teacher_signup" }, { status: 400, headers });

        try {
          const result = await gerusaCoreRequest<{
            token: string;
            recoveryCode: string;
            user: { id: string };
            mesa: { id: string; name: string };
          }>("/auth/register-teacher", {
            method: "POST",
            headers: { "x-gerusa-client-ip": request.headers.get("cf-connecting-ip") ?? "" },
            body: JSON.stringify({
              name: body.name.trim(),
              email: body.email.trim().toLowerCase(),
              password: body.password,
              mesaName: body.mesaName.trim(),
            }),
          });
          return Response.json(
            { user: result.user, recoveryCode: result.recoveryCode, mesa: result.mesa },
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
              : error instanceof Error && error.message.endsWith("429")
                ? 429
                : error instanceof Error && error.message.endsWith("400")
                  ? 400
                  : 503;
          return Response.json(
            {
              error:
                status === 409
                  ? "email_unavailable"
                  : status === 429
                    ? "registration_rate_limited"
                    : status === 400
                      ? "invalid_teacher_signup"
                      : "registration_unavailable",
            },
            { status, headers },
          );
        }
      },
    },
  },
});
