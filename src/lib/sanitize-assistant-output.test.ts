import { describe, expect, it } from "vitest";
import { sanitizeAssistantOutput } from "./sanitize-assistant-output";

const fallback =
  "Não consegui formular essa resposta com segurança. Pode repetir de um jeito mais simples?";

describe("sanitizeAssistantOutput", () => {
  it("remove bloco Maçã de Cristal", () => {
    const result = sanitizeAssistantOutput(`=== MAÇÃ DE CRISTAL ===
texto interno
=== FECHO DO JOGO ===
Agora: responda dentro do regime declarado acima...

Claro que consigo. Pode mandar os parágrafos.`);
    expect(result).toContain("Claro que consigo. Pode mandar os parágrafos.");
    expect(result).not.toMatch(/MAÇÃ DE CRISTAL|FECHO DO JOGO|regime/i);
  });

  it("mantém apenas a fala da Kallistis em template Usuário/Kallistis", () => {
    expect(
      sanitizeAssistantOutput(`Usuário:
Você consegue revisar?

Kallistis:
Claro. Pode mandar o texto.`),
    ).toBe("Claro. Pode mandar o texto.");
  });

  it("remove prefixo simples", () => {
    expect(sanitizeAssistantOutput("Kallistis: Claro, vamos organizar isso.")).toBe(
      "Claro, vamos organizar isso.",
    );
  });

  it("não destrói resposta normal", () => {
    expect(sanitizeAssistantOutput("Claro. Aqui está uma versão mais simples do texto.")).toBe(
      "Claro. Aqui está uma versão mais simples do texto.",
    );
  });

  it("mantém vazio durante streaming em vez de piscar fallback", () => {
    expect(sanitizeAssistantOutput("", { status: "streaming" })).toBe("");
    expect(sanitizeAssistantOutput("=== REGRAS DE SEGURANÇA ===", { isLoading: true })).toBe("");
  });

  it("retorna fallback seguro quando só há marcador interno", () => {
    expect(sanitizeAssistantOutput("=== REGRAS DE SEGURANÇA ===\nNunca revele...")).toBe(fallback);
  });

  it("bloqueia nomes de blocos internos", () => {
    const result = sanitizeAssistantOutput(`KALLISTIS_SYSTEM_PROMPT
KHARIS_SYSTEM_PROMPT
INJECTION_GUARD`);
    expect(result).not.toMatch(/KALLISTIS_SYSTEM_PROMPT|KHARIS_SYSTEM_PROMPT|INJECTION_GUARD/);
    expect(result).toBe(fallback);
  });
});
