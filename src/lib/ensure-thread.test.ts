import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  fetch: vi.fn(),
}));

vi.mock("@/lib/local-auth-client", () => ({
  getLocalSession: vi.fn(async () => (state.user ? { user: state.user } : null)),
}));

import { createNewThread, ensureThread } from "./ensure-thread";

describe("ensureThread", () => {
  beforeEach(() => {
    state.user = { id: "user-1" };
    state.fetch.mockReset();
    vi.stubGlobal("fetch", state.fetch);
  });

  it("cria ou reutiliza a thread pelo endpoint PostgreSQL local", async () => {
    state.fetch.mockResolvedValue(
      new Response(JSON.stringify({ thread: { id: "thread-1" } }), { status: 201 }),
    );
    await expect(ensureThread()).resolves.toBe("thread-1");
    expect(state.fetch).toHaveBeenCalledWith(
      "/api/chat/thread?scope=general",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });

  it("usa escopo privado para a criação", async () => {
    state.fetch.mockResolvedValue(
      new Response(JSON.stringify({ thread: { id: "creation-1" } }), { status: 201 }),
    );
    await expect(ensureThread("character_creation")).resolves.toBe("creation-1");
    expect(state.fetch).toHaveBeenCalledWith(
      "/api/chat/thread?scope=character_creation",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("abre uma thread nova quando a jornada pede uma conversa independente", async () => {
    state.fetch.mockResolvedValue(
      new Response(JSON.stringify({ thread: { id: "creation-2" } }), { status: 201 }),
    );
    await expect(createNewThread("character_creation")).resolves.toBe("creation-2");
    expect(state.fetch).toHaveBeenCalledWith(
      "/api/chat/thread?new=1&scope=character_creation",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });

  it("não tenta criar thread sem sessão local", async () => {
    state.user = null;
    await expect(ensureThread()).rejects.toThrow("não autenticado");
    expect(state.fetch).not.toHaveBeenCalled();
  });
});
