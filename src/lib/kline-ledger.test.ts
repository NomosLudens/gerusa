import { beforeEach, describe, expect, it, vi } from "vitest";

const insertCalls: Array<{ table: string; row: Record<string, unknown> }> = [];
const updateSpy = vi.fn();
const deleteSpy = vi.fn();
let nextError: unknown = null;
let idSequence = 0;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        insertCalls.push({ table, row });
        return {
          select: () => ({
            single: async () => ({
              data: { id: `event-${++idSequence}` },
              error: nextError,
            }),
          }),
        };
      },
      update: updateSpy,
      delete: deleteSpy,
    }),
  },
}));

import {
  appendKlineReviewState,
  createKlineEvent,
  createKlineHandoffCandidate,
  linkKlineLegacySource,
} from "./kline-ledger";

describe("kline-ledger adapter", () => {
  beforeEach(() => {
    insertCalls.length = 0;
    nextError = null;
    idSequence = 0;
    updateSpy.mockClear();
    deleteSpy.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("inserts createKlineEvent rows into kline_events with user_id, event_type and source_app", async () => {
    const result = await createKlineEvent({
      userId: "user-1",
      eventType: "memory.candidate",
      sourceApp: "kallistis-clean",
    });

    expect(result.ok).toBe(true);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      table: "kline_events",
      row: {
        user_id: "user-1",
        event_type: "memory.candidate",
        source_app: "kallistis-clean",
      },
    });
  });

  it("rejects an empty eventType before calling Supabase", async () => {
    const result = await createKlineEvent({
      userId: "user-1",
      eventType: " ",
      sourceApp: "kallistis-clean",
    });

    expect(result.ok).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });

  it("inserts legacy_source_id as a string in legacy references", async () => {
    await linkKlineLegacySource({
      userId: "user-1",
      eventId: "event-1",
      legacySourceTable: "legacy_memories",
      legacySourceId: "12345",
    });

    expect(insertCalls[0]).toMatchObject({
      table: "kline_event_refs",
      row: {
        ref_kind: "legacy",
        legacy_source_id: "12345",
      },
    });
    expect(typeof insertCalls[0].row.legacy_source_id).toBe("string");
  });

  it("appends review state with insert only, without update or delete", async () => {
    const result = await appendKlineReviewState({
      userId: "user-1",
      eventId: "event-1",
      status: "pending",
    });

    expect(result.ok).toBe(true);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      table: "kline_event_review_state",
      row: {
        user_id: "user-1",
        event_id: "event-1",
        status: "pending",
      },
    });
    expect(updateSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("returns ok false and does not throw when Supabase returns an error", async () => {
    nextError = { message: "boom" };

    await expect(
      createKlineEvent({
        userId: "user-1",
        eventType: "memory.candidate",
        sourceApp: "kallistis-clean",
      }),
    ).resolves.toMatchObject({ ok: false });
  });

  it("includes target_app in the handoff candidate payload", async () => {
    const result = await createKlineHandoffCandidate({
      userId: "user-1",
      sourceApp: "kallistis-clean",
      targetApp: "kuan-yin",
      payload: { reason: "follow-up" },
    });

    expect(result.ok).toBe(true);
    expect(insertCalls[0]).toMatchObject({
      table: "kline_events",
      row: {
        event_type: "handoff.candidate",
        payload: {
          reason: "follow-up",
          target_app: "kuan-yin",
        },
      },
    });
  });
});
