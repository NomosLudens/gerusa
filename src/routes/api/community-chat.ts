import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { AI_MODELS } from "@/lib/ai-models.server";
import { createOpenRouterProvider, chatProviderTimeoutMs } from "@/lib/openrouter.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { requireUser } from "@/lib/require-user.server";
import { createLocalChatRuntime } from "@/server/local-core/chat-runtime";
import { createBunPostgresExecutor, type SqlExecutor } from "@/server/local-core/postgres";
import {
  insertCommunityChatMessage,
  listCommunityChatMessages,
} from "@/server/local-core/community-chat";
import { sanitizeAssistantOutput } from "@/lib/sanitize-assistant-output";
import { buildKallistisCommunitySystem } from "@/server/chat/kallistis-chat-runtime";
import { getRuntimeDatabaseUrl } from "@/server/runtime/context";

const headers = { "Cache-Control": "no-store" };
const messageSchema = z.object({ content: z.string().trim().min(1).max(4000) }).strict();

export function hasExplicitKallistisMention(content: string): boolean {
  return /(^|[\s([{])@kallistis\b/i.test(content);
}

function databaseUnavailable() {
  return Response.json({ error: "database_unavailable" }, { status: 503, headers });
}

function databaseExecutor(): SqlExecutor | null {
  const databaseUrl = getRuntimeDatabaseUrl();
  return databaseUrl ? createBunPostgresExecutor(databaseUrl) : null;
}

async function currentUser(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth;
  return auth;
}

export const Route = createFileRoute("/api/community-chat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await currentUser(request);
        if ("error" in auth) return auth.error;
        const sql = databaseExecutor();
        if (!sql) return databaseUnavailable();
        try {
          return Response.json({ messages: await listCommunityChatMessages(sql) }, { headers });
        } finally {
          sql.close();
        }
      },
      POST: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin)) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        }
        const auth = await currentUser(request);
        if ("error" in auth) return auth.error;
        const parsed = messageSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return Response.json({ error: "invalid_message" }, { status: 400, headers });
        const sql = databaseExecutor();
        if (!sql) return databaseUnavailable();
        try {
          const human = await insertCommunityChatMessage(sql, {
            id: randomUUID(),
            authorUserId: auth.userId,
            role: "human",
            content: parsed.data.content,
            createdAt: new Date().toISOString(),
          });
          if (!hasExplicitKallistisMention(parsed.data.content)) {
            return Response.json(
              { messages: [human], kallistisResponded: false },
              { status: 201, headers },
            );
          }

          // This is the one shared General room. No private chat_threads row is
          // created as hidden context, so its history stays global and explicit.
          const runtime = createLocalChatRuntime(getRuntimeDatabaseUrl()!);
          try {
            const history = await listCommunityChatMessages(sql, 60);
            const modelMessages = history.map((message) => ({
              role:
                message.role === "kallistis" && !message.publicNpcName
                  ? ("assistant" as const)
                  : ("user" as const),
              content:
                message.role === "kallistis" && !message.publicNpcName
                  ? message.content
                  : `${message.authorName}: ${message.content}`,
            }));
            const system = await buildKallistisCommunitySystem(
              runtime,
              auth.userId,
              randomUUID(),
              parsed.data.content,
            );
            const provider = createOpenRouterProvider({ requestId: randomUUID() });
            const result = await generateText({
              model: provider(AI_MODELS.chat),
              system,
              messages: modelMessages,
              temperature: 0.55,
              maxRetries: 0,
              abortSignal: request.signal,
              timeout: { totalMs: chatProviderTimeoutMs() },
            });
            const answer = sanitizeAssistantOutput(result.text.trim());
            if (!answer) throw new Error("community_chat_empty_assistant");
            const assistant = await insertCommunityChatMessage(sql, {
              id: randomUUID(),
              authorUserId: null,
              role: "kallistis",
              content: answer,
              createdAt: new Date().toISOString(),
            });
            return Response.json(
              { messages: [human, assistant], kallistisResponded: true },
              { status: 201, headers },
            );
          } finally {
            runtime.close();
          }
        } catch (error) {
          console.error(
            JSON.stringify({
              level: "error",
              type: "community_chat_failed",
              user_id: auth.userId,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          return Response.json({ error: "community_chat_failed" }, { status: 503, headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
