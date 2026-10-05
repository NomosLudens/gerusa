import { createHash, randomBytes } from "node:crypto";
import type { SqlExecutor } from "./postgres";

export const PLAYER_INVITE_LABELS = Array.from(
  { length: 25 },
  (_, index) => `JOGADOR-${String(index + 1).padStart(2, "0")}`,
);

const AUTO_PLAYER_INVITE_LABEL_PATTERN = "^JOGADOR-(0[2-9]|1[0-9]|2[0-5])$";
const OAUTH_STATE_TTL_MINUTES = 10;

export type PlayerInviteStatus = "VALID_UNCLAIMED" | "INVALID" | "ALREADY_CLAIMED" | "REVOKED";

export type PlayerInviteClaim = {
  player_label: string;
  claimed_at: string;
  display_name: string | null;
  pronouns: string | null;
};

export type PlayerInviteIdentity = {
  display_name: string;
  pronouns: string;
};

export function normalizePlayerInviteIdentity(
  displayName: unknown,
  pronouns: unknown,
): PlayerInviteIdentity {
  if (typeof displayName !== "string" || typeof pronouns !== "string")
    throw new Error("invite_identity_required");
  const normalizedDisplayName = displayName.trim();
  const normalizedPronouns = pronouns.trim();
  if (!normalizedDisplayName || !normalizedPronouns) throw new Error("invite_identity_required");
  if (normalizedDisplayName.length > 60 || normalizedPronouns.length > 80)
    throw new Error("invite_identity_too_long");
  return { display_name: normalizedDisplayName, pronouns: normalizedPronouns };
}

export function digestPlayerInviteToken(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function generateOpaquePlayerInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateOpaqueInviteOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505",
  );
}

function optionalIdentity(displayName: string | null, pronouns: string | null) {
  if (displayName === null && pronouns === null) return null;
  return normalizePlayerInviteIdentity(displayName, pronouns);
}

export async function getPlayerInviteStatus(
  sql: SqlExecutor,
  token: string,
): Promise<PlayerInviteStatus> {
  const rows = await sql.query<{
    claimed_by_user_id: string | null;
    revoked_at: string | null;
  }>(
    `SELECT claimed_by_user_id, revoked_at
       FROM public.player_invites
      WHERE token_hash = $1
      LIMIT 1`,
    [digestPlayerInviteToken(token)],
  );
  const row = rows[0];
  if (!row) return "INVALID";
  if (row.revoked_at) return "REVOKED";
  if (row.claimed_by_user_id) return "ALREADY_CLAIMED";
  return "VALID_UNCLAIMED";
}

export async function createPlayerInviteOAuthState(
  sql: SqlExecutor,
  token: string | null,
  identity?: PlayerInviteIdentity,
): Promise<string> {
  const normalizedIdentity = identity
    ? normalizePlayerInviteIdentity(identity.display_name, identity.pronouns)
    : null;
  const state = generateOpaqueInviteOAuthState();
  const stateHash = digestPlayerInviteToken(state);
  const values = [
    stateHash,
    normalizedIdentity?.display_name ?? null,
    normalizedIdentity?.pronouns ?? null,
    OAUTH_STATE_TTL_MINUTES,
  ];

  if (token) {
    const rows = await sql.query<{ state_hash: string }>(
      `INSERT INTO public.player_invite_oauth_states
          (state_hash, invite_id, display_name, pronouns, expires_at)
        SELECT $1, id, $2, $3, now() + ($4 * interval '1 minute')
          FROM public.player_invites
         WHERE token_hash = $5
           AND claimed_by_user_id IS NULL
           AND revoked_at IS NULL
         RETURNING state_hash`,
      [...values, digestPlayerInviteToken(token)],
    );
    if (!rows[0]) throw new Error("invite_invalid_or_unavailable");
    return state;
  }

  const rows = await sql.query<{ state_hash: string }>(
    `INSERT INTO public.player_invite_oauth_states
        (state_hash, invite_id, display_name, pronouns, expires_at)
      VALUES ($1, NULL, $2, $3, now() + ($4 * interval '1 minute'))
      RETURNING state_hash`,
    values,
  );
  if (!rows[0]) throw new Error("invite_server_failure");
  return state;
}

export async function claimPlayerInvite(
  sql: SqlExecutor,
  state: string,
  userId: string,
): Promise<PlayerInviteClaim> {
  const persistIdentity = async (tx: SqlExecutor, identity: PlayerInviteIdentity | null) => {
    if (!identity) return;
    await tx.query(
      `INSERT INTO public.profiles (id, display_name, pronouns)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         pronouns = EXCLUDED.pronouns,
         updated_at = now()`,
      [userId, identity.display_name, identity.pronouns],
    );
  };

  const claim = async (tx: SqlExecutor): Promise<PlayerInviteClaim> => {
    const states = await tx.query<{
      invite_id: string | null;
      display_name: string | null;
      pronouns: string | null;
      consumed_at: string | null;
      expires_at: string;
    }>(
      `SELECT invite_id::text, display_name, pronouns, consumed_at, expires_at
         FROM public.player_invite_oauth_states
        WHERE state_hash = $1
        FOR UPDATE`,
      [digestPlayerInviteToken(state)],
    );
    const current = states[0];
    if (!current) throw new Error("invite_state_invalid_or_expired");
    if (current.expires_at && Date.parse(String(current.expires_at)) <= Date.now())
      throw new Error("invite_state_invalid_or_expired");

    const identity = optionalIdentity(current.display_name, current.pronouns);
    const isAutomaticAllocation = current.invite_id === null;
    let invite: {
      id: string;
      player_label: string;
      claimed_by_user_id: string | null;
      claimed_at: string | null;
    } | null = null;

    if (current.invite_id) {
      const rows = await tx.query<{
        id: string;
        player_label: string;
        claimed_by_user_id: string | null;
        claimed_at: string | null;
      }>(
        `SELECT id::text, player_label, claimed_by_user_id::text, claimed_at
           FROM public.player_invites
          WHERE id = $1
            AND revoked_at IS NULL
          FOR UPDATE`,
        [current.invite_id],
      );
      invite = rows[0] ?? null;
      if (!invite) throw new Error("invite_state_invalid_or_expired");
    }

    if (current.consumed_at) {
      if (!invite?.claimed_by_user_id || invite.claimed_by_user_id !== userId)
        throw new Error("invite_state_replay_forbidden");
      if (!invite.claimed_at) throw new Error("invite_state_invalid_or_expired");
      await persistIdentity(tx, identity);
      return {
        player_label: invite.player_label,
        claimed_at: invite.claimed_at,
        display_name: identity?.display_name ?? null,
        pronouns: identity?.pronouns ?? null,
      };
    }

    if (isAutomaticAllocation) {
      const existing = await tx.query<{
        id: string;
        player_label: string;
        claimed_at: string;
      }>(
        `SELECT id::text, player_label, claimed_at
           FROM public.player_invites
          WHERE claimed_by_user_id = $1
          LIMIT 1`,
        [userId],
      );
      if (existing[0]) {
        await tx.query(
          `UPDATE public.player_invite_oauth_states
              SET invite_id = $2, consumed_at = now()
            WHERE state_hash = $1
              AND consumed_at IS NULL`,
          [digestPlayerInviteToken(state), existing[0].id],
        );
        await persistIdentity(tx, identity);
        return {
          player_label: existing[0].player_label,
          claimed_at: existing[0].claimed_at,
          display_name: identity?.display_name ?? null,
          pronouns: identity?.pronouns ?? null,
        };
      }

      const available = await tx.query<{
        id: string;
        player_label: string;
        claimed_by_user_id: string | null;
        claimed_at: string | null;
      }>(
        `SELECT id::text, player_label, claimed_by_user_id::text, claimed_at
           FROM public.player_invites
          WHERE player_label ~ $1
            AND claimed_by_user_id IS NULL
            AND revoked_at IS NULL
          ORDER BY player_label ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1`,
        [AUTO_PLAYER_INVITE_LABEL_PATTERN],
      );
      invite = available[0] ?? null;
      if (!invite) throw new Error("invite_capacity_exhausted");
    }

    const selectedInvite = invite;
    if (!selectedInvite) throw new Error("invite_capacity_exhausted");

    if (selectedInvite.claimed_by_user_id) {
      if (selectedInvite.claimed_by_user_id === userId && selectedInvite.claimed_at) {
        await tx.query(
          `UPDATE public.player_invite_oauth_states
              SET consumed_at = now()
            WHERE state_hash = $1
              AND consumed_at IS NULL`,
          [digestPlayerInviteToken(state)],
        );
        await persistIdentity(tx, identity);
        return {
          player_label: selectedInvite.player_label,
          claimed_at: selectedInvite.claimed_at,
          display_name: identity?.display_name ?? null,
          pronouns: identity?.pronouns ?? null,
        };
      }
      throw new Error("invite_already_claimed");
    }

    const claimed = await tx.query<{ player_label: string; claimed_at: string }>(
      `UPDATE public.player_invites
          SET claimed_by_user_id = $1, claimed_at = now()
        WHERE id = $2
          AND claimed_by_user_id IS NULL
          AND revoked_at IS NULL
        RETURNING player_label, claimed_at`,
      [userId, selectedInvite.id],
    );
    if (!claimed[0]) throw new Error("invite_claim_conflict");

    await persistIdentity(tx, identity);

    await tx.query(
      `UPDATE public.player_invite_oauth_states
          SET invite_id = $2, consumed_at = now()
        WHERE state_hash = $1
          AND consumed_at IS NULL`,
      [digestPlayerInviteToken(state), selectedInvite.id],
    );
    await persistIdentity(tx, identity);
    return {
      player_label: claimed[0].player_label,
      claimed_at: claimed[0].claimed_at,
      display_name: identity?.display_name ?? null,
      pronouns: identity?.pronouns ?? null,
    };
  };

  try {
    return sql.transaction ? await sql.transaction(claim) : await claim(sql);
  } catch (error) {
    if (isUniqueViolation(error)) throw new Error("invite_claim_conflict");
    throw error;
  }
}
