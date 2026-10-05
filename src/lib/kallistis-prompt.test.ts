import { describe, expect, it } from "vitest";
import { buildKallistisSystemPrompt } from "./kallistis-prompt";
import { resolveIdentityRoute } from "./identity-routing";

describe("composição do prompt da Kallistis", () => {
  it("preserva a identidade confirmada e a identidade única KALLISTIS", () => {
    const prompt = buildKallistisSystemPrompt("=== IDENTIDADE-TESTE-155 ===");
    expect(prompt).toContain("IDENTIDADE-TESTE-155");
    expect(prompt).toContain("Você é KALLISTIS, a única identidade conversacional do produto");
  });

  it("usa a superfície Geral sem expor modos históricos", () => {
    const prompt = buildKallistisSystemPrompt("", resolveIdentityRoute({ userId: "user" }));
    expect(prompt).toContain("superficie=GENERAL");
    expect(prompt).toContain("sala Geral compartilhada");
    expect(prompt).not.toContain("modo=");
    expect(prompt).not.toContain("roleplay_ativo=");
    expect(prompt).not.toContain("voz=PERSONAGEM");
  });

  it("usa a superfície de personagem e mantém os pronomes", () => {
    const prompt = buildKallistisSystemPrompt(
      "",
      resolveIdentityRoute({
        userId: "user",
        profileId: "user",
        profilePronouns: "ele/dele",
        surface: "CHARACTER",
      }),
    );
    expect(prompt).toContain("superficie=CHARACTER");
    expect(prompt).toContain("pronomes=ele/dele");
    expect(prompt).toContain("superfície privada do personagem");
  });

  it("usa a superfície de Mestre sem depender de responseMode", () => {
    const prompt = buildKallistisSystemPrompt(
      "",
      resolveIdentityRoute({ userId: "master", surface: "MASTER" }),
    );
    expect(prompt).toContain("superficie=MASTER");
    expect(prompt).toContain("superfície privada do Mestre");
    expect(prompt).toContain("planejamento");
    expect(prompt).not.toContain("modo=");
  });

  it("não aceita modos históricos como parte do contrato da rota", () => {
    const route = resolveIdentityRoute({ userId: "user" });
    const prompt = buildKallistisSystemPrompt("", route);
    expect(route).not.toHaveProperty("responseMode");
    expect(route).not.toHaveProperty("playerExperience");
    expect(prompt).not.toContain("modo=");
    expect(prompt).not.toContain("experiencia_jogador=");
  });
});
