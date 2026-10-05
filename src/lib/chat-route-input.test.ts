import { beforeEach, describe, expect, it, vi } from "vitest";

const { threadResult } = vi.hoisted(() => {
  const result = {
    value: {
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        user_id: "user-2",
        facet: "kallistis",
        surface: "kallistis",
      },
      error: null,
    },
  };
  return {
    threadResult: result,
  };
});

vi.mock("@/lib/require-user.server", () => ({
  requireUser: vi.fn(async () => ({ userId: "user-1" })),
}));
vi.mock("@/server/local-core/chat-runtime", () => ({
  createLocalChatRuntime: vi.fn(() => ({
    chat: {
      getThreadById: vi.fn(async () => {
        const value = threadResult.value.data;
        return value
          ? {
              id: value.id,
              userId: value.user_id,
              facet: value.facet,
              surface: value.surface ?? "kallistis",
              title: null,
              createdAt: "",
              lastSedimentadoAt: null,
            }
          : null;
      }),
    },
    memory: { listMemories: vi.fn(async () => []), listSediments: vi.fn(async () => []) },
    sedimentation: {},
    close: vi.fn(),
    databaseUrl: "postgresql://test",
  })),
}));

import { MAX_CHAT_REQUEST_BYTES } from "./chat-request-contract";
import type { ChatRateLimitBinding } from "./rate-limit";
import { handleChatRoute } from "../routes/api/chat";

function authenticatedRequest(
  body: string,
  binding: ChatRateLimitBinding = { limit: vi.fn().mockResolvedValue({ success: true }) },
  headers: Record<string, string> = {},
) {
  const request = new Request("https://example.com/api/chat", {
    method: "POST",
    headers: {
      cookie: "kallistis_session=test-token",
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.7",
      ...headers,
    },
    body,
  });
  Object.defineProperty(request, "__cfChatRateLimiter", { value: binding });
  Object.defineProperty(request, "__cfPreAuthChatRateLimiter", { value: binding });
  Object.defineProperty(request, "__requestId", { value: "req-input" });
  return request;
}

describe("/api/chat input responses", () => {
  beforeEach(() => {
    process.env.KALLISTIS_DATABASE_URL = "postgresql://localhost/kallistis_test";
  });

  it("retorna 400 para payload estruturalmente inválido", async () => {
    const response = await handleChatRoute(authenticatedRequest("{}"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "chat_bad_request",
      stage: "validation",
    });
  });

  it("retorna 413 antes de ler payload declarado acima do limite", async () => {
    const response = await handleChatRoute(
      authenticatedRequest("{}", undefined, {
        "content-length": String(MAX_CHAT_REQUEST_BYTES + 1),
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: "payload_too_large" });
  });

  it("retorna 429 antes de validar ou chamar provider", async () => {
    const response = await handleChatRoute(
      authenticatedRequest("{}", { limit: vi.fn().mockResolvedValue({ success: false }) }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
  });

  it("retorna 403 quando a thread encontrada não pertence ao usuário", async () => {
    threadResult.value = {
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        user_id: "user-2",
        facet: "kallistis",
        surface: "kallistis",
      },
      error: null,
    };
    const response = await handleChatRoute(
      authenticatedRequest(
        JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          messages: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              role: "user",
              parts: [{ type: "text", text: "Olá" }],
            },
          ],
          assistantMessageId: "33333333-3333-4333-8333-333333333333",
        }),
      ),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "forbidden" });
  });
});
