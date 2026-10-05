import {
  MESA_PROVISION_SIGNATURE_HEADER,
  MESA_PROVISION_TIMESTAMP_HEADER,
  MesaProvisionError,
  provisionMesaToGravewright,
  signMesaProvisionBody,
} from "@/server/local-core/mesa-provision";
import type { SqlExecutor } from "@/server/local-core/postgres";
import type { CharacterRecord } from "./contracts";
import { buildGravewrightCharacterExport } from "./gravewright-export";

export type GravewrightCharacterSyncResult = {
  status: "synced" | "not_ready" | "pending";
  mesas: Array<{ mesa_id: string; campaign_id?: string; actor_id?: string; error?: string }>;
};

export async function syncCharacterToGravewright(
  sql: SqlExecutor,
  character: CharacterRecord,
): Promise<GravewrightCharacterSyncResult> {
  if (character.status !== "approved" || !character.ownerUserId) {
    return { status: "not_ready", mesas: [] };
  }
  if (!character.mesas.length) return { status: "not_ready", mesas: [] };

  const origin = process.env.KALLISTIS_GRAVEWRIGHT_ORIGIN?.trim().replace(/\/+$/, "");
  const secret = process.env.KALLISTIS_VTT_SERVICE_SECRET;
  if (!origin || !secret)
    return {
      status: "pending",
      mesas: character.mesas.map((mesa) => ({ mesa_id: mesa.id, error: "vtt_not_configured" })),
    };

  const results: GravewrightCharacterSyncResult["mesas"] = [];
  for (const mesa of character.mesas) {
    try {
      const provisioning = await provisionMesaToGravewright(sql, mesa.id);
      const payload = buildGravewrightCharacterExport({
        character,
        mesa,
        exportMode: "automatic_runtime_sync",
      });
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      let response: Response;
      try {
        response = await fetch(origin + "/api/internal/kallistis/sync/character", {
          method: "POST",
          headers: {
            [MESA_PROVISION_TIMESTAMP_HEADER]: String(timestamp),
            [MESA_PROVISION_SIGNATURE_HEADER]: signMesaProvisionBody(body, secret, timestamp),
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "KALLISTIS-Gravewright-Character-Sync/1",
          },
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const text = await response.text();
      if (text.length > 16 * 1024) throw new Error("gravewright_invalid_response");
      const raw = JSON.parse(text) as Record<string, unknown>;
      if (
        !response.ok ||
        raw.valid !== true ||
        raw.source_mesa_id !== mesa.id ||
        raw.campaign_id !== provisioning.campaign_id ||
        raw.kallistis_character_id !== character.id ||
        typeof raw.actor_id !== "string"
      ) {
        const code = typeof raw.error === "string" ? raw.error : "gravewright_sync_failed";
        throw new Error(code);
      }
      results.push({
        mesa_id: mesa.id,
        campaign_id: provisioning.campaign_id,
        actor_id: raw.actor_id,
      });
    } catch (error) {
      results.push({
        mesa_id: mesa.id,
        error:
          error instanceof MesaProvisionError
            ? error.code
            : error instanceof Error
              ? error.message.slice(0, 80)
              : "gravewright_sync_failed",
      });
    }
  }
  return {
    status: results.length > 0 && results.every((entry) => !entry.error) ? "synced" : "pending",
    mesas: results,
  };
}
