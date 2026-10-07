import { createFileRoute } from "@tanstack/react-router";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";
import {
  buildSessionCookie,
  clearSessionCookie,
  readSessionCookie,
} from "@/server/local-core/cookies";

const headers = { "Cache-Control": "no-store" };

async function readCredentials(request: Request) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 8_192) return null;
  const body = JSON.parse(raw) as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["identifier", "secret", "email", "password"].includes(key)))
    return null;
  const identifier = typeof body.identifier === "string" ? body.identifier : body.email;
  const secret = typeof body.secret === "string" ? body.secret : body.password;
  if (typeof identifier !== "string" || typeof secret !== "string") return null;
  return { identifier, secret };
}

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = readSessionCookie(request.headers.get("cookie"));
        if (!token) return Response.json({ error: "unauthorized" }, { status: 401, headers });
        try {
          const result = await gerusaCoreRequest<{ user: { id: string } }>(
            "/auth/session",
            {},
            token,
          );
          return Response.json({ user: result.user }, { headers });
        } catch {
          return Response.json({ error: "unauthorized" }, { status: 401, headers });
        }
      },
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        let credentials: { identifier: string; secret: string } | null;
        try {
          credentials = await readCredentials(request);
        } catch {
          credentials = null;
        }
        if (!credentials)
          return Response.json({ error: "invalid_credentials" }, { status: 400, headers });
        try {
          const result = await gerusaCoreRequest<{ token: string; user: { id: string } }>(
            "/auth/login",
            { method: "POST", body: JSON.stringify(credentials) },
          );
          return Response.json(
            { user: result.user },
            {
              headers: {
                ...headers,
                "Set-Cookie": buildSessionCookie(result.token, 30 * 24 * 60 * 60),
              },
            },
          );
        } catch {
          return Response.json({ error: "invalid_credentials" }, { status: 401, headers });
        }
      },
      DELETE: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const token = readSessionCookie(request.headers.get("cookie"));
        if (token)
          await gerusaCoreRequest("/auth/logout", { method: "POST" }, token).catch(() => {});
        return new Response(null, {
          status: 204,
          headers: { ...headers, "Set-Cookie": clearSessionCookie() },
        });
      },
    },
  },
});
