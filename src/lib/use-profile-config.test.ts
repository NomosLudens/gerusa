import { describe, expect, it } from "vitest";

import { hasSupabaseConfig } from "./use-profile";

describe("browser Supabase configuration guard", () => {
  it("does not consider the empty production runtime config usable", () => {
    expect(hasSupabaseConfig({})).toBe(false);
  });

  it("accepts a complete public runtime config", () => {
    expect(
      hasSupabaseConfig({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toBe(true);
  });
});
