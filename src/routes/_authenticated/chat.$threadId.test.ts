/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = { user: { id: "user-1" } as { id: string } | null };

vi.mock("@/lib/local-auth-client", () => ({
  getLocalSession: vi.fn(async () => (mockState.user ? { user: mockState.user } : null)),
}));

vi.mock("@/components/ChatView", () => ({
  ChatView: () => null,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    redirect: vi.fn((opts) => {
      const err = new Error("Redirected");
      Object.assign(err, { redirectOpts: opts });
      throw err;
    }),
  };
});

import { Route } from "./chat.$threadId";
import { redirect } from "@tanstack/react-router";

describe("Route: /chat/$threadId loader", () => {
  const loader = Route.options.loader as any;

  beforeEach(() => {
    mockState.user = { id: "user-1" };
    vi.mocked(redirect).mockClear();
  });

  it("permite a entrada do chat com sessão local", async () => {
    await expect(loader!({ params: { threadId: "thread-1" } })).resolves.toBeUndefined();
  });

  it("redireciona para auth quando não há sessão local", async () => {
    mockState.user = null;
    await expect(loader!({ params: { threadId: "thread-1" } })).rejects.toThrow("Redirected");
    expect(redirect).toHaveBeenCalledWith({ to: "/auth" });
  });
});
