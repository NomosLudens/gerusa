import { afterEach, describe, expect, it, vi } from "vitest";

import { readPresencaNota } from "./use-presenca-regime";

describe("chat presence note fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not initialize the legacy Supabase client when public config is empty", async () => {
    vi.stubGlobal("window", { __KALLISTIS_CONFIG__: {} });

    await expect(readPresencaNota()).resolves.toBe("");
  });
});
