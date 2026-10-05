import type { SupabaseClient } from "@supabase/supabase-js";

export type CanonicalPrivateThreadResult =
  | { kind: "not_found" }
  | { kind: "found"; id: string }
  | { kind: "ambiguous" };

export async function resolveCanonicalPrivateThread(
  client: SupabaseClient,
  userId: string,
): Promise<CanonicalPrivateThreadResult> {
  const { data, error } = await client
    .from("chat_threads")
    .select("id")
    .eq("user_id", userId)
    .eq("facet", "kallistis")
    .eq("surface", "kallistis")
    .limit(2);
  if (error) throw new Error(`Falha ao buscar thread da Kallistis: ${error.message}`);
  if (!data?.length) return { kind: "not_found" };
  if (data.length > 1) return { kind: "ambiguous" };
  return { kind: "found", id: data[0].id };
}

// This module is only for the legacy Telegram adapter. The browser chat must
// never import it or use the provider-backed thread lookup.
