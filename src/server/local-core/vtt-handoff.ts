import { createHash, randomBytes } from "node:crypto";
import type { SqlExecutor } from "./postgres";

export const VTT_HANDOFF_TTL_SECONDS = 60;
const CODE_BYTES = 32;

function digest(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

export type VttHandoff = { code: string; url: string; expiresAt: string };

export async function createVttHandoff(
  sql: SqlExecutor,
  input: { userId: string; mesaId: string; gravewrightOrigin: string; now?: Date },
): Promise<VttHandoff | null> {
  const rows = await sql.query<{ member_role: "mestre" | "jogador"; campaign_id: string }>(
    "SELECT mm.member_role, vm.gravewright_campaign_id::text AS campaign_id " +
      "FROM public.mesa_members mm JOIN public.vtt_campaign_mappings vm " +
      "ON vm.mesa_id = mm.mesa_id AND vm.active = true " +
      "WHERE mm.user_id = $1 AND mm.mesa_id = $2 AND mm.membership_status = 'active' " +
      "ORDER BY CASE WHEN mm.member_role = 'mestre' THEN 0 ELSE 1 END LIMIT 1",
    [input.userId, input.mesaId],
  );
  const row = rows[0];
  if (!row) return null;
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + VTT_HANDOFF_TTL_SECONDS * 1000);
  const code = randomBytes(CODE_BYTES).toString("base64url");
  await sql.query(
    "INSERT INTO public.vtt_handoff_codes " +
      "(code_digest, user_id, mesa_id, member_role, gravewright_campaign_id, expires_at) " +
      "VALUES ($1, $2, $3, $4, $5, $6)",
    [digest(code), input.userId, input.mesaId, row.member_role, row.campaign_id, expiresAt],
  );
  const origin = input.gravewrightOrigin.replace(/\/+$/, "");
  return {
    code,
    url: origin + "/sso/kallistis?code=" + encodeURIComponent(code),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function consumeVttHandoff(
  sql: SqlExecutor,
  code: string,
): Promise<{
  user_id: string;
  mesa_id: string;
  role: "mestre" | "jogador";
  campaign_id: string;
  display_name: string | null;
} | null> {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(code)) return null;
  const rows = await sql.query<{
    user_id: string;
    mesa_id: string;
    member_role: "mestre" | "jogador";
    gravewright_campaign_id: string;
    display_name: string | null;
  }>(
    "UPDATE public.vtt_handoff_codes h SET consumed_at = now() " +
      "FROM public.users u LEFT JOIN public.profiles p ON p.id = u.id " +
      "WHERE h.code_digest = $1 AND h.user_id = u.id AND h.expires_at > now() " +
      "AND h.consumed_at IS NULL " +
      "RETURNING h.user_id::text, h.mesa_id::text, h.member_role, " +
      "h.gravewright_campaign_id::text, p.display_name",
    [digest(code)],
  );
  const row = rows[0];
  return row
    ? {
        user_id: row.user_id,
        mesa_id: row.mesa_id,
        role: row.member_role,
        campaign_id: row.gravewright_campaign_id,
        display_name: row.display_name,
      }
    : null;
}
