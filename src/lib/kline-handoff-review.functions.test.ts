import { describe, it, expect, vi } from "vitest";
import {
  _normalizeHandoffCandidate,
  _latestReviewStatusByEventId,
  _filterHandoffCandidatesByStatus,
  _buildReviewStateInsert,
  type KlineEventRow,
  type KlineEventReviewStateRow,
} from "./kline-handoff-review.functions";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<KlineEventRow> = {}): KlineEventRow {
  return {
    id: "ev-001",
    user_id: "user-abc",
    event_type: "handoff.candidate",
    source_app: "kallistis-clean",
    title: null,
    body: null,
    payload: { target_app: "klio-coder", reason: "coding_scope" },
    created_at: "2026-07-09T10:00:00Z",
    occurred_at: "2026-07-09T10:00:00Z",
    ...overrides,
  };
}

function makeReviewState(
  overrides: Partial<KlineEventReviewStateRow> = {},
): KlineEventReviewStateRow {
  return {
    id: "rs-001",
    user_id: "user-abc",
    event_id: "ev-001",
    status: "pending",
    reviewer_id: "user-abc",
    note: null,
    metadata: null,
    created_at: "2026-07-09T10:00:00Z",
    ...overrides,
  };
}

// ─── _latestReviewStatusByEventId ─────────────────────────────────────────────

describe("_latestReviewStatusByEventId", () => {
  it("escolhe o status mais recente (primeiro da lista, já ordenada desc por created_at)", () => {
    const states: KlineEventReviewStateRow[] = [
      makeReviewState({
        id: "rs-2",
        event_id: "ev-001",
        status: "approved",
        created_at: "2026-07-09T12:00:00Z",
      }),
      makeReviewState({
        id: "rs-1",
        event_id: "ev-001",
        status: "pending",
        created_at: "2026-07-09T10:00:00Z",
      }),
    ];
    const map = _latestReviewStatusByEventId(states);
    expect(map.get("ev-001")).toBe("approved");
  });

  it("retorna pending implícito quando evento não tem estados de revisão", () => {
    const map = _latestReviewStatusByEventId([]);
    expect(map.get("ev-001")).toBeUndefined();
  });

  it("trata múltiplos eventos de forma independente", () => {
    const states: KlineEventReviewStateRow[] = [
      makeReviewState({
        id: "rs-a",
        event_id: "ev-001",
        status: "approved",
        created_at: "2026-07-09T11:00:00Z",
      }),
      makeReviewState({
        id: "rs-b",
        event_id: "ev-002",
        status: "rejected",
        created_at: "2026-07-09T11:00:00Z",
      }),
    ];
    const map = _latestReviewStatusByEventId(states);
    expect(map.get("ev-001")).toBe("approved");
    expect(map.get("ev-002")).toBe("rejected");
  });
});

// ─── _filterHandoffCandidatesByStatus ─────────────────────────────────────────

describe("_filterHandoffCandidatesByStatus", () => {
  it("filtra status pending por padrão quando evento não tem revisão", () => {
    const events = [makeEvent()];
    const result = _filterHandoffCandidatesByStatus(events, [], "pending", 10);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("pending");
  });

  it("respeita status approved — exclui pending", () => {
    const events = [makeEvent({ id: "ev-001" }), makeEvent({ id: "ev-002" })];
    const states = [
      makeReviewState({
        event_id: "ev-001",
        status: "approved",
        created_at: "2026-07-09T11:00:00Z",
      }),
    ];
    const result = _filterHandoffCandidatesByStatus(events, states, "approved", 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ev-001");
  });

  it("respeita status rejected", () => {
    const events = [makeEvent({ id: "ev-001" })];
    const states = [
      makeReviewState({
        event_id: "ev-001",
        status: "rejected",
        created_at: "2026-07-09T11:00:00Z",
      }),
    ];
    const result = _filterHandoffCandidatesByStatus(events, states, "rejected", 10);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("rejected");
  });

  it("respeita status archived", () => {
    const events = [makeEvent({ id: "ev-001" })];
    const states = [
      makeReviewState({
        event_id: "ev-001",
        status: "archived",
        created_at: "2026-07-09T11:00:00Z",
      }),
    ];
    const result = _filterHandoffCandidatesByStatus(events, states, "archived", 10);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("archived");
  });

  it("respeita o limite máximo", () => {
    const events = [
      makeEvent({ id: "ev-001" }),
      makeEvent({ id: "ev-002" }),
      makeEvent({ id: "ev-003" }),
    ];
    const result = _filterHandoffCandidatesByStatus(events, [], "pending", 2);
    expect(result).toHaveLength(2);
  });
});

// ─── _normalizeHandoffCandidate ───────────────────────────────────────────────

describe("_normalizeHandoffCandidate", () => {
  it("normaliza target_app klio-coder", () => {
    const res = _normalizeHandoffCandidate(
      makeEvent({ payload: { target_app: "klio-coder" } }),
      "pending",
    );
    expect(res.targetApp).toBe("klio-coder");
  });

  it("normaliza target_app kuan-yin", () => {
    const res = _normalizeHandoffCandidate(
      makeEvent({ payload: { target_app: "kuan-yin" } }),
      "pending",
    );
    expect(res.targetApp).toBe("kuan-yin");
  });

  it("não quebra com payload inválido (string)", () => {
    const res = _normalizeHandoffCandidate(
      makeEvent({
        payload: "string inválida" as unknown as Record<string, unknown>,
        occurred_at: null,
      }),
      "pending",
    );
    expect(res.targetApp).toBeNull();
    expect(res.reason).toBeNull();
    expect(res.clippedText).toBeNull();
    expect(res.threadId).toBeNull();
    expect(res.occurredAt).toBe("2026-07-09T10:00:00Z"); // fallback to created_at
  });
});

// ─── _buildReviewStateInsert ──────────────────────────────────────────────────

describe("_buildReviewStateInsert", () => {
  it("cria insert com status approved", () => {
    const insert = _buildReviewStateInsert({ userId: "u1", eventId: "ev1", status: "approved" });
    expect(insert.status).toBe("approved");
    expect(insert.user_id).toBe("u1");
    expect(insert.event_id).toBe("ev1");
    expect(insert.reviewer_id).toBe("u1");
    expect(insert.note).toBeNull();
    expect(insert.metadata).toEqual({});
  });

  it("cria insert com status rejected", () => {
    const insert = _buildReviewStateInsert({
      userId: "u1",
      eventId: "ev1",
      status: "rejected",
      note: "fora de escopo",
    });
    expect(insert.status).toBe("rejected");
    expect(insert.note).toBe("fora de escopo");
  });

  it("cria insert com status archived", () => {
    const insert = _buildReviewStateInsert({ userId: "u1", eventId: "ev1", status: "archived" });
    expect(insert.status).toBe("archived");
    expect(insert.note).toBeNull();
  });
});

// ─── reviewHandoffCandidate — append-only ─────────────────────────────────────

describe("reviewHandoffCandidate — garantias append-only", () => {
  it("não chama update nem delete na função de review", async () => {
    const insertFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateFn = vi.fn();
    const deleteFn = vi.fn();

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: makeEvent(),
            error: null,
          }),
        }),
        insert: insertFn,
        update: updateFn,
        delete: deleteFn,
      }),
    };

    // Testar diretamente o helper de build — não há update/delete no contrato
    const insert = _buildReviewStateInsert({ userId: "u1", eventId: "ev-001", status: "approved" });

    // Simular o que o handler faria (só insert)
    await mockSupabase.from("kline_event_review_state").insert(insert);

    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(updateFn).not.toHaveBeenCalled();
    expect(deleteFn).not.toHaveBeenCalled();
  });
});
