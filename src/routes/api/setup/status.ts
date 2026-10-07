import { createFileRoute } from "@tanstack/react-router";
import { gerusaCoreRequest } from "@/server/gerusa/store";

export const Route = createFileRoute("/api/setup/status")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await gerusaCoreRequest<{ available: boolean }>("/setup/status");
          return Response.json(result, { headers: { "Cache-Control": "no-store" } });
        } catch {
          return Response.json({ available: false, error: "setup_unavailable" }, { status: 503 });
        }
      },
    },
  },
});
