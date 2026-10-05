import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourceChannelSql = readFileSync(
  "supabase/migrations/20260721130000_chat_messages_source_channel.sql",
  "utf8",
).toLowerCase();
const uniquenessSql = readFileSync(
  "supabase/migrations/20260721150000_verify_canonical_kaline_thread_uniqueness.sql",
  "utf8",
).toLowerCase();
const completionSql = readFileSync(
  "supabase/migrations/20260721160000_complete_telegram_dialogue_with_candidate.sql",
  "utf8",
).toLowerCase();
const reservationSql = readFileSync(
  "supabase/migrations/20260723000000_telegram_dialogue_single_active_reservation.sql",
  "utf8",
).toLowerCase();

describe("migrations da continuidade da Kallistis", () => {
  it("executa o preflight de duplicidade antes dos índices canônicos", () => {
    expect(sourceChannelSql).not.toContain("create unique index");
    expect(uniquenessSql).toContain("having count(*) > 1");
    expect(uniquenessSql).toContain("raise exception");
    expect(uniquenessSql).toContain("select user_id, surface, count(*)");
    expect(uniquenessSql.indexOf("raise exception")).toBeLessThan(
      uniquenessSql.indexOf("create unique index"),
    );
  });

  it("define conclusão e candidato final como uma única operação idempotente", () => {
    expect(completionSql).toContain("for update");
    expect(completionSql).toContain("v_dialogue_user_id is distinct from p_user_id");
    expect(completionSql).toContain("v_dialogue_thread_id is distinct from p_thread_id");
    expect(completionSql).toContain("role = 'assistant'");
    expect(completionSql).toContain("source_channel = 'c03'");
    expect(completionSql).toContain("final_assistant_message_id = p_assistant_message_id");
    expect(completionSql).toContain("'short_term'");
    expect(completionSql).toContain("'em_revisao'");
    expect(completionSql).toContain("'telegram_dialogue_final'");
    expect(completionSql).toContain("array[p_assistant_message_id::text]");
    expect(completionSql).toContain(
      "on conflict (user_id, thread_id, source_kind, (source_ids[1]))",
    );
    expect(completionSql).not.toContain("'confirmado'");
    expect(completionSql).toContain("'already_completed', v_already_completed");
  });

  it("restringe a RPC ao service role", () => {
    expect(completionSql).toContain("security invoker");
    expect(completionSql).toContain("from public, anon, authenticated");
    expect(completionSql).toContain("to service_role");
  });

  it("reserva uma única travessia ativa e bloqueia duplicatas legadas", () => {
    expect(reservationSql).toContain("alter column kaline_message_id drop not null");
    expect(reservationSql).toContain("where status in ('open', 'processing')");
    expect(reservationSql).toContain("group by chat_id, user_id, thread_id");
    expect(reservationSql).toContain("having count(*) > 1");
    expect(reservationSql).toContain("raise exception");
    expect(reservationSql).toContain("telegram_dialogues_one_active_per_scope");
    expect(reservationSql.indexOf("raise exception")).toBeLessThan(
      reservationSql.indexOf("create unique index"),
    );
  });
});
