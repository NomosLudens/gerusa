import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, rateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit then blocks within the window", () => {
    const key = `test:${Math.random()}`;
    // limite 3 / 60s
    expect(checkRateLimit(key, 3, 60).ok).toBe(true);
    expect(checkRateLimit(key, 3, 60).ok).toBe(true);
    expect(checkRateLimit(key, 3, 60).ok).toBe(true);
    const blocked = checkRateLimit(key, 3, 60);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("decrements remaining on each allowed call", () => {
    const key = `test:${Math.random()}`;
    const first = checkRateLimit(key, 5, 60);
    const second = checkRateLimit(key, 5, 60);
    expect(first.ok && first.remaining).toBe(4);
    expect(second.ok && second.remaining).toBe(3);
  });

  it("resets after the window elapses", () => {
    const key = `test:${Math.random()}`;
    checkRateLimit(key, 1, 60);
    expect(checkRateLimit(key, 1, 60).ok).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit(key, 1, 60).ok).toBe(true);
  });

  it("isolates buckets by key", () => {
    const a = `test:a:${Math.random()}`;
    const b = `test:b:${Math.random()}`;
    checkRateLimit(a, 1, 60);
    expect(checkRateLimit(a, 1, 60).ok).toBe(false);
    expect(checkRateLimit(b, 1, 60).ok).toBe(true);
  });
});

describe("rateLimit (HTTP wrapper)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null while under the limit", () => {
    const userId = `u:${Math.random()}`;
    expect(rateLimit(userId, "chat", 2, 60)).toBeNull();
    expect(rateLimit(userId, "chat", 2, 60)).toBeNull();
  });

  it("returns a 429 Response with retry-after once exceeded", () => {
    const userId = `u:${Math.random()}`;
    rateLimit(userId, "chat", 1, 60);
    const res = rateLimit(userId, "chat", 1, 60);
    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(429);
    expect(res?.headers.get("retry-after")).toBeTruthy();
  });

  it("scopes limits per feature for the same user", () => {
    const userId = `u:${Math.random()}`;
    rateLimit(userId, "chat", 1, 60);
    expect(rateLimit(userId, "chat", 1, 60)).toBeInstanceOf(Response);
    // feature diferente → balde independente
    expect(rateLimit(userId, "tts", 1, 60)).toBeNull();
  });
});
