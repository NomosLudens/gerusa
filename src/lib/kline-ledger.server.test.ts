import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createBoundaryHandoffCandidate } from "./kline-ledger.server";

describe("kline-ledger.server", () => {
  let mockSupabase: { rpc: Mock; from: Mock; [key: string]: unknown };
  let mockRpc: Mock;

  beforeEach(() => {
    mockRpc = vi.fn().mockResolvedValue({ data: { event_id: "test-event-id" }, error: null });
    mockSupabase = {
      rpc: mockRpc,
      from: vi.fn(),
    };
  });

  it("1. cria evento handoff.candidate com target_app klio-coder", async () => {
    const res = await createBoundaryHandoffCandidate({
      supabase: mockSupabase as unknown as Parameters<
        typeof createBoundaryHandoffCandidate
      >[0]["supabase"],
      userId: "user-123",
      threadId: "thread-123",
      targetApp: "klio-coder",
      reason: "coding_scope",
      latestUserText: "me ajuda com esse código",
      boundaryMessage: "Blocked msg",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.eventId).toBe("test-event-id");
    }

    expect(mockRpc).toHaveBeenCalledWith(
      "create_handoff_candidate_atomic",
      expect.objectContaining({
        p_event_type: "handoff.candidate",
        p_source_app: "kallistis-clean",
        p_title: "Bloqueio de Runtime",
        p_body: "Blocked msg",
        p_payload: expect.objectContaining({
          target_app: "klio-coder",
          reason: "coding_scope",
          thread_id: "thread-123",
          clipped_text: "me ajuda com esse código",
        }),
      }),
    );
  });

  it("2. cria evento handoff.candidate com target_app kuan-yin", async () => {
    await createBoundaryHandoffCandidate({
      supabase: mockSupabase as unknown as Parameters<
        typeof createBoundaryHandoffCandidate
      >[0]["supabase"],
      userId: "user-123",
      threadId: "thread-123",
      targetApp: "kuan-yin",
      reason: "commercial_scope",
      latestUserText: "quero montar uma página",
      boundaryMessage: "Blocked msg",
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "create_handoff_candidate_atomic",
      expect.objectContaining({
        p_payload: expect.objectContaining({
          target_app: "kuan-yin",
          reason: "commercial_scope",
        }),
      }),
    );
  });

  it("3. invoca o RPC create_handoff_candidate_atomic para garantir a atomicidade", async () => {
    await createBoundaryHandoffCandidate({
      supabase: mockSupabase as unknown as Parameters<
        typeof createBoundaryHandoffCandidate
      >[0]["supabase"],
      userId: "user-123",
      threadId: "thread-123",
      targetApp: "klio-coder",
      reason: "coding_scope",
      latestUserText: "abc",
      boundaryMessage: "Blocked msg",
    });

    expect(mockRpc).toHaveBeenCalledWith("create_handoff_candidate_atomic", expect.any(Object));
  });

  it("4. inclui threadId como referência", async () => {
    await createBoundaryHandoffCandidate({
      supabase: mockSupabase as unknown as Parameters<
        typeof createBoundaryHandoffCandidate
      >[0]["supabase"],
      userId: "u1",
      threadId: "t-abc",
      targetApp: "klio-coder",
      reason: "coding_scope",
      latestUserText: "abc",
      boundaryMessage: "Blocked msg",
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "create_handoff_candidate_atomic",
      expect.objectContaining({
        p_payload: expect.objectContaining({
          thread_id: "t-abc",
        }),
      }),
    );
  });

  it("5. limita latestUserText longo", async () => {
    const longText = "a".repeat(2000);
    await createBoundaryHandoffCandidate({
      supabase: mockSupabase as unknown as Parameters<
        typeof createBoundaryHandoffCandidate
      >[0]["supabase"],
      userId: "u1",
      threadId: "t1",
      targetApp: "klio-coder",
      reason: "coding_scope",
      latestUserText: longText,
      boundaryMessage: "Blocked msg",
    });

    const calls = mockRpc.mock.calls;
    const rpcCallArgs = calls[0]?.[1] as { p_payload: { clipped_text: string } } | undefined;

    expect(rpcCallArgs).toBeDefined();
    expect(rpcCallArgs!.p_payload.clipped_text.length).toBeLessThanOrEqual(1203);
    expect(rpcCallArgs!.p_payload.clipped_text.endsWith("...")).toBe(true);
  });

  it("6. não lança erro se RPC falhar, retornando erro estruturado", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error("RPC Error") });

    const res = await createBoundaryHandoffCandidate({
      supabase: mockSupabase as unknown as Parameters<
        typeof createBoundaryHandoffCandidate
      >[0]["supabase"],
      userId: "u1",
      threadId: "t1",
      targetApp: "klio-coder",
      reason: "coding_scope",
      latestUserText: "abc",
      boundaryMessage: "Blocked msg",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("Failed to create handoff candidate atomically");
    }
  });

  it("7. não chama métodos manuais do Supabase do/from", async () => {
    await createBoundaryHandoffCandidate({
      supabase: mockSupabase as unknown as Parameters<
        typeof createBoundaryHandoffCandidate
      >[0]["supabase"],
      userId: "u1",
      targetApp: "klio-coder",
      reason: "coding_scope",
      latestUserText: "abc",
      boundaryMessage: "Blocked msg",
    });

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
