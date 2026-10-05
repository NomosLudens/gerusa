import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260720000000_telegram_channel_updates.sql",
  "utf8",
).toLowerCase();

describe("telegram_channel_updates migration", () => {
  it("permite claim antes das mensagens e mantém deduplicação", () => {
    expect(sql).toContain("update_id bigint primary key");
    expect(sql).toContain("alter table public.telegram_channel_updates enable row level security");
    expect(sql).not.toContain("create policy");
    expect(sql).not.toMatch(/user_message_id[^,]+references\s+public\.chat_messages/s);
    expect(sql).not.toMatch(/assistant_message_id[^,]+references\s+public\.chat_messages/s);
    expect(sql).toContain("user_message_id uuid null unique");
    expect(sql).toContain("assistant_message_id uuid null unique");
  });
});
