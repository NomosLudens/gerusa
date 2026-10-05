import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("upload de avatar do Perfil", () => {
  const source = readFileSync(new URL("./perfil.tsx", import.meta.url), "utf8");

  it("oferece upload real pelos formatos aceitos pelo servidor", () => {
    expect(source).toContain("uploadAvatar(file)");
    expect(source).toContain('accept="image/png,image/jpeg,image/webp"');
    expect(source).toContain('id="perfil-avatar"');
  });

  it("renderiza o avatar persistido sem depender da resposta binária direta", () => {
    expect(source).toContain('import { ProfileAvatar } from "@/components/ProfileAvatar";');
    expect(source).toContain("<ProfileAvatar");
  });
});
