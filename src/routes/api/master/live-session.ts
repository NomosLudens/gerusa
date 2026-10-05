import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { isSystemMaster } from "@/server/local-core/player-access";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { insertPublicNpcMoment } from "@/server/local-core/community-chat";
import {
  LIVE_SESSION_EVENT_TYPES,
  addLiveSessionEvent,
  closeLiveSession,
  getAuthorizedMasterMesa,
  getLiveSessionForMesa,
  listRecentSessionsForMesa,
  markLiveSessionEventPromoted,
  revealLiveSessionEvent,
  startLiveSession,
  updateLiveSessionSummary,
  type LiveSessionEventType,
} from "@/server/local-core/mesa-live-session-repository";
import type { SqlExecutor } from "@/server/local-core/postgres";

const headers = { "Cache-Control": "no-store" };
const origin = () => process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const value = await request.json().catch(() => null);
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function textField(
  body: Record<string, unknown> | null,
  key: string,
  options: { required?: boolean; max?: number } = {},
) {
  const value = body?.[key];
  if (typeof value !== "string") return options.required ? null : "";
  const text = value.trim();
  if (options.required && !text) return null;
  if (options.max && text.length > options.max) return null;
  return text;
}

export const Route = createFileRoute("/api/master/live-session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const mesaId = new URL(request.url).searchParams.get("mesaId")?.trim();
        if (!mesaId) return Response.json({ error: "mesa_id_required" }, { status: 400, headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const mesa = await getAuthorizedMasterMesa(sql, auth.userId, mesaId);
          if (!mesa) return Response.json({ error: "forbidden" }, { status: 403, headers });
          const liveSession = await getLiveSessionForMesa(sql, mesaId);
          const recentSessions = await listRecentSessionsForMesa(sql, mesaId);
          return Response.json(
            {
              mesa,
              liveSession,
              recentSessions,
              canPromote: await isSystemMaster(sql, auth.userId),
            },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request, origin()))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = await readBody(request);
        const action = typeof body?.action === "string" ? body.action : "";
        const mesaId = textField(body, "mesaId", { required: true, max: 100 });
        if (!mesaId) return Response.json({ error: "mesa_id_required" }, { status: 400, headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await getAuthorizedMasterMesa(sql, auth.userId, mesaId)))
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          if (action === "start") {
            const title = textField(body, "title", { required: true, max: 160 });
            if (!title)
              return Response.json({ error: "session_title_required" }, { status: 400, headers });
            try {
              return Response.json(
                { liveSession: await startLiveSession(sql, mesaId, auth.userId, title) },
                { status: 201, headers },
              );
            } catch (error) {
              if (String(error).toLowerCase().includes("mesa_live_sessions_one_live_per_mesa_idx"))
                return Response.json(
                  { error: "live_session_already_exists" },
                  { status: 409, headers },
                );
              throw error;
            }
          }
          const sessionId = textField(body, "sessionId", { required: true, max: 100 });
          if (!sessionId)
            return Response.json({ error: "session_id_required" }, { status: 400, headers });
          if (action === "add_event") {
            const rawType = textField(body, "eventType", { required: true, max: 20 });
            const eventType = LIVE_SESSION_EVENT_TYPES.includes(rawType as LiveSessionEventType)
              ? (rawType as LiveSessionEventType)
              : null;
            const publicContent = textField(body, "publicContent", { required: true, max: 30000 });
            const title = textField(body, "title", { max: 160 });
            const privateNotes = textField(body, "privateNotes", { max: 30000 });
            const mediaAssetId =
              typeof body?.mediaAssetId === "string"
                ? body.mediaAssetId.trim().slice(0, 500) || null
                : body?.mediaAssetId == null
                  ? null
                  : "invalid";
            if (
              !eventType ||
              !publicContent ||
              title === null ||
              privateNotes === null ||
              mediaAssetId === "invalid"
            )
              return Response.json({ error: "invalid_live_event" }, { status: 400, headers });
            return Response.json(
              {
                event: await addLiveSessionEvent(
                  sql,
                  mesaId,
                  sessionId,
                  auth.userId,
                  eventType,
                  title || null,
                  publicContent,
                  privateNotes || null,
                  mediaAssetId,
                ),
              },
              { status: 201, headers },
            );
          }
          if (action === "reveal") {
            const eventId = textField(body, "eventId", { required: true, max: 100 });
            if (!eventId)
              return Response.json({ error: "event_id_required" }, { status: 400, headers });
            const reveal = async (transaction: SqlExecutor) => {
              const event = await revealLiveSessionEvent(
                transaction,
                mesaId,
                sessionId,
                eventId,
                auth.userId,
              );
              if (event.eventType === "NPC") {
                await insertPublicNpcMoment(transaction, {
                  id: event.id,
                  speakerName: event.title || "NPC",
                  content: event.publicContent,
                  createdAt: event.revealedAt || new Date().toISOString(),
                });
              }
              return event;
            };
            return Response.json(
              {
                event: sql.transaction ? await sql.transaction(reveal) : await reveal(sql),
              },
              { headers },
            );
          }
          if (action === "update_summary") {
            const summary = textField(body, "summary", { max: 30000 });
            if (summary === null)
              return Response.json({ error: "invalid_session_summary" }, { status: 400, headers });
            return Response.json(
              {
                session: await updateLiveSessionSummary(sql, mesaId, sessionId, summary || null),
              },
              { headers },
            );
          }
          if (action === "close") {
            const summary = textField(body, "summary", { max: 30000 });
            if (summary === null)
              return Response.json({ error: "invalid_session_summary" }, { status: 400, headers });
            return Response.json(
              {
                session: await closeLiveSession(
                  sql,
                  mesaId,
                  sessionId,
                  auth.userId,
                  summary || null,
                ),
              },
              { headers },
            );
          }
          if (action === "mark_promoted") {
            const eventId = textField(body, "eventId", { required: true, max: 100 });
            const entryId = textField(body, "entryId", { required: true, max: 100 });
            if (!eventId || !entryId)
              return Response.json({ error: "promotion_ids_required" }, { status: 400, headers });
            if (!(await isSystemMaster(sql, auth.userId)))
              return Response.json(
                { error: "continuity_promotion_requires_system_master" },
                { status: 403, headers },
              );
            return Response.json(
              {
                event: await markLiveSessionEventPromoted(sql, mesaId, sessionId, eventId, entryId),
              },
              { headers },
            );
          }
          return Response.json({ error: "invalid_live_session_action" }, { status: 400, headers });
        } catch (error) {
          const code = error instanceof Error ? error.message : "live_session_unavailable";
          const status = code.includes("already") ? 409 : code.includes("not_found") ? 404 : 503;
          return Response.json({ error: code }, { status, headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
