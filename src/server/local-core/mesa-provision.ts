import { createHmac } from "node:crypto";
import type { SqlExecutor } from "./postgres";

export const MESA_PROVISION_SCHEMA = "kallistis.gravewright.mesa-provision.v1";
export const GRAVEWRIGHT_CAMPAIGN_LIST_SCHEMA = "kallistis.gravewright.campaign-list.v1";
export const GRAVEWRIGHT_CAMPAIGN_LINK_SCHEMA = "kallistis.gravewright.campaign-link.v1";
export const MESA_PROVISION_TIMESTAMP_HEADER = "x-kallistis-timestamp";
export const MESA_PROVISION_SIGNATURE_HEADER = "x-kallistis-signature";
export const MESA_PROVISION_SIGNATURE_MAX_AGE_SECONDS = 60;

export function signMesaProvisionBody(body: string, secret: string, timestamp: number): string {
  const message = `${timestamp}.${body}`;
  return "sha256=" + createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

type MesaProvisionMember = {
  source_user_id: string;
  display_name: string;
  role: "mestre" | "jogador";
};

type MesaProvisionPayload = {
  schema: typeof MESA_PROVISION_SCHEMA;
  mesa: { source_system: "kallistis"; source_mesa_id: string; name: string };
  members: MesaProvisionMember[];
};

export type ExistingGravewrightCampaign = {
  id: string;
  name: string;
};

export type ExistingCampaignLinkResult = {
  valid: true;
  source_mesa_id: string;
  campaign_id: string;
  campaign_name: string;
  mapping_created: boolean;
};

export type MesaProvisionResult = {
  valid: true;
  source_mesa_id: string;
  campaign_id: string;
  campaign_created: boolean;
  campaign_reused: boolean;
  members_created: number;
  members_updated: number;
  members_removed: number;
};

export class MesaProvisionError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function validateResult(value: unknown, mesaId: string): MesaProvisionResult {
  if (!value || typeof value !== "object")
    throw new MesaProvisionError("gravewright_invalid_response");
  const result = value as Record<string, unknown>;
  if (
    result.valid !== true ||
    result.source_mesa_id !== mesaId ||
    !isUuid(result.campaign_id) ||
    typeof result.campaign_created !== "boolean" ||
    typeof result.campaign_reused !== "boolean" ||
    result.campaign_created === result.campaign_reused ||
    !isNonNegativeInteger(result.members_created) ||
    !isNonNegativeInteger(result.members_updated) ||
    !isNonNegativeInteger(result.members_removed)
  )
    throw new MesaProvisionError("gravewright_invalid_response");
  return result as unknown as MesaProvisionResult;
}

function validateExistingCampaigns(value: unknown): ExistingGravewrightCampaign[] {
  if (!value || typeof value !== "object")
    throw new MesaProvisionError("gravewright_campaign_list_invalid_response");
  const result = value as Record<string, unknown>;
  if (result.valid !== true || !Array.isArray(result.campaigns)) {
    throw new MesaProvisionError("gravewright_campaign_list_invalid_response");
  }
  return result.campaigns
    .filter((campaign): campaign is ExistingGravewrightCampaign => {
      if (!campaign || typeof campaign !== "object") return false;
      const row = campaign as Record<string, unknown>;
      return isUuid(row.id) && typeof row.name === "string" && row.name.trim().length > 0;
    })
    .map((campaign) => ({ id: campaign.id, name: campaign.name }));
}

function validateExistingCampaignLink(
  value: unknown,
  mesaId: string,
  campaignId: string,
): ExistingCampaignLinkResult {
  if (!value || typeof value !== "object")
    throw new MesaProvisionError("gravewright_link_invalid_response");
  const result = value as Record<string, unknown>;
  if (
    result.valid !== true ||
    result.source_mesa_id !== mesaId ||
    result.campaign_id !== campaignId ||
    typeof result.campaign_name !== "string" ||
    typeof result.mapping_created !== "boolean"
  )
    throw new MesaProvisionError("gravewright_link_invalid_response");
  return result as unknown as ExistingCampaignLinkResult;
}

async function buildPayload(sql: SqlExecutor, mesaId: string): Promise<MesaProvisionPayload> {
  const mesas = await sql.query<{ id: string; name: string }>(
    "SELECT id::text,name FROM public.mesas WHERE id=$1 LIMIT 1",
    [mesaId],
  );
  const mesa = mesas[0];
  if (!mesa) throw new MesaProvisionError("mesa_not_found");
  const name = mesa.name.trim();
  if (!name || name.length > 80)
    throw new MesaProvisionError("mesa_name_not_supported_by_gravewright");
  const rows = await sql.query<{
    user_id: string;
    display_name: string | null;
    member_role: "mestre" | "jogador";
    user_status: "active" | "disabled";
  }>(
    "SELECT mm.user_id::text AS user_id,p.display_name,mm.member_role,u.status AS user_status " +
      "FROM public.mesa_members mm JOIN public.users u ON u.id=mm.user_id " +
      "LEFT JOIN public.profiles p ON p.id=mm.user_id " +
      "WHERE mm.mesa_id=$1 AND mm.membership_status='active' " +
      "ORDER BY mm.member_role DESC,mm.user_id",
    [mesaId],
  );
  if (rows.some((row) => row.user_status !== "active"))
    throw new MesaProvisionError("active_mesa_member_is_disabled");
  return {
    schema: MESA_PROVISION_SCHEMA,
    mesa: { source_system: "kallistis", source_mesa_id: mesaId, name },
    members: rows.map((row) => ({
      source_user_id: row.user_id,
      display_name: (row.display_name?.trim() || "KALLISTIS " + row.user_id.slice(0, 8)).slice(
        0,
        80,
      ),
      role: row.member_role,
    })),
  };
}

export async function provisionMesaToGravewright(
  sql: SqlExecutor,
  mesaId: string,
): Promise<MesaProvisionResult> {
  if (!isUuid(mesaId)) throw new MesaProvisionError("invalid_mesa_id");
  const origin = process.env.KALLISTIS_GRAVEWRIGHT_ORIGIN?.trim().replace(/\/+$/, "");
  const secret = process.env.KALLISTIS_VTT_SERVICE_SECRET;
  if (!origin || !secret) throw new MesaProvisionError("vtt_not_configured");

  const existing = await sql.query<{ gravewright_campaign_id: string }>(
    "SELECT gravewright_campaign_id::text FROM public.vtt_campaign_mappings WHERE mesa_id=$1 LIMIT 1",
    [mesaId],
  );
  const knownCampaignId = existing[0]?.gravewright_campaign_id;
  const payload = await buildPayload(sql, mesaId);
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let response: Response;
  try {
    response = await fetch(origin + "/api/internal/kallistis/provision/mesa", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + secret,
        [MESA_PROVISION_TIMESTAMP_HEADER]: String(timestamp),
        [MESA_PROVISION_SIGNATURE_HEADER]: signMesaProvisionBody(body, secret, timestamp),
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "KALLISTIS-Gravewright-Provision/1",
      },
      body,
      signal: controller.signal,
    });
  } catch {
    throw new MesaProvisionError("gravewright_unavailable");
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text().catch(() => "");
  if (text.length > 16 * 1024) throw new MesaProvisionError("gravewright_invalid_response");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new MesaProvisionError("gravewright_invalid_response");
  }
  if (!response.ok) {
    const remoteCode =
      raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).error === "string"
        ? (raw as Record<string, string>).error
        : "gravewright_provision_failed";
    throw new MesaProvisionError(remoteCode);
  }
  const result = validateResult(raw, mesaId);
  if (knownCampaignId && knownCampaignId !== result.campaign_id)
    throw new MesaProvisionError("vtt_mapping_conflict");
  const duplicate = await sql.query<{ mesa_id: string }>(
    "SELECT mesa_id::text FROM public.vtt_campaign_mappings WHERE gravewright_campaign_id=$1 AND mesa_id<>$2 LIMIT 1",
    [result.campaign_id, mesaId],
  );
  if (duplicate.length) throw new MesaProvisionError("vtt_campaign_already_mapped");
  const save = async (tx: SqlExecutor) => {
    await tx.query(
      "INSERT INTO public.vtt_campaign_mappings (mesa_id,gravewright_campaign_id,active) " +
        "VALUES ($1,$2,true) ON CONFLICT (mesa_id) DO UPDATE SET " +
        "gravewright_campaign_id=EXCLUDED.gravewright_campaign_id,active=true,updated_at=now()",
      [mesaId, result.campaign_id],
    );
  };
  if (sql.transaction) await sql.transaction(save);
  else await save(sql);
  return result;
}

async function callGravewright(
  path: string,
  payload: Record<string, unknown>,
  secret: string,
  origin: string,
): Promise<unknown> {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let response: Response;
  try {
    response = await fetch(origin + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + secret,
        [MESA_PROVISION_TIMESTAMP_HEADER]: String(timestamp),
        [MESA_PROVISION_SIGNATURE_HEADER]: signMesaProvisionBody(body, secret, timestamp),
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "KALLISTIS-Gravewright-Mapping/1",
      },
      body,
      signal: controller.signal,
    });
  } catch {
    throw new MesaProvisionError("gravewright_unavailable");
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text().catch(() => "");
  if (text.length > 16 * 1024) throw new MesaProvisionError("gravewright_invalid_response");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new MesaProvisionError("gravewright_invalid_response");
  }
  if (!response.ok) {
    const remoteCode =
      raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).error === "string"
        ? (raw as Record<string, string>).error
        : "gravewright_mapping_failed";
    throw new MesaProvisionError(remoteCode);
  }
  return raw;
}

async function ensureMesaExists(sql: SqlExecutor, mesaId: string) {
  const rows = await sql.query<{ id: string; name: string }>(
    "SELECT id::text, name FROM public.mesas WHERE id=$1 LIMIT 1",
    [mesaId],
  );
  if (!rows[0]) throw new MesaProvisionError("mesa_not_found");
  return rows[0];
}

export async function listExistingGravewrightCampaigns(
  sql: SqlExecutor,
  mesaId: string,
): Promise<ExistingGravewrightCampaign[]> {
  if (!isUuid(mesaId)) throw new MesaProvisionError("invalid_mesa_id");
  await ensureMesaExists(sql, mesaId);
  const existing = await sql.query<{ gravewright_campaign_id: string }>(
    "SELECT gravewright_campaign_id::text FROM public.vtt_campaign_mappings WHERE mesa_id=$1 LIMIT 1",
    [mesaId],
  );
  if (existing[0]) throw new MesaProvisionError("vtt_mapping_conflict");
  const origin = process.env.KALLISTIS_GRAVEWRIGHT_ORIGIN?.trim().replace(/\/+$/, "");
  const secret = process.env.KALLISTIS_VTT_SERVICE_SECRET;
  if (!origin || !secret) throw new MesaProvisionError("vtt_not_configured");
  const raw = await callGravewright(
    "/api/internal/kallistis/campaigns/list",
    { schema: GRAVEWRIGHT_CAMPAIGN_LIST_SCHEMA, source_system: "kallistis" },
    secret,
    origin,
  );
  return validateExistingCampaigns(raw);
}

export async function linkExistingMesaToGravewright(
  sql: SqlExecutor,
  mesaId: string,
  campaignId: string,
): Promise<ExistingCampaignLinkResult> {
  if (!isUuid(mesaId)) throw new MesaProvisionError("invalid_mesa_id");
  if (!isUuid(campaignId)) throw new MesaProvisionError("invalid_campaign_id");
  const mesa = await ensureMesaExists(sql, mesaId);
  const existing = await sql.query<{ gravewright_campaign_id: string }>(
    "SELECT gravewright_campaign_id::text FROM public.vtt_campaign_mappings WHERE mesa_id=$1 LIMIT 1",
    [mesaId],
  );
  if (existing[0] && existing[0].gravewright_campaign_id !== campaignId) {
    throw new MesaProvisionError("vtt_mapping_conflict");
  }
  const duplicate = await sql.query<{ mesa_id: string }>(
    "SELECT mesa_id::text FROM public.vtt_campaign_mappings WHERE gravewright_campaign_id=$1 AND mesa_id<>$2 LIMIT 1",
    [campaignId, mesaId],
  );
  if (duplicate.length) throw new MesaProvisionError("vtt_campaign_already_mapped");
  const origin = process.env.KALLISTIS_GRAVEWRIGHT_ORIGIN?.trim().replace(/\/+$/, "");
  const secret = process.env.KALLISTIS_VTT_SERVICE_SECRET;
  if (!origin || !secret) throw new MesaProvisionError("vtt_not_configured");
  const raw = await callGravewright(
    "/api/internal/kallistis/campaigns/link",
    {
      schema: GRAVEWRIGHT_CAMPAIGN_LINK_SCHEMA,
      source_system: "kallistis",
      source_mesa_id: mesaId,
      source_mesa_name: mesa.name,
      campaign_id: campaignId,
    },
    secret,
    origin,
  );
  const result = validateExistingCampaignLink(raw, mesaId, campaignId);
  if (!existing[0]) {
    await sql.query(
      "INSERT INTO public.vtt_campaign_mappings (mesa_id,gravewright_campaign_id,active) " +
        "VALUES ($1,$2,true) ON CONFLICT (mesa_id) DO NOTHING",
      [mesaId, campaignId],
    );
  }
  return result;
}

export async function createMesa(
  sql: SqlExecutor,
  masterUserIds: readonly string[],
  playerUserIds: readonly string[],
  nameInput: string,
) {
  const name = nameInput.trim();
  if (name.length < 1 || name.length > 120) throw new MesaProvisionError("invalid_mesa_name");
  const masters = [...new Set(masterUserIds)];
  const players = [...new Set(playerUserIds)];
  if (!masters.length) throw new MesaProvisionError("master_required");
  if (masters.some((id) => !isUuid(id)) || players.some((id) => !isUuid(id))) {
    throw new MesaProvisionError("invalid_member_id");
  }
  if (masters.some((id) => players.includes(id))) {
    throw new MesaProvisionError("member_role_conflict");
  }
  const selectedUsers = [...masters, ...players];
  const activeUsers = await sql.query<{ id: string }>(
    `SELECT id::text FROM public.users WHERE status='active' AND id IN (${selectedUsers.map((_, index) => `$${index + 1}`).join(",")})`,
    selectedUsers,
  );
  if (activeUsers.length !== selectedUsers.length)
    throw new MesaProvisionError("member_not_found_or_inactive");
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "mesa";
  const save = async (tx: SqlExecutor) => {
    for (let index = 0; index < 100; index += 1) {
      const suffix = index ? "-" + (index + 1) : "";
      const rows = await tx.query<{ id: string; slug: string; name: string }>(
        "INSERT INTO public.mesas (slug,name) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING " +
          "RETURNING id::text,slug,name",
        [base.slice(0, 90 - suffix.length) + suffix, name],
      );
      if (rows[0]) {
        for (const userId of masters) {
          await tx.query(
            "INSERT INTO public.mesa_members (mesa_id,user_id,member_role,membership_status) VALUES ($1,$2,'mestre','active')",
            [rows[0].id, userId],
          );
        }
        for (const userId of players) {
          await tx.query(
            "INSERT INTO public.mesa_members (mesa_id,user_id,member_role,membership_status) VALUES ($1,$2,'jogador','active')",
            [rows[0].id, userId],
          );
        }
        return rows[0];
      }
    }
    throw new MesaProvisionError("mesa_slug_unavailable");
  };
  return sql.transaction ? sql.transaction(save) : save(sql);
}

export async function provisionBestEffort(
  sql: SqlExecutor,
  mesaIds: readonly string[],
): Promise<void> {
  for (const mesaId of [...new Set(mesaIds)]) {
    try {
      await provisionMesaToGravewright(sql, mesaId);
    } catch {
      /* retry through the same service later */
    }
  }
}
