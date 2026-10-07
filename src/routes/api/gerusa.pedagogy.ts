import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";
import { readSessionCookie } from "@/server/local-core/cookies";

const headers = { "Cache-Control": "no-store" };
const maxBytes = 65_536;
const coreStatus = (error: unknown) => {
  const match = error instanceof Error ? error.message.match(/_http_(\d{3})$/) : null;
  const status = Number(match?.[1]);
  return status >= 400 && status < 500 ? status : 503;
};

export const Route = createFileRoute("/api/gerusa/pedagogy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const token = readSessionCookie(request.headers.get("cookie"));
        const url = new URL(request.url);
        const query = new URLSearchParams();
        for (const key of ["view", "mesaId", "studentId"]) {
          const value = url.searchParams.get(key);
          if (value) query.set(key, value);
        }
        try {
          return Response.json(await gerusaCoreRequest(`/pedagogy?${query}`, {}, token), {
            headers,
          });
        } catch (error) {
          const status = coreStatus(error);
          return Response.json(
            { error: status === 503 ? "pedagogy_unavailable" : "forbidden" },
            { status, headers },
          );
        }
      },
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > maxBytes)
          return Response.json({ error: "payload_too_large" }, { status: 413, headers });
        let body: Record<string, unknown>;
        try {
          const value: unknown = JSON.parse(raw);
          if (!value || typeof value !== "object" || Array.isArray(value))
            throw new Error("invalid");
          body = value as Record<string, unknown>;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400, headers });
        }
        const token = readSessionCookie(request.headers.get("cookie"));
        try {
          return Response.json(
            await gerusaCoreRequest(
              "/pedagogy",
              { method: "POST", body: JSON.stringify(body) },
              token,
            ),
            { headers },
          );
        } catch (error) {
          const status = coreStatus(error);
          return Response.json(
            { error: status === 503 ? "pedagogy_save_failed" : "request_rejected" },
            { status, headers },
          );
        }
      },
    },
  },
});
