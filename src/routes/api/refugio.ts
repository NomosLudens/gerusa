import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import type { SqlExecutor } from "@/server/local-core/postgres";
import { isSystemMaster } from "@/server/local-core/player-access";

const headers = { "Cache-Control": "no-store" };
const MAX_NAME = 120;
const MAX_TEXT = 4000;

type RefugioState = {
  unlocked: boolean;
  name: string;
  description: string;
  customization: string;
  anchorPedralma: string;
  foundationQuest: string;
  activeSequence: boolean;
  lastDespairReturn: {
    characterIds: string[];
    notes: string;
    recordedAt: string;
  } | null;
};

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

function parseState(value: unknown): RefugioState {
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const last =
    source.lastDespairReturn && typeof source.lastDespairReturn === "object"
      ? (source.lastDespairReturn as Record<string, unknown>)
      : null;
  return {
    unlocked: source.unlocked === true,
    name: typeof source.name === "string" ? source.name.trim().slice(0, MAX_NAME) : "",
    description:
      typeof source.description === "string" ? source.description.trim().slice(0, MAX_TEXT) : "",
    customization:
      typeof source.customization === "string"
        ? source.customization.trim().slice(0, MAX_TEXT)
        : "",
    anchorPedralma:
      typeof source.anchorPedralma === "string"
        ? source.anchorPedralma.trim().slice(0, MAX_NAME)
        : "",
    foundationQuest:
      typeof source.foundationQuest === "string"
        ? source.foundationQuest.trim().slice(0, MAX_TEXT)
        : "",
    activeSequence: source.activeSequence === true,
    lastDespairReturn: last
      ? {
          characterIds: Array.isArray(last.characterIds)
            ? [
                ...new Set(last.characterIds.filter((id): id is string => typeof id === "string")),
              ].slice(0, 100)
            : [],
          notes: typeof last.notes === "string" ? last.notes.trim().slice(0, MAX_TEXT) : "",
          recordedAt: typeof last.recordedAt === "string" ? last.recordedAt : "",
        }
      : null,
  };
}

function serialize(row: Record<string, unknown>) {
  const canManage = row.can_manage === true;
  const state = parseState(row.state);
  const visibleState =
    !canManage && state.activeSequence ? { ...parseState(null), activeSequence: true } : state;
  return {
    mesaId: String(row.id),
    mesaSlug: String(row.slug),
    mesaName: String(row.name),
    canManage,
    state: visibleState,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

async function canManage(sql: SqlExecutor, userId: string, mesaId: string) {
  if (await isSystemMaster(sql, userId)) return true;
  const rows = await sql.query(
    "SELECT 1 FROM public.mesa_members WHERE user_id=$1 AND mesa_id=$2 AND member_role='mestre' AND membership_status='active' LIMIT 1",
    [userId, mesaId],
  );
  return rows.length > 0;
}

export const Route = createFileRoute("/api/refugio")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const systemMaster = await isSystemMaster(sql, auth.userId);
          const statement = systemMaster
            ? "SELECT m.id,m.slug,m.name,s.state,s.updated_at,true AS can_manage FROM public.mesas m LEFT JOIN public.master_mesa_surface_state s ON s.mesa_id=m.id AND s.surface_key='refugio' ORDER BY m.name ASC"
            : "SELECT m.id,m.slug,m.name,s.state,s.updated_at,(mm.member_role='mestre') AS can_manage FROM public.mesas m JOIN public.mesa_members mm ON mm.mesa_id=m.id AND mm.user_id=$1 AND mm.membership_status='active' LEFT JOIN public.master_mesa_surface_state s ON s.mesa_id=m.id AND s.surface_key='refugio' ORDER BY m.name ASC";
          const rows = await sql.query<Record<string, unknown>>(
            statement,
            systemMaster ? [] : [auth.userId],
          );
          return Response.json({ refugios: rows.map(serialize) }, { headers });
        } finally {
          sql.close();
        }
      },
      PUT: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const body = (await request.json().catch(() => null)) as {
          mesaId?: unknown;
          action?: unknown;
          state?: unknown;
          characterIds?: unknown;
          notes?: unknown;
        } | null;
        const mesaId = typeof body?.mesaId === "string" ? body.mesaId : "";
        const action = typeof body?.action === "string" ? body.action : "save";
        if (!mesaId || !["save", "unlock", "lock", "despair_return"].includes(action))
          return Response.json({ error: "invalid_refugio_request" }, { status: 400, headers });
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (!(await canManage(sql, auth.userId, mesaId)))
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          const currentRows = await sql.query<Record<string, unknown>>(
            "SELECT state FROM public.master_mesa_surface_state WHERE mesa_id=$1 AND surface_key='refugio'",
            [mesaId],
          );
          const state = parseState(body?.state ?? currentRows[0]?.state);
          if (action === "unlock") {
            if (!state.foundationQuest)
              return Response.json(
                { error: "foundation_quest_required" },
                { status: 422, headers },
              );
            state.unlocked = true;
          }
          if (action === "lock") state.unlocked = false;
          if (action === "despair_return") {
            state.lastDespairReturn = {
              characterIds: Array.isArray(body?.characterIds)
                ? [
                    ...new Set(
                      body.characterIds.filter((id): id is string => typeof id === "string"),
                    ),
                  ].slice(0, 100)
                : [],
              notes: typeof body?.notes === "string" ? body.notes.trim().slice(0, MAX_TEXT) : "",
              recordedAt: new Date().toISOString(),
            };
          }
          const persist = async (tx: SqlExecutor) => {
            await tx.query(
              "INSERT INTO public.master_mesa_surface_state (mesa_id,surface_key,state,updated_by) VALUES ($1,'refugio',$2,$3) ON CONFLICT (mesa_id,surface_key) DO UPDATE SET state=EXCLUDED.state,updated_by=EXCLUDED.updated_by,updated_at=now()",
              [mesaId, JSON.stringify(state), auth.userId],
            );
          };
          if (sql.transaction) await sql.transaction(persist);
          else await persist(sql);
          return Response.json({ ok: true, mesaId, state }, { headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
