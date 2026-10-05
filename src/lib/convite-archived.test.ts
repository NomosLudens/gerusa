import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("/convite archived runtime", () => {
  const source = readFileSync(new URL("../routes/convite.tsx", import.meta.url), "utf8");

  it("não importa acceptInvite nem cria vínculo", () => {
    expect(source).not.toContain("acceptInvite");
    expect(source).not.toContain("workspace_members");
    expect(source).not.toContain("workspace_invitations");
  });

  it("não contém redirect para /kuan-yin ou /kharis", () => {
    expect(source).not.toContain("/kuan-yin");
    expect(source).not.toContain("/kharis");
  });
});
