import { createFileRoute } from "@tanstack/react-router";
import { gerusaCoreRequest, isSameOrigin, THREAD_ID_PATTERN } from "@/server/gerusa/store";

const jsonHeaders = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/gerusa/thread")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers: jsonHeaders });
        }

        const raw = await request.text();
        if (raw.length > 1024) {
          return Response.json({ error: "invalid_request" }, { status: 413, headers: jsonHeaders });
        }
        try {
          if (raw.trim() && JSON.stringify(JSON.parse(raw)) !== "{}") {
            return Response.json(
              { error: "invalid_request" },
              { status: 400, headers: jsonHeaders },
            );
          }
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400, headers: jsonHeaders });
        }

        try {
          const result = await gerusaCoreRequest<{ thread: { id: string } }>("/threads", {
            method: "POST",
            body: "{}",
          });
          return Response.json({ threadId: result.thread.id }, { headers: jsonHeaders });
        } catch {
          return Response.json(
            { error: "thread_unavailable" },
            { status: 503, headers: jsonHeaders },
          );
        }
      },
      GET: async ({ request }) => {
        const threadId = new URL(request.url).searchParams.get("threadId") ?? "";
        if (!THREAD_ID_PATTERN.test(threadId)) {
          return Response.json({ error: "invalid_thread" }, { status: 400, headers: jsonHeaders });
        }

        try {
          const result = await gerusaCoreRequest<{
            messages: Array<{
              id: string;
              role: "user" | "assistant";
              content: string;
              createdAt: string;
            }>;
          }>(`/threads/${threadId}/messages`);
          return Response.json(
            { thread: { id: threadId }, messages: result.messages },
            { headers: jsonHeaders },
          );
        } catch (error) {
          if (error instanceof Error && error.message === "gerusa_core_http_404") {
            return Response.json(
              { error: "thread_not_found" },
              { status: 404, headers: jsonHeaders },
            );
          }
          return Response.json(
            { error: "history_unavailable" },
            { status: 503, headers: jsonHeaders },
          );
        }
      },
    },
  },
});
