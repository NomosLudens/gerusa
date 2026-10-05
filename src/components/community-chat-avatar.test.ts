import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("avatar do Chat Geral", () => {
  const source = readFileSync(new URL("./CommunityChatView.tsx", import.meta.url), "utf8");

  it("renderiza a arte da KALLISTIS e avatar autenticado humano", () => {
    expect(source).toContain('import { kallistisAvatar } from "@/lib/brand-assets";');
    expect(source).toContain("src={kallistisAvatar.url}");
    expect(source).toContain('alt="Avatar da KALLISTIS"');
    expect(source).toContain('import { ProfileAvatar } from "@/components/ProfileAvatar";');
    expect(source).toContain("<ProfileAvatar");
  });
});
