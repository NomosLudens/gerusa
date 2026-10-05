import { describe, expect, it, vi } from "vitest";
import {
  distributedChatRateLimit,
  distributedPreAuthChatRateLimit,
  type ChatRateLimitBinding,
} from "./rate-limit";

function requestWithBinding(binding?: ChatRateLimitBinding) {
  const request = new Request("https://example.com/api/chat");
  if (binding) {
    Object.defineProperty(request, "__cfChatRateLimiter", { value: binding });
    Object.defineProperty(request, "__cfPreAuthChatRateLimiter", { value: binding });
  }
  Object.defineProperty(request, "__requestId", { value: "req-rate" });
  return request;
}

describe("distributed chat rate limit", () => {
  it("usa o binding compartilhado com chave por usuário e operação", async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    const response = await distributedChatRateLimit(requestWithBinding({ limit }), "user-1");

    expect(response).toBeNull();
    expect(limit).toHaveBeenCalledWith({ key: "chat:user-1" });
  });

  it("retorna 429 com Retry-After quando o binding bloqueia", async () => {
    const response = await distributedChatRateLimit(
      requestWithBinding({ limit: vi.fn().mockResolvedValue({ success: false }) }),
      "user-1",
    );

    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("60");
  });

  it("usa o limitador em memória quando o runtime Node não injeta binding", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await distributedChatRateLimit(requestWithBinding(), `node-${Math.random()}`);

    expect(response).toBeNull();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("retorna 503, em vez de 500, quando o binding falha", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await distributedChatRateLimit(
      requestWithBinding({ limit: vi.fn().mockRejectedValue(new Error("capacity unavailable")) }),
      "user-1",
    );

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({ error: "rate_limit_unavailable" });
    log.mockRestore();
  });

  it("contém tentativas pré-auth no binding distribuído antes do Supabase", async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const request = requestWithBinding({ limit });
    request.headers.set("cf-connecting-ip", "203.0.113.7");
    const response = await distributedPreAuthChatRateLimit(request);

    expect(limit).toHaveBeenCalledWith({ key: "chat-preauth:203.0.113.7" });
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("60");
  });

  it("usa memória sem binding, mas mantém 503 quando binding não recebe IP", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fallback = await distributedPreAuthChatRateLimit(requestWithBinding());
    expect(fallback).toBeNull();
    const missingIp = requestWithBinding({ limit: vi.fn() });
    await expect(distributedPreAuthChatRateLimit(missingIp)).resolves.toMatchObject({
      status: 503,
    });
    log.mockRestore();
  });
});
