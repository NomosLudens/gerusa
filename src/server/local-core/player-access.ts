import type { SqlExecutor } from "./postgres";
import { PLAYER_ACCESS_APP_IDS } from "@/lib/player-access";
import { provisionBestEffort } from "./mesa-provision";

export type PlayerAccessUser = {
  id: string;
  display_name: string | null;
  status: "active" | "disabled";
  allowed_app_ids: string[];
  mesa_ids: string[];
};

type UserRow = Pick<PlayerAccessUser, "id" | "display_name" | "status">;
type AccessRow = { user_id: string; app_id: string; allowed: boolean };
type MesaMembershipRow = { user_id: string; mesa_id: string };

export async function isSystemMaster(sql: SqlExecutor, userId: string): Promise<boolean> {
  const rows = await sql.query(
    "SELECT 1 FROM public.system_roles WHERE user_id=$1 AND system_role='system_master' LIMIT 1",
    [userId],
  );
  return rows.length > 0;
}

export async function isMaster(sql: SqlExecutor, userId: string): Promise<boolean> {
  if (await isSystemMaster(sql, userId)) return true;
  const rows = await sql.query(
    `SELECT 1
       FROM public.mesa_members
      WHERE user_id = $1
        AND member_role = 'mestre'
        AND membership_status = 'active'
      LIMIT 1`,
    [userId],
  );
  return rows.length > 0;
}

export async function isMasterForMesa(
  sql: SqlExecutor,
  userId: string,
  mesaId: string,
): Promise<boolean> {
  if (await isSystemMaster(sql, userId)) return true;
  const rows = await sql.query(
    `SELECT 1 FROM public.mesa_members
      WHERE user_id=$1 AND mesa_id=$2 AND member_role='mestre'
        AND membership_status='active' LIMIT 1`,
    [userId, mesaId],
  );
  return rows.length > 0;
}

export async function getAllowedPlayerAppIds(sql: SqlExecutor, userId: string): Promise<string[]> {
  const rows = await sql.query<Pick<AccessRow, "app_id" | "allowed">>(
    "SELECT app_id, allowed FROM public.user_app_access WHERE user_id=$1",
    [userId],
  );
  const denied = new Set(rows.filter((row) => !row.allowed).map((row) => row.app_id));
  return PLAYER_ACCESS_APP_IDS.filter((appId) => !denied.has(appId));
}

export async function listPlayerAccess(sql: SqlExecutor): Promise<PlayerAccessUser[]> {
  const users = await sql.query<UserRow>(
    `SELECT u.id, p.display_name, u.status
      FROM public.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE NOT EXISTS (
          SELECT 1 FROM public.system_roles sr
           WHERE sr.user_id = u.id AND sr.system_role = 'system_master'
        )
      ORDER BY lower(COALESCE(p.display_name, '')), u.id`,
  );
  const access = await sql.query<AccessRow>(
    "SELECT user_id, app_id, allowed FROM public.user_app_access",
  );
  const memberships = await sql.query<MesaMembershipRow>(
    "SELECT user_id, mesa_id FROM public.mesa_members WHERE membership_status = 'active'",
  );
  const deniedByUser = new Map<string, Set<string>>();
  for (const row of access) {
    if (row.allowed) continue;
    const denied = deniedByUser.get(row.user_id) ?? new Set<string>();
    denied.add(row.app_id);
    deniedByUser.set(row.user_id, denied);
  }
  const mesasByUser = new Map<string, string[]>();
  for (const row of memberships) {
    const mesas = mesasByUser.get(row.user_id) ?? [];
    mesas.push(row.mesa_id);
    mesasByUser.set(row.user_id, mesas);
  }
  return users.map((user) => ({
    ...user,
    allowed_app_ids: PLAYER_ACCESS_APP_IDS.filter(
      (appId) => !deniedByUser.get(user.id)?.has(appId),
    ),
    mesa_ids: mesasByUser.get(user.id) ?? [],
  }));
}

export type PlayerAccessAction = "revoke" | "restore";
export type PlayerAccessStatusResult = {
  target_user_id: string;
  access_status: "active" | "revoked";
  sessions_revoked: number;
};

export async function setPlayerAccessStatus(
  sql: SqlExecutor,
  actorUserId: string,
  targetUserId: string,
  action: PlayerAccessAction,
  reason: string | null,
): Promise<PlayerAccessStatusResult> {
  const rows = await sql.query<PlayerAccessStatusResult>(
    "SELECT * FROM public.set_player_access_status($1, $2, $3, $4)",
    [actorUserId, targetUserId, action, reason],
  );
  if (!rows[0]) throw new Error("player_access_status_not_persisted");
  return rows[0];
}

export async function setPlayerAccess(
  sql: SqlExecutor,
  actorUserId: string,
  userId: string,
  allowedAppIds: readonly string[],
): Promise<void> {
  const allowed = new Set(allowedAppIds);
  const save = async (tx: SqlExecutor) => {
    for (const appId of PLAYER_ACCESS_APP_IDS) {
      await tx.query(
        `INSERT INTO public.user_app_access (user_id, app_id, allowed, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, app_id) DO UPDATE SET
           allowed = EXCLUDED.allowed,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [userId, appId, allowed.has(appId), actorUserId],
      );
    }
  };
  if (sql.transaction) await sql.transaction(save);
  else await save(sql);
}

export async function setMesaMemberships(
  sql: SqlExecutor,
  mesaId: string,
  masterUserIds: readonly string[],
  playerUserIds: readonly string[],
): Promise<void> {
  const masters = [...new Set(masterUserIds)];
  const players = [...new Set(playerUserIds)];
  if (!masters.length) throw new Error("master_required");
  if (masters.some((id) => !isUuid(id)) || players.some((id) => !isUuid(id))) {
    throw new Error("invalid_member_id");
  }
  if (masters.some((id) => players.includes(id))) throw new Error("member_role_conflict");
  const selectedUsers = [...masters, ...players];
  const mesa = await sql.query("SELECT 1 FROM public.mesas WHERE id=$1 LIMIT 1", [mesaId]);
  if (!mesa.length) throw new Error("mesa_not_found");
  const activeUsers = await sql.query<{ id: string }>(
    `SELECT id::text FROM public.users WHERE status='active' AND id IN (${selectedUsers.map((_, index) => `$${index + 1}`).join(",")})`,
    selectedUsers,
  );
  if (activeUsers.length !== selectedUsers.length) throw new Error("member_not_found_or_inactive");
  const removalSql = selectedUsers.length
    ? `UPDATE public.mesa_members SET membership_status='left',updated_at=now() WHERE mesa_id=$1 AND membership_status='active' AND user_id NOT IN (${selectedUsers.map((_, index) => `$${index + 2}`).join(",")})`
    : "UPDATE public.mesa_members SET membership_status='left',updated_at=now() WHERE mesa_id=$1 AND membership_status='active'";
  const save = async (tx: SqlExecutor) => {
    await tx.query(removalSql, [mesaId, ...selectedUsers]);
    for (const userId of masters) {
      await tx.query(
        `INSERT INTO public.mesa_members (mesa_id,user_id,member_role,membership_status)
         VALUES ($1,$2,'mestre','active')
         ON CONFLICT (mesa_id,user_id) DO UPDATE SET member_role='mestre',membership_status='active',updated_at=now()`,
        [mesaId, userId],
      );
    }
    for (const userId of players) {
      await tx.query(
        `INSERT INTO public.mesa_members (mesa_id,user_id,member_role,membership_status)
         VALUES ($1,$2,'jogador','active')
         ON CONFLICT (mesa_id,user_id) DO UPDATE SET member_role='jogador',membership_status='active',updated_at=now()`,
        [mesaId, userId],
      );
    }
  };
  if (sql.transaction) await sql.transaction(save);
  else await save(sql);
  await provisionBestEffort(sql, [mesaId]);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function setPlayerMesas(
  sql: SqlExecutor,
  userId: string,
  mesaIds: readonly string[],
): Promise<void> {
  const uniqueMesaIds = [...new Set(mesaIds)];
  const validMesas = uniqueMesaIds.length
    ? await sql.query<{ id: string }>(
        `SELECT id FROM public.mesas WHERE id IN (${uniqueMesaIds.map((_, index) => `$${index + 1}`).join(",")})`,
        uniqueMesaIds,
      )
    : [];
  if (validMesas.length !== uniqueMesaIds.length) throw new Error("mesa_not_found");
  const target = await sql.query(
    `SELECT 1 FROM public.users u
      WHERE u.id = $1 AND u.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM public.system_roles sr
           WHERE sr.user_id = u.id AND sr.system_role = 'system_master'
        )
      LIMIT 1`,
    [userId],
  );
  if (!target.length) throw new Error("player_not_found");
  const previous = await sql.query<{ mesa_id: string }>(
    "SELECT mesa_id::text FROM public.mesa_members WHERE user_id=$1 AND membership_status='active'",
    [userId],
  );
  const save = async (tx: SqlExecutor) => {
    await tx.query("DELETE FROM public.mesa_members WHERE user_id = $1", [userId]);
    for (const mesaId of uniqueMesaIds) {
      await tx.query(
        `INSERT INTO public.mesa_members (mesa_id, user_id, member_role, membership_status)
         VALUES ($1, $2, 'jogador', 'active')
         ON CONFLICT (mesa_id, user_id) DO UPDATE SET
           member_role = 'jogador', membership_status = 'active', updated_at = now()`,
        [mesaId, userId],
      );
    }
  };
  if (sql.transaction) await sql.transaction(save);
  else await save(sql);
  await provisionBestEffort(sql, [...previous.map((row) => row.mesa_id), ...uniqueMesaIds]);
}
