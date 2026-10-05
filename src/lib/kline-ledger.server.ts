import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type KlineLedgerResult =
  | { ok: true; eventId?: string }
  | { ok: false; error: string; cause?: unknown };

export async function createBoundaryHandoffCandidate(input: {
  supabase: SupabaseClient<Database>;
  userId: string;
  threadId?: string | null;
  targetApp: "klio-coder" | "kuan-yin";
  reason: "coding_scope" | "commercial_scope" | "legacy_klio_scope";
  latestUserText: string;
  boundaryMessage: string;
}): Promise<KlineLedgerResult> {
  const { supabase, userId, threadId, targetApp, reason, latestUserText, boundaryMessage } = input;

  try {
    const clippedText =
      latestUserText.length > 1200 ? latestUserText.slice(0, 1200) + "..." : latestUserText;

    const payload = {
      target_app: targetApp,
      reason,
      clipped_text: clippedText,
      thread_id: threadId ?? null,
    };

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "create_handoff_candidate_atomic",
      {
        p_event_type: "handoff.candidate",
        p_source_app: "kallistis-clean",
        p_occurred_at: new Date().toISOString(),
        p_title: "Bloqueio de Runtime",
        p_body: boundaryMessage,
        p_payload: payload,
      },
    );

    if (rpcError) {
      console.warn("[kline-ledger.server] RPC error in createBoundaryHandoffCandidate", rpcError);
      return { ok: false, error: "Failed to create handoff candidate atomically", cause: rpcError };
    }

    const resultObj = rpcResult as unknown as { event_id: string };
    return { ok: true, eventId: resultObj.event_id };
  } catch (err) {
    console.warn("[kline-ledger.server] Unexpected error in createBoundaryHandoffCandidate", err);
    return { ok: false, error: "Unexpected error", cause: err };
  }
}
