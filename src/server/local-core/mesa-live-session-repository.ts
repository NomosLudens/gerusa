import type { SqlExecutor } from "./postgres";

export const LIVE_SESSION_EVENT_TYPES = [
  "NPC",
  "LOCAL",
  "OBJETO",
  "PISTA",
  "EVENTO",
  "DIARIO",
  "IMAGEM",
] as const;

export type LiveSessionEventType = (typeof LIVE_SESSION_EVENT_TYPES)[number];
export type LiveSessionStatus = "live" | "closed";

type MesaRow = { id: string; slug: string; name: string };
type SessionRow = {
  id: string;
  mesa_id: string;
  title: string;
  status: LiveSessionStatus;
  started_at: string;
  ended_at: string | null;
  created_by_user_id: string;
  closed_by_user_id: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
};
type EventRow = {
  id: string;
  session_id: string;
  created_by_user_id: string;
  title: string | null;
  event_type: LiveSessionEventType;
  public_content: string;
  private_notes: string | null;
  promoted_entry_id: string | null;
  revealed_at: string | null;
  revealed_by_user_id: string | null;
  media_asset_id: string | null;
  created_at: string;
};

export type LiveSessionEvent = {
  id: string;
  sessionId: string;
  createdByUserId: string;
  title: string | null;
  eventType: LiveSessionEventType;
  publicContent: string;
  privateNotes: string | null;
  promotedEntryId: string | null;
  revealedAt: string | null;
  revealedByUserId: string | null;
  mediaAssetId: string | null;
  createdAt: string;
};

export type LiveSession = {
  id: string;
  mesaId: string;
  title: string;
  status: LiveSessionStatus;
  startedAt: string;
  endedAt: string | null;
  createdByUserId: string;
  closedByUserId: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  events: LiveSessionEvent[];
};

export type MasterMesa = MesaRow;

function serializeEvent(row: EventRow): LiveSessionEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    eventType: row.event_type,
    publicContent: row.public_content,
    privateNotes: row.private_notes,
    promotedEntryId: row.promoted_entry_id,
    revealedAt: row.revealed_at,
    revealedByUserId: row.revealed_by_user_id,
    mediaAssetId: row.media_asset_id,
    createdAt: row.created_at,
  };
}

function serializeSession(row: SessionRow, events: LiveSessionEvent[] = []): LiveSession {
  return {
    id: row.id,
    mesaId: row.mesa_id,
    title: row.title,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdByUserId: row.created_by_user_id,
    closedByUserId: row.closed_by_user_id,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events,
  };
}

const sessionColumns =
  "id::text,mesa_id::text,title,status,started_at,ended_at,created_by_user_id::text,closed_by_user_id::text,summary,created_at,updated_at";
const eventColumns =
  "id::text,session_id::text,created_by_user_id::text,title,event_type,public_content,private_notes,promoted_entry_id::text,revealed_at,revealed_by_user_id::text,media_asset_id,created_at";
const eventColumnsAliased =
  "e.id::text,e.session_id::text,e.created_by_user_id::text,e.title,e.event_type,e.public_content,e.private_notes,e.promoted_entry_id::text,e.revealed_at,e.revealed_by_user_id::text,e.media_asset_id,e.created_at";

export async function getAuthorizedMasterMesa(
  sql: SqlExecutor,
  userId: string,
  mesaId: string,
): Promise<MasterMesa | null> {
  const rows = await sql.query<MesaRow>(
    `SELECT m.id::text,m.slug,m.name
       FROM public.mesas m
      WHERE m.id=$1
        AND (
          EXISTS (
            SELECT 1 FROM public.system_roles sr
             WHERE sr.user_id=$2 AND sr.system_role='system_master'
          )
          OR EXISTS (
            SELECT 1 FROM public.mesa_members mm
             WHERE mm.mesa_id=m.id AND mm.user_id=$2
               AND mm.member_role='mestre' AND mm.membership_status='active'
          )
        )`,
    [mesaId, userId],
  );
  return rows[0] ?? null;
}

async function eventsForSession(sql: SqlExecutor, sessionId: string): Promise<LiveSessionEvent[]> {
  const rows = await sql.query<EventRow>(
    `SELECT ${eventColumns}
       FROM public.mesa_live_session_events
      WHERE session_id=$1
      ORDER BY created_at,id`,
    [sessionId],
  );
  return rows.map(serializeEvent);
}

export async function getLiveSessionForMesa(
  sql: SqlExecutor,
  mesaId: string,
): Promise<LiveSession | null> {
  const rows = await sql.query<SessionRow>(
    `SELECT ${sessionColumns}
       FROM public.mesa_live_sessions
      WHERE mesa_id=$1 AND status='live'
      ORDER BY started_at DESC,id
      LIMIT 1`,
    [mesaId],
  );
  const session = rows[0];
  return session ? serializeSession(session, await eventsForSession(sql, session.id)) : null;
}

export async function listRecentSessionsForMesa(
  sql: SqlExecutor,
  mesaId: string,
  limit = 5,
): Promise<LiveSession[]> {
  const rows = await sql.query<SessionRow>(
    `SELECT ${sessionColumns}
       FROM public.mesa_live_sessions
      WHERE mesa_id=$1 AND status='closed'
      ORDER BY ended_at DESC NULLS LAST,started_at DESC,id
      LIMIT $2`,
    [mesaId, limit],
  );
  const result: LiveSession[] = [];
  for (const row of rows) result.push(serializeSession(row, await eventsForSession(sql, row.id)));
  return result;
}

export async function startLiveSession(
  sql: SqlExecutor,
  mesaId: string,
  userId: string,
  title: string,
): Promise<LiveSession> {
  const rows = await sql.query<SessionRow>(
    `INSERT INTO public.mesa_live_sessions
       (mesa_id,title,status,started_at,created_by_user_id)
     VALUES ($1,$3,'live',now(),$2)
     RETURNING ${sessionColumns}`,
    [mesaId, userId, title],
  );
  const session = rows[0];
  if (!session) throw new Error("live_session_not_started");
  return serializeSession(session);
}

export async function addLiveSessionEvent(
  sql: SqlExecutor,
  mesaId: string,
  sessionId: string,
  userId: string,
  eventType: LiveSessionEventType,
  title: string | null,
  publicContent: string,
  privateNotes: string | null,
  mediaAssetId: string | null = null,
): Promise<LiveSessionEvent> {
  const rows = await sql.query<EventRow>(
    `INSERT INTO public.mesa_live_session_events
       (session_id,created_by_user_id,title,event_type,public_content,private_notes,media_asset_id)
     SELECT s.id,$3,$5,$4,$6,$7,$8
       FROM public.mesa_live_sessions s
      WHERE s.id=$1 AND s.mesa_id=$2 AND s.status='live'
     RETURNING ${eventColumns}`,
    [sessionId, mesaId, userId, eventType, title, publicContent, privateNotes, mediaAssetId],
  );
  const event = rows[0];
  if (!event) throw new Error("live_session_not_found_or_closed");
  return serializeEvent(event);
}

export async function updateLiveSessionSummary(
  sql: SqlExecutor,
  mesaId: string,
  sessionId: string,
  summary: string | null,
): Promise<LiveSession> {
  const rows = await sql.query<SessionRow>(
    `UPDATE public.mesa_live_sessions
        SET summary=$3,updated_at=now()
      WHERE id=$1 AND mesa_id=$2 AND status='live'
      RETURNING ${sessionColumns}`,
    [sessionId, mesaId, summary],
  );
  const session = rows[0];
  if (!session) throw new Error("live_session_not_found_or_closed");
  return serializeSession(session, await eventsForSession(sql, session.id));
}

export async function revealLiveSessionEvent(
  sql: SqlExecutor,
  mesaId: string,
  sessionId: string,
  eventId: string,
  userId: string,
): Promise<LiveSessionEvent> {
  const rows = await sql.query<EventRow>(
    `UPDATE public.mesa_live_session_events e
        SET revealed_at=now(),revealed_by_user_id=$4
       FROM public.mesa_live_sessions s
      WHERE e.id=$1 AND e.session_id=$2 AND s.id=e.session_id
        AND s.mesa_id=$3 AND s.status='live' AND e.revealed_at IS NULL
      RETURNING ${eventColumnsAliased}`,
    [eventId, sessionId, mesaId, userId],
  );
  const event = rows[0];
  if (event) return serializeEvent(event);
  const existing = await sql.query<{ revealed_at: string | null }>(
    "SELECT revealed_at FROM public.mesa_live_session_events WHERE id=$1 AND session_id=$2",
    [eventId, sessionId],
  );
  if (existing[0]?.revealed_at) throw new Error("live_event_already_revealed");
  throw new Error("live_event_not_found");
}

export async function closeLiveSession(
  sql: SqlExecutor,
  mesaId: string,
  sessionId: string,
  userId: string,
  summary: string | null,
): Promise<LiveSession> {
  const rows = await sql.query<SessionRow>(
    `UPDATE public.mesa_live_sessions
        SET status='closed',ended_at=now(),closed_by_user_id=$3,summary=$4,updated_at=now()
      WHERE id=$1 AND mesa_id=$2 AND status='live'
      RETURNING ${sessionColumns}`,
    [sessionId, mesaId, userId, summary],
  );
  const session = rows[0];
  if (!session) throw new Error("live_session_not_found_or_closed");
  return serializeSession(session, await eventsForSession(sql, session.id));
}

export async function markLiveSessionEventPromoted(
  sql: SqlExecutor,
  mesaId: string,
  sessionId: string,
  eventId: string,
  entryId: string,
): Promise<LiveSessionEvent> {
  const rows = await sql.query<EventRow>(
    `UPDATE public.mesa_live_session_events e
        SET promoted_entry_id=$4
       FROM public.mesa_live_sessions s
      WHERE e.id=$1 AND e.session_id=$2 AND s.id=e.session_id
        AND s.mesa_id=$3 AND e.promoted_entry_id IS NULL
      RETURNING ${eventColumnsAliased}`,
    [eventId, sessionId, mesaId, entryId],
  );
  const event = rows[0];
  if (event) return serializeEvent(event);
  const existing = await sql.query<{ promoted_entry_id: string | null }>(
    "SELECT promoted_entry_id::text FROM public.mesa_live_session_events WHERE id=$1 AND session_id=$2",
    [eventId, sessionId],
  );
  if (existing[0]?.promoted_entry_id) throw new Error("live_event_already_promoted");
  throw new Error("live_event_not_found");
}

export type ScenePulseDiscovery = {
  id: string;
  eventType: LiveSessionEventType;
  title: string | null;
  publicContent: string;
  mediaAssetId: string | null;
  revealedAt: string;
};

export type ScenePulseSession = {
  id: string;
  mesaId: string;
  mesaName: string;
  title: string;
  status: "live";
  discoveries: ScenePulseDiscovery[];
};

type PlayerScenePulseRow = {
  session_id: string;
  mesa_id: string;
  mesa_name: string;
  session_title: string;
  event_id: string | null;
  event_type: LiveSessionEventType | null;
  event_title: string | null;
  public_content: string | null;
  media_asset_id: string | null;
  revealed_at: string | null;
};

export async function listPlayerScenePulse(
  sql: SqlExecutor,
  userId: string,
): Promise<ScenePulseSession[]> {
  const rows = await sql.query<PlayerScenePulseRow>(
    `SELECT s.id::text AS session_id,s.mesa_id::text AS mesa_id,m.name AS mesa_name,
            s.title AS session_title,e.id::text AS event_id,e.event_type,
            e.title AS event_title,e.public_content,e.media_asset_id,e.revealed_at
       FROM public.mesa_live_sessions s
       JOIN public.mesas m ON m.id=s.mesa_id
       LEFT JOIN public.mesa_live_session_events e
         ON e.session_id=s.id AND e.revealed_at IS NOT NULL
      WHERE s.status='live'
        AND EXISTS (
          SELECT 1 FROM public.mesa_members mm
           WHERE mm.mesa_id=s.mesa_id AND mm.user_id=$1
             AND mm.member_role='jogador' AND mm.membership_status='active'
        )
      ORDER BY m.name,s.id,e.revealed_at NULLS LAST,e.id`,
    [userId],
  );
  const sessions = new Map<string, ScenePulseSession>();
  for (const row of rows) {
    const session = sessions.get(row.session_id) ?? {
      id: row.session_id,
      mesaId: row.mesa_id,
      mesaName: row.mesa_name,
      title: row.session_title,
      status: "live",
      discoveries: [],
    };
    if (row.event_id && row.event_type && row.public_content !== null && row.revealed_at) {
      session.discoveries.push({
        id: row.event_id,
        eventType: row.event_type,
        title: row.event_title,
        publicContent: row.public_content,
        mediaAssetId: row.media_asset_id,
        revealedAt: row.revealed_at,
      });
    }
    sessions.set(row.session_id, session);
  }
  return [...sessions.values()];
}
