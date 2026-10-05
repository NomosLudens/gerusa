import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { createLocalChatRuntime } from "@/server/local-core/chat-runtime";
import {
  CHAT_SCOPE_MARKERS,
  type ChatScope,
  type ChatThread,
  type PendingCharacterMutation,
} from "@/server/local-core/data-contracts";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { isMaster, isMasterForMesa } from "@/server/local-core/player-access";
import { z } from "zod";

const jsonHeaders = { "Cache-Control": "no-store" };

function parseScope(value: string | null): ChatScope {
  if (value === "master") return "master";
  return value === "character_creation" ? "character_creation" : "general";
}

function databaseUnavailable(): Response {
  return Response.json(
    { error: "database_unavailable", reason: "O banco local está indisponível." },
    { status: 503, headers: jsonHeaders },
  );
}

const threadUpdateSchema = z
  .object({
    threadId: z.string().uuid(),
    activeCharacterId: z.string().trim().min(1).max(200).nullable().optional(),
  })
  .strict();

function serializeThread(thread: ChatThread) {
  return {
    id: thread.id,
    facet: thread.facet,
    surface: thread.surface,
    title: Object.values(CHAT_SCOPE_MARKERS).includes(thread.title ?? "") ? null : thread.title,
    createdAt: thread.createdAt,
    campaignId: thread.campaignId ?? null,
    campaignName: thread.campaignName ?? null,
    mesaId: thread.mesaId ?? null,
    scope: thread.scope ?? "general",
    activeCharacterId: thread.activeCharacterId ?? null,
  };
}

function serializePendingMutation(mutation: PendingCharacterMutation) {
  if (mutation.operation === "character_create") {
    const snapshot = mutation.payload.snapshot;
    const record =
      snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
        ? (snapshot as Record<string, unknown>)
        : null;
    const trails = record?.trilhas;
    const firstTrail =
      Array.isArray(trails) && trails[0] && typeof trails[0] === "object"
        ? (trails[0] as Record<string, unknown>)
        : null;
    return {
      id: mutation.id,
      output: {
        status: "requires_confirmation",
        operation: "character_create",
        confirmationId: mutation.id,
        name: typeof record?.nome === "string" ? record.nome : "",
        povo: typeof record?.povo === "string" ? record.povo : "",
        oficio: typeof firstTrail?.oficio === "string" ? firstTrail.oficio : "",
        biografia: typeof record?.biografia === "string" ? record.biografia : "",
        expiresAt: mutation.expiresAt,
      },
    };
  }
  return {
    id: mutation.id,
    output: {
      status: "requires_confirmation",
      operation: "character_biography_update",
      confirmationId: mutation.id,
      beforeBiography: mutation.beforeBiography,
      nextBiography: mutation.nextBiography,
      expiresAt: mutation.expiresAt,
    },
  };
}

async function withChatRuntime(
  handler: (runtime: ReturnType<typeof createLocalChatRuntime>) => Promise<Response>,
): Promise<Response> {
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) return databaseUnavailable();
  const runtime = createLocalChatRuntime(databaseUrl);
  try {
    return await handler(runtime);
  } finally {
    runtime.close();
  }
}

export const Route = createFileRoute("/api/chat/thread")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const params = new URL(request.url).searchParams;
        const threadId = params.get("threadId");
        const scope = parseScope(params.get("scope"));
        return withChatRuntime(async (runtime) => {
          if (!runtime.chat.findScopedThread && !threadId) return databaseUnavailable();
          const thread = threadId
            ? await runtime.chat.getThreadById(auth.userId, threadId)
            : await runtime.chat.findScopedThread!(auth.userId, scope);
          if (!thread) {
            return Response.json(
              { error: "thread_not_found" },
              { status: 404, headers: jsonHeaders },
            );
          }
          const messages = [
            ...(await runtime.chat.listThreadMessages(auth.userId, thread.id, 200)),
          ].reverse();
          const pendingMutations = runtime.mutations
            ? await runtime.mutations.listPendingMutations(auth.userId, thread.id)
            : [];
          return Response.json(
            {
              thread: serializeThread(thread),
              messages: messages.map((message) => ({
                id: message.id,
                role: message.role,
                content: message.content,
                createdAt: message.createdAt,
              })),
              pendingMutations: pendingMutations.map(serializePendingMutation),
            },
            { headers: jsonHeaders },
          );
        });
      },
      POST: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin)) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers: jsonHeaders });
        }
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        return withChatRuntime(async (runtime) => {
          if (!runtime.chat.findScopedThread) return databaseUnavailable();
          const params = new URL(request.url).searchParams;
          const scope = parseScope(params.get("scope"));
          const wantsNewThread = params.get("new") === "1";
          const requestedCampaignId = params.get("campaignId");
          if (
            requestedCampaignId &&
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              requestedCampaignId,
            )
          )
            return Response.json(
              { error: "invalid_campaign" },
              { status: 400, headers: jsonHeaders },
            );
          const campaign = requestedCampaignId
            ? scope === "master"
              ? await runtime.campaigns?.getMasterAuthorized(auth.userId, requestedCampaignId)
              : await runtime.campaigns?.getAuthorized(auth.userId, requestedCampaignId)
            : null;
          if (requestedCampaignId && !campaign)
            return Response.json(
              { error: "campaign_forbidden" },
              { status: 403, headers: jsonHeaders },
            );
          if (scope === "master") {
            const databaseUrl = getRuntimeDatabaseUrl();
            if (!databaseUrl) return databaseUnavailable();
            const sql = createBunPostgresExecutor(databaseUrl);
            try {
              const authorized = campaign
                ? await isMasterForMesa(sql, auth.userId, campaign.mesaId)
                : await isMaster(sql, auth.userId);
              if (!authorized) {
                return Response.json(
                  { error: "master_chat_forbidden" },
                  { status: 403, headers: jsonHeaders },
                );
              }
            } finally {
              sql.close();
            }
          }
          if (!wantsNewThread) {
            const existing = await runtime.chat.findScopedThread(auth.userId, scope);
            if (existing) {
              return Response.json({ thread: serializeThread(existing) }, { headers: jsonHeaders });
            }
          }
          const now = new Date().toISOString();
          const thread = await runtime.chat.createThread({
            id: randomUUID(),
            userId: auth.userId,
            surface: "kallistis",
            facet: "kallistis",
            title: CHAT_SCOPE_MARKERS[scope],
            createdAt: now,
            lastSedimentadoAt: null,
            campaignId: campaign?.id ?? null,
            responseMode: "ASSISTENTE",
            roleplayTargetId: null,
            playerExperience: scope === "character_creation" ? "CHARACTER_CREATION" : null,
          });
          return Response.json(
            { thread: serializeThread(thread) },
            { status: 201, headers: jsonHeaders },
          );
        });
      },
      PATCH: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin)) {
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers: jsonHeaders });
        }
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        let parsed: z.infer<typeof threadUpdateSchema>;
        try {
          const raw = await request.json();
          if (
            raw &&
            typeof raw === "object" &&
            ("responseMode" in raw || "roleplayTargetId" in raw || "playerExperience" in raw)
          ) {
            return Response.json(
              { error: "unsupported_chat_mode" },
              { status: 422, headers: jsonHeaders },
            );
          }
          parsed = threadUpdateSchema.parse(raw);
        } catch {
          return Response.json(
            { error: "invalid_thread_update" },
            { status: 400, headers: jsonHeaders },
          );
        }
        const playerUpdate = parsed.activeCharacterId !== undefined;
        if (!playerUpdate)
          return Response.json(
            { error: "empty_thread_update" },
            { status: 400, headers: jsonHeaders },
          );
        return withChatRuntime(async (runtime) => {
          if (playerUpdate) {
            const activeCharacterId = parsed.activeCharacterId ?? null;
            if (activeCharacterId) {
              const character = await runtime.characters?.get(auth.userId, activeCharacterId);
              if (!character || character.status === "archived")
                return Response.json(
                  { error: "active_character_forbidden" },
                  { status: 403, headers: jsonHeaders },
                );
            }
            if (!runtime.chat.updatePlayerExperience)
              return Response.json(
                { error: "player_experience_unavailable" },
                { status: 503, headers: jsonHeaders },
              );
            const thread = await runtime.chat.updatePlayerExperience(
              auth.userId,
              parsed.threadId,
              null,
              activeCharacterId,
            );
            if (!thread)
              return Response.json(
                { error: "thread_not_found" },
                { status: 404, headers: jsonHeaders },
              );
            return Response.json({ thread: serializeThread(thread) }, { headers: jsonHeaders });
          }
          return Response.json(
            { error: "empty_thread_update" },
            { status: 400, headers: jsonHeaders },
          );
        });
      },
    },
  },
});
