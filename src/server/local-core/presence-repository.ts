import type { SqlExecutor } from "./postgres";
import { isSystemMaster } from "./player-access";

export type PresenceState = "green" | "yellow" | "blue" | "red";
export const PRESENCE_STATES: readonly PresenceState[] = ["green", "yellow", "blue", "red"];

const PRESENCE_SEMANTICS: Record<PresenceState, string> = {
  green: "fluxo normal; interação e iniciativa normais",
  yellow: "reduzir intensidade, iniciativa e frequência; usuário continua disponível",
  blue: "não puxar, não insistir, não iniciar interação dirigida; se o usuário iniciar, responder normalmente",
  red: "nenhuma iniciativa dirigida; não insistir; se o usuário explicitamente iniciar interação, responder normalmente",
};

export type SystemIdentity = { identity_key: "TAL"; user_id: string };
export type PresenceRecord = {
  mesa_id: string;
  player_user_id: string;
  regime: PresenceState;
  updated_at: string;
};
export type PlayerMesa = { id: string; name: string };
export type MasterPresence = {
  player_user_id: string;
  player_name: string | null;
  regime: PresenceState;
  updated_at: string | null;
};
export type ResponsibleMasterResolution = {
  mesa_id: string;
  master_user_id: string;
  source: "assigned" | "tal";
  explicit_master_user_id: string | null;
};
export type EligibleResponsibleMaster = { id: string; display_name: string };

export async function listEligibleResponsibleMasters(
  sql: SqlExecutor,
  mesaId: string,
): Promise<readonly EligibleResponsibleMaster[]> {
  return sql.query<EligibleResponsibleMaster>(
    `SELECT u.id::text AS id,
            COALESCE(NULLIF(BTRIM(p.display_name), ''), 'Mestre sem perfil · ' || LEFT(u.id::text, 8)) AS display_name
       FROM public.mesa_members mm
       JOIN public.users u ON u.id=mm.user_id AND u.status='active'
       LEFT JOIN public.profiles p ON p.id=u.id
      WHERE mm.mesa_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active'
      ORDER BY lower(COALESCE(NULLIF(BTRIM(p.display_name), ''), '')),u.id`,
    [mesaId],
  );
}

function isPresenceState(value: unknown): value is PresenceState {
  return typeof value === "string" && PRESENCE_STATES.includes(value as PresenceState);
}

export async function getSystemIdentity(
  sql: SqlExecutor,
  identityKey: "TAL" = "TAL",
): Promise<SystemIdentity | null> {
  const rows = await sql.query<SystemIdentity>(
    "SELECT identity_key, user_id FROM public.system_identities WHERE identity_key=$1 LIMIT 1",
    [identityKey],
  );
  return rows[0] ?? null;
}

export async function getExplicitResponsibleMaster(
  sql: SqlExecutor,
  mesaId: string,
): Promise<string | null> {
  const rows = await sql.query<{ master_user_id: string }>(
    "SELECT master_user_id FROM public.mesa_responsible_masters WHERE mesa_id=$1 LIMIT 1",
    [mesaId],
  );
  return rows[0]?.master_user_id ?? null;
}

export async function resolveResponsibleMaster(
  sql: SqlExecutor,
  mesaId: string,
): Promise<ResponsibleMasterResolution | null> {
  const rows = await sql.query<{ mesa_id: string; master_user_id: string }>(
    `SELECT r.mesa_id, r.master_user_id
       FROM public.mesa_responsible_masters r
       JOIN public.users u ON u.id=r.master_user_id AND u.status='active'
       JOIN public.mesa_members mm ON mm.mesa_id=r.mesa_id
        AND mm.user_id=r.master_user_id AND mm.member_role='mestre' AND mm.membership_status='active'
      WHERE r.mesa_id=$1 LIMIT 1`,
    [mesaId],
  );
  const explicit = await getExplicitResponsibleMaster(sql, mesaId);
  if (rows[0]) {
    return {
      mesa_id: mesaId,
      master_user_id: rows[0].master_user_id,
      source: "assigned",
      explicit_master_user_id: explicit,
    };
  }
  const tal = await getSystemIdentity(sql);
  if (!tal) return null;
  return {
    mesa_id: mesaId,
    master_user_id: tal.user_id,
    source: "tal",
    explicit_master_user_id: explicit,
  };
}

async function requireTal(sql: SqlExecutor, authenticatedTalUserId: string): Promise<void> {
  const tal = await getSystemIdentity(sql);
  if (!tal || tal.user_id !== authenticatedTalUserId) throw new Error("tal_required");
}

export async function assignResponsibleMaster(input: {
  sql: SqlExecutor;
  mesaId: string;
  masterUserId: string;
  authenticatedTalUserId: string;
}): Promise<ResponsibleMasterResolution> {
  const { sql, mesaId, masterUserId, authenticatedTalUserId } = input;
  await requireTal(sql, authenticatedTalUserId);
  if (!(await sql.query("SELECT 1 FROM public.mesas WHERE id=$1 LIMIT 1", [mesaId])).length)
    throw new Error("mesa_not_found");
  const candidate = await sql.query(
    `SELECT 1 FROM public.users u
       JOIN public.mesa_members mm ON mm.user_id=u.id AND mm.mesa_id=$1
        AND mm.member_role='mestre' AND mm.membership_status='active'
      WHERE u.id=$2 AND u.status='active' LIMIT 1`,
    [mesaId, masterUserId],
  );
  if (!candidate.length) throw new Error("master_candidate_not_authorized");
  await sql.query(
    `INSERT INTO public.mesa_responsible_masters (mesa_id,master_user_id,assigned_by)
     VALUES ($1,$2,$3)
     ON CONFLICT (mesa_id) DO UPDATE SET master_user_id=EXCLUDED.master_user_id,
       assigned_by=EXCLUDED.assigned_by,assigned_at=now()`,
    [mesaId, masterUserId, authenticatedTalUserId],
  );
  const resolved = await resolveResponsibleMaster(sql, mesaId);
  if (!resolved || resolved.source !== "assigned")
    throw new Error("responsible_master_not_persisted");
  return resolved;
}

export async function removeResponsibleMaster(input: {
  sql: SqlExecutor;
  mesaId: string;
  authenticatedTalUserId: string;
}): Promise<ResponsibleMasterResolution | null> {
  const { sql, mesaId, authenticatedTalUserId } = input;
  await requireTal(sql, authenticatedTalUserId);
  await sql.query("DELETE FROM public.mesa_responsible_masters WHERE mesa_id=$1", [mesaId]);
  return resolveResponsibleMaster(sql, mesaId);
}

export async function getResponsibleMaster(sql: SqlExecutor, mesaId: string) {
  const mesas = await sql.query<{ id: string; name: string }>(
    "SELECT id,name FROM public.mesas WHERE id=$1 LIMIT 1",
    [mesaId],
  );
  if (!mesas[0]) return null;
  const resolved = await resolveResponsibleMaster(sql, mesaId);
  return {
    mesa: mesas[0],
    explicitMaster:
      resolved?.explicit_master_user_id ?? (await getExplicitResponsibleMaster(sql, mesaId)),
    resolvedMaster: resolved?.master_user_id ?? null,
    isFallbackToTal: resolved?.source === "tal",
  };
}

export async function listPlayerPresenceMesas(
  sql: SqlExecutor,
  playerUserId: string,
): Promise<PlayerMesa[]> {
  const rows = await sql.query<PlayerMesa>(
    `SELECT m.id,m.name FROM public.mesas m JOIN public.mesa_members mm ON mm.mesa_id=m.id
      WHERE mm.user_id=$1 AND mm.member_role='jogador' AND mm.membership_status='active'
      ORDER BY m.name,m.id`,
    [playerUserId],
  );
  return [...rows];
}

async function activePlayerInMesa(sql: SqlExecutor, playerUserId: string, mesaId: string) {
  return (
    (
      await sql.query(
        `SELECT 1 FROM public.mesa_members WHERE mesa_id=$1 AND user_id=$2
        AND member_role='jogador' AND membership_status='active' LIMIT 1`,
        [mesaId, playerUserId],
      )
    ).length > 0
  );
}

export async function getPresenceForPlayerInMesa(
  sql: SqlExecutor,
  playerUserId: string,
  mesaId: string,
) {
  if (!(await activePlayerInMesa(sql, playerUserId, mesaId))) return null;
  const rows = await sql.query<PresenceRecord>(
    `SELECT mesa_id,player_user_id,regime,updated_at FROM public.presence_regimes
      WHERE mesa_id=$1 AND player_user_id=$2 LIMIT 1`,
    [mesaId, playerUserId],
  );
  return rows[0] ?? null;
}

export async function upsertPresenceForPlayerInMesa(
  sql: SqlExecutor,
  playerUserId: string,
  mesaId: string,
  regime: PresenceState,
) {
  if (!isPresenceState(regime)) throw new Error("invalid_presence_regime");
  if (!(await activePlayerInMesa(sql, playerUserId, mesaId))) return null;
  const rows = await sql.query<PresenceRecord>(
    `INSERT INTO public.presence_regimes (mesa_id,player_user_id,regime) VALUES ($1,$2,$3)
     ON CONFLICT (mesa_id,player_user_id) DO UPDATE SET regime=EXCLUDED.regime,updated_at=now()
     RETURNING mesa_id,player_user_id,regime,updated_at`,
    [mesaId, playerUserId, regime],
  );
  return rows[0] ?? null;
}

export async function listPresenceForMasterMesa(
  sql: SqlExecutor,
  masterUserId: string,
  mesaId: string,
) {
  const authorized =
    (await isSystemMaster(sql, masterUserId)) ||
    (
      await sql.query(
        `SELECT 1 FROM public.mesa_members WHERE mesa_id=$1 AND user_id=$2
      AND member_role='mestre' AND membership_status='active' LIMIT 1`,
        [mesaId, masterUserId],
      )
    ).length > 0;
  if (!authorized) return null;
  const rows = await sql.query<MasterPresence>(
    `SELECT mm.user_id AS player_user_id,p.display_name AS player_name,
            COALESCE(pr.regime,'green') AS regime,pr.updated_at
       FROM public.mesa_members mm JOIN public.profiles p ON p.id=mm.user_id
       LEFT JOIN public.presence_regimes pr ON pr.mesa_id=mm.mesa_id AND pr.player_user_id=mm.user_id
      WHERE mm.mesa_id=$1 AND mm.member_role='jogador' AND mm.membership_status='active'
      ORDER BY lower(COALESCE(p.display_name,'')),mm.user_id`,
    [mesaId],
  );
  return [...rows];
}

export function assertPresenceState(value: unknown): asserts value is PresenceState {
  if (!isPresenceState(value)) throw new Error("invalid_presence_regime");
}

export function renderPresenceRegimeContext(regime: PresenceState): string {
  return [
    "=== REGIME OPERACIONAL DE PRESENÇA ===",
    `Regime atual: ${regime.toUpperCase()}.`,
    `Semântica operacional: ${PRESENCE_SEMANTICS[regime]}.`,
    "Este é um regime momentâneo declarado para esta Mesa; não é humor, diagnóstico, traço psicológico nem estado de personagem.",
  ].join("\n");
}
