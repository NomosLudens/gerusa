import { describe, expect, it, vi } from "vitest";
import { createPollingController, DEFAULT_POLL_INTERVAL_MS } from "@/lib/use-polling";

describe("polling controller", () => {
  it("starts at the real interval, prevents overlap, and cleans up", async () => {
    vi.useFakeTimers();
    let calls = 0;
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const stop = createPollingController(async () => {
      calls += 1;
      await pending;
    }, DEFAULT_POLL_INTERVAL_MS);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(1);
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_INTERVAL_MS * 2);
    expect(calls).toBe(1);
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    stop();
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_INTERVAL_MS * 2);
    expect(calls).toBe(1);
    vi.useRealTimers();
  });
});
