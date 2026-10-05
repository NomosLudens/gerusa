import type { SqlExecutor } from "@/server/local-core/postgres";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function configuredCharacterReviewerId(): string | null {
  const value = process.env.KALLISTIS_CHARACTER_REVIEWER_USER_ID?.trim() ?? "";
  return UUID.test(value) ? value : null;
}
export async function isCharacterReviewer(sql: SqlExecutor, userId: string): Promise<boolean> {
  if (configuredCharacterReviewerId() === userId) return true;
  const rows = await sql.query<{ ok: number }>(
    `SELECT 1 AS ok FROM public.system_roles WHERE user_id=$1 AND system_role='system_master' LIMIT 1`,
    [userId],
  );
  return Boolean(rows[0]);
}

/**
 * A system reviewer has global scope. A mesa Mestre has review scope only for
 * characters explicitly assigned to one of that user's active mesas.
 */
export async function canReviewCharacter(
  sql: SqlExecutor,
  userId: string,
  characterId: string,
): Promise<boolean> {
  if (await isCharacterReviewer(sql, userId)) return true;
  const rows = await sql.query<{ ok: number }>(
    `SELECT 1 AS ok
       FROM public.character_mesas cm
       JOIN public.mesa_members mm ON mm.mesa_id = cm.mesa_id
      WHERE cm.character_id = $1
        AND mm.user_id = $2
        AND mm.member_role = 'mestre'
        AND mm.membership_status = 'active'
      LIMIT 1`,
    [characterId, userId],
  );
  return Boolean(rows[0]);
}

/** Editing authority is the owner or the existing global TAL reviewer. */
export async function canEditCharacter(
  sql: SqlExecutor,
  userId: string,
  character: { ownerUserId: string; id: string },
): Promise<boolean> {
  return character.ownerUserId === userId || (await isCharacterReviewer(sql, userId));
}

export async function reviewerForNewCharacter(
  sql: SqlExecutor,
  ownerUserId: string,
): Promise<string> {
  const configured = configuredCharacterReviewerId();
  if (configured) return configured;
  const rows = await sql.query<{ user_id: string }>(
    `SELECT sr.user_id
       FROM public.system_roles sr
       LEFT JOIN public.profiles p ON p.id=sr.user_id
      WHERE sr.system_role='system_master'
      ORDER BY CASE WHEN lower(COALESCE(p.display_name,''))='tal' THEN 0 ELSE 1 END,
               COALESCE(p.display_name,''), sr.user_id
      LIMIT 1`,
  );
  return rows[0]?.user_id ?? ownerUserId;
}
