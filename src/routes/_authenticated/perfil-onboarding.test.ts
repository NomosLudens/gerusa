import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./perfil.tsx", import.meta.url), "utf8");
const hook = readFileSync(new URL("../../lib/use-profile.ts", import.meta.url), "utf8");

describe("onboarding visual do Perfil", () => {
  it("renderiza o bloco obrigatório sem permitir que o jogador escolha a Mesa", () => {
    expect(page).toContain("Bem-vindo ao KALLISTIS");
    expect(page).toContain("Suas Mesas são atribuídas pelo Mestre");
    expect(page).not.toContain('id="mesa"');
    expect(page).toContain("Entrar no KALLISTIS");
  });
  it("mantém as seis opções de tratamento e exige custom para outro", () => {
    for (const value of ["ele_dele", "ela_dela", "elu_delu", "use_name", "not_informed", "other"])
      expect(page).toContain(`value="${value}"`);
    expect(page).toContain('treatmentType === "other" && !treatmentCustom.trim()');
    expect(page).toContain('treatmentType === "other" ? treatmentCustom.trim() : null');
  });
  it("submete somente pelo saveOnboarding e reapresenta o estado persistido", () => {
    expect(page).toContain("saveOnboarding({");
    expect(page).toContain("onboarding.general_community");
    expect(page).toContain("onboarding?.onboarding_completed");
    expect(hook).toContain('fetch("/api/profile"');
  });
  it("preserva o perfil existente e não marca sucesso em erro", () => {
    expect(page).toContain("saveProfile({");
    expect(page).toContain(
      'toast.error(err instanceof Error ? err.message : "Falha ao salvar entrada")',
    );
  });
  it("identifica a identidade global como TAL", () => {
    expect(page).toContain("Como Mestre TAL, você tem acesso a todas as Mesas.");
    expect(page).toContain("Mestre TAL: escopo de todas as Mesas.");
    expect(page).not.toContain("Mestre RAAR");
  });
});
