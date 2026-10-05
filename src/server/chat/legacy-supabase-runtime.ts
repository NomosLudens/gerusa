// Isolamento temporário para os canais Telegram ainda hospedados no adaptador
// legado. O runtime da aplicação web não importa este módulo nem conhece esta
// fonte; não há fallback entre authorities.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { LocalChatRuntime } from "@/server/local-core/chat-runtime";

type LegacyError = { message: string } | null;
type LegacyResponse = { data: unknown; error: LegacyError };
type LegacyQuery = PromiseLike<LegacyResponse> & {
  select(columns: string): LegacyQuery;
  insert(values: Record<string, unknown>): LegacyQuery;
  upsert(values: Record<string, unknown>, options?: { onConflict?: string }): LegacyQuery;
  update(values: Record<string, unknown>): LegacyQuery;
  eq(column: string, value: unknown): LegacyQuery;
  is(column: string, value: unknown): LegacyQuery;
  in(column: string, values: readonly unknown[]): LegacyQuery;
  order(column: string, options: { ascending: boolean }): LegacyQuery;
  limit(value: number): LegacyQuery;
  maybeSingle(): Promise<LegacyResponse>;
  single(): Promise<LegacyResponse>;
};
type LegacyClient = {
  from(table: string): LegacyQuery;
  rpc(name: string, args: Record<string, unknown>): Promise<LegacyResponse>;
};
type LegacyRow = Record<string, unknown>;

function rows(value: unknown): LegacyRow[] {
  return Array.isArray(value) ? (value as LegacyRow[]) : [];
}

function row(value: unknown): LegacyRow | null {
  return value && typeof value === "object" ? (value as LegacyRow) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function nullableText(value: unknown): string | null {
  return value == null ? null : text(value);
}

function textArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function createLegacySupabaseChatRuntime(
  client: SupabaseClient<Database>,
): LocalChatRuntime {
  const legacy = client as unknown as LegacyClient;
  const chat: LocalChatRuntime["chat"] = {
    async findCanonicalThread() {
      throw new Error("Legacy Supabase chat runtime is isolated from the active core");
    },
    async createThread() {
      throw new Error("Legacy Supabase chat runtime is isolated from the active core");
    },
    async getThreadById(userId, threadId) {
      const result = await legacy
        .from("chat_threads")
        .select("id, user_id, surface, facet, title, created_at, last_sedimentado_at")
        .eq("id", threadId)
        .eq("user_id", userId)
        .maybeSingle();
      const data = row(result.data);
      const error = result.error;
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        id: text(data.id),
        userId: text(data.user_id),
        surface: text(data.surface),
        facet: text(data.facet),
        title: nullableText(data.title),
        createdAt: text(data.created_at),
        lastSedimentadoAt: nullableText(data.last_sedimentado_at),
      };
    },
    async insertMessage(message) {
      const result = await legacy.from("chat_messages").upsert(
        {
          id: message.id,
          thread_id: message.threadId,
          user_id: message.userId,
          role: message.role,
          content: message.content,
          created_at: message.createdAt,
          derived_from: message.derivedFrom,
          source_channel: message.sourceChannel,
        },
        { onConflict: "id" },
      );
      const error = result.error;
      if (error) throw new Error(error.message);
    },
    async listThreadMessages(userId, threadId, limit) {
      const result = await legacy
        .from("chat_messages")
        .select("id, thread_id, user_id, role, content, created_at, derived_from, source_channel")
        .eq("thread_id", threadId)
        .eq("user_id", userId)
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: false })
        .limit(limit);
      const data = rows(result.data);
      const error = result.error;
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        id: text(row.id),
        threadId: text(row.thread_id),
        userId: text(row.user_id),
        role: row.role as "user" | "assistant",
        content: text(row.content),
        createdAt: text(row.created_at),
        derivedFrom: textArray(row.derived_from),
        sourceChannel: nullableText(row.source_channel),
      }));
    },
    async updateThreadSedimentationCursor(userId, threadId, at) {
      const result = await legacy
        .from("chat_threads")
        .update({ last_sedimentado_at: at })
        .eq("id", threadId)
        .eq("user_id", userId);
      const error = result.error;
      if (error) throw new Error(error.message);
    },
  };

  const memory: LocalChatRuntime["memory"] = {
    async listCandidates(userId) {
      const result = await legacy
        .from("memory_candidates")
        .select("id, user_id, title, content, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const data = rows(result.data);
      const error = result.error;
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        id: text(row.id),
        userId: text(row.user_id),
        title: text(row.title),
        content: text(row.content),
        status: row.status as "pending" | "approved" | "rejected" | "archived",
        createdAt: text(row.created_at),
      }));
    },
    async listMemories(userId) {
      const result = await legacy
        .from("jardim_memorias")
        .select("id, user_id, title, body, created_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      const data = rows(result.data);
      const error = result.error;
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        id: text(row.id),
        userId: text(row.user_id),
        title: text(row.title),
        body: text(row.body),
        campaignId: null,
        createdAt: text(row.created_at),
      }));
    },
    async listSediments(userId, threadId) {
      const result = await legacy
        .from("sedimentos")
        .select(
          "id, user_id, thread_id, nivel, status, source_ids, hipotese, resumo, confianca, promovido_para, created_at",
        )
        .eq("user_id", userId)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      const data = rows(result.data);
      const error = result.error;
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        id: text(row.id),
        userId: text(row.user_id),
        threadId: text(row.thread_id),
        level: text(row.nivel),
        status: row.status as "rascunho" | "em_revisao" | "confirmado" | "descartado",
        sourceIds: textArray(row.source_ids),
        hypothesis: text(row.hipotese),
        summary: nullableText(row.resumo),
        confidence: numberValue(row.confianca),
        promotedTo: nullableText(row.promovido_para),
        createdAt: text(row.created_at),
      }));
    },
  };

  const sedimentation: LocalChatRuntime["sedimentation"] = {
    async insertSediment(input) {
      const result = await legacy
        .from("sedimentos")
        .insert({
          user_id: input.userId,
          thread_id: input.threadId,
          nivel: input.level,
          status: input.status,
          source_kind: input.sourceKind,
          source_ids: input.sourceIds,
          hipotese: input.hypothesis,
          resumo: input.summary,
          confianca: input.confidence,
        })
        .select("id")
        .single();
      const data = row(result.data);
      const error = result.error;
      if (error || !data) throw new Error(error?.message ?? "Sediment was not persisted");
      return text(data.id);
    },
    async getSediment(userId, sedimentId) {
      const result = await legacy
        .from("sedimentos")
        .select(
          "id, user_id, thread_id, nivel, status, source_ids, hipotese, resumo, confianca, promovido_para, created_at",
        )
        .eq("user_id", userId)
        .eq("id", sedimentId)
        .maybeSingle();
      const data = row(result.data);
      const error = result.error;
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        id: text(data.id),
        userId: text(data.user_id),
        threadId: text(data.thread_id),
        level: text(data.nivel),
        status: data.status as "rascunho" | "em_revisao" | "confirmado" | "descartado",
        sourceIds: textArray(data.source_ids),
        hypothesis: text(data.hipotese),
        summary: nullableText(data.resumo),
        confidence: numberValue(data.confianca),
        promotedTo: nullableText(data.promovido_para),
        createdAt: text(data.created_at),
      };
    },
    async discardSediment(userId, sedimentId, at) {
      const result = await legacy
        .from("sedimentos")
        .update({ status: "descartado", revisado_at: at })
        .eq("id", sedimentId)
        .eq("user_id", userId)
        .eq("status", "em_revisao")
        .select("id")
        .maybeSingle();
      const data = row(result.data);
      const error = result.error;
      if (error) throw new Error(error.message);
      return Boolean(data?.id);
    },
    async approveMemoryCandidate(userId, candidateId, input) {
      const { data, error } = await legacy.rpc("approve_memory_candidate_atomic", {
        p_candidate_id: candidateId,
        p_title: input.title,
        p_content: input.content,
        p_domain: input.domain,
        p_sensitivity: input.sensitivity,
        p_tags: input.tags,
        p_importance: input.importance,
      });
      if (error) throw new Error(error.message);
      return (data ?? {}) as Record<string, unknown>;
    },
    async confirmSediment(userId, sedimentId, input) {
      void userId;
      const { data, error } = await legacy.rpc("confirm_sediment_atomic", {
        p_sedimento_id: sedimentId,
        p_title: input.title,
        p_content: input.content,
        p_importance: input.importance,
        p_tags: input.tags,
      });
      if (error) throw new Error(error.message);
      return (data ?? {}) as Record<string, unknown>;
    },
    async promoteSedimentBatch(userId, threadId, sourceIds, input) {
      void userId;
      const { data, error } = await legacy.rpc("promote_sediment_batch_atomic", {
        p_thread_id: threadId,
        p_next_level: input.nextLevel,
        p_source_ids: sourceIds,
        p_hipotese: input.hypothesis,
        p_resumo: input.summary,
        p_confianca: input.confidence,
        p_parent_status: input.parentStatus ?? "confirmado",
        p_new_status: input.newStatus ?? "em_revisao",
      });
      if (error) throw new Error(error.message);
      return (data ?? {}) as Record<string, unknown>;
    },
  };

  return { chat, memory, sedimentation, close: () => undefined, databaseUrl: "" };
}
