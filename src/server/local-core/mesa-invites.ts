import { createHash, randomBytes } from "node:crypto";
import type { SqlExecutor } from "./postgres";
import { provisionBestEffort } from "./mesa-provision";

const INVITE_TTL_DAYS = 7;

function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export type InviteDetails = {
  id: string;
  user_id: string;
  player_name: string;
  mesa_id: string;
  mesa_name: string;
  expires_at: string;
};

export async function createMesaInvite(
  sql: SqlExecutor,
  createdBy: string,
  userId: string,
  mesaId: string,
): Promise<{ token: string; invite: InviteDetails }> {
  const target = await sql.query<{ player_name: string; mesa_name: string }>(
    `SELECT p.display_name AS player_name, m.name AS mesa_name
       FROM public.profiles p
       JOIN public.users u ON u.id = p.id AND u.status = 'active'
       CROSS JOIN public.mesas m
      WHERE p.id = $1 AND m.id = $2
        AND NOT EXISTS (
          SELECT 1 FROM public.system_roles sr
           WHERE sr.user_id = p.id AND sr.system_role = 'system_master'
        )
      LIMIT 1`,
    [userId, mesaId],
  );
  if (!target[0]) throw new Error("invite_target_not_found");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const save = async (tx: SqlExecutor) => {
    const rows = await tx.query<{ id: string }>(
      `INSERT INTO public.mesa_invites (token_digest, user_id, mesa_id, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [digestToken(token), userId, mesaId, createdBy, expiresAt],
    );
    await tx.query(
      `INSERT INTO public.mesa_members (mesa_id, user_id, member_role, membership_status)
       VALUES ($1, $2, 'jogador', 'invited')
       ON CONFLICT (mesa_id, user_id) DO UPDATE SET
         membership_status = 'invited', updated_at = now()`,
      [mesaId, userId],
    );
    return rows[0]?.id;
  };
  const id = sql.transaction ? await sql.transaction(save) : await save(sql);
  if (!id) throw new Error("invite_not_persisted");
  return {
    token,
    invite: {
      id,
      user_id: userId,
      player_name: target[0].player_name || "Jogador",
      mesa_id: mesaId,
      mesa_name: target[0].mesa_name,
      expires_at: expiresAt,
    },
  };
}

export async function getMesaInvite(
  sql: SqlExecutor,
  token: string,
): Promise<InviteDetails | null> {
  const rows = await sql.query<InviteDetails>(
    `SELECT i.id, i.user_id, COALESCE(p.display_name, 'Jogador') AS player_name,
            i.mesa_id, m.name AS mesa_name, i.expires_at
       FROM public.mesa_invites i
       JOIN public.profiles p ON p.id = i.user_id
       JOIN public.mesas m ON m.id = i.mesa_id
      WHERE i.token_digest = $1 AND i.used_at IS NULL AND i.expires_at > now()
      LIMIT 1`,
    [digestToken(token)],
  );
  return rows[0] ?? null;
}

export async function redeemMesaInvite(
  sql: SqlExecutor,
  token: string,
  userId: string,
): Promise<InviteDetails> {
  const invite = await getMesaInvite(sql, token);
  if (!invite || invite.user_id !== userId) throw new Error("invite_invalid_or_wrong_user");
  const previous = await sql.query<{ mesa_id: string }>(
    "SELECT mesa_id::text FROM public.mesa_members WHERE user_id=$1 AND membership_status='active'",
    [userId],
  );
  const redeem = async (tx: SqlExecutor) => {
    await tx.query(
      `UPDATE public.mesa_members SET membership_status = 'left', updated_at = now()
        WHERE user_id = $1 AND mesa_id <> $2 AND membership_status = 'active'`,
      [userId, invite.mesa_id],
    );
    await tx.query(
      `INSERT INTO public.mesa_members (mesa_id, user_id, member_role, membership_status)
       VALUES ($1, $2, 'jogador', 'active')
       ON CONFLICT (mesa_id, user_id) DO UPDATE SET
         membership_status = 'active', updated_at = now()`,
      [invite.mesa_id, userId],
    );
    const used = await tx.query(
      `UPDATE public.mesa_invites SET used_at = now()
        WHERE id = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING id`,
      [invite.id],
    );
    if (!used.length) throw new Error("invite_already_used");
  };
  if (sql.transaction) await sql.transaction(redeem);
  else await redeem(sql);
  await provisionBestEffort(sql, [invite.mesa_id, ...previous.map((row) => row.mesa_id)]);
  return invite;
}
