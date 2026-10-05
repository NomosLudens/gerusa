import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { isSystemMaster } from "@/server/local-core/player-access";
import {
  listCommunityChatMessages,
  setCommunityChatArchive,
} from "@/server/local-core/community-chat";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { getRuntimeDatabaseUrl } from "@/server/runtime/context";

const headers = { "Cache-Control": "no-store" };
const actionSchema = z.object({ action: z.enum(["archive_all", "restore_all"]) }).strict();

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

export const Route = createFileRoute("/api/master/community-chat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await isSystemMaster(sql, auth.userId)))
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          const messages = await listCommunityChatMessages(sql, 200, true);
          return Response.json(
            {
              messages,
              activeCount: messages.filter((message) => !message.archivedAt).length,
              archivedCount: messages.filter((message) => Boolean(message.archivedAt)).length,
            },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
      POST: async ({ request }) => {
        if (
          !isSameOriginRequest(
            request,
            process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app",
          )
        )
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await isSystemMaster(sql, auth.userId)))
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          const parsed = actionSchema.safeParse(await request.json().catch(() => null));
          if (!parsed.success)
            return Response.json(
              { error: "invalid_community_chat_action" },
              { status: 400, headers },
            );
          const archived = parsed.data.action === "archive_all";
          const affected = await setCommunityChatArchive(sql, archived);
          return Response.json({ ok: true, archived, affected }, { headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
