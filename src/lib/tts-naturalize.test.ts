import { describe, expect, it } from "vitest";
import { prepareTextForSpeech, splitSpeechChunks } from "./tts-naturalize";

describe("prepareTextForSpeech", () => {
  it("remove markdown titles and lists", () => {
    const input = `## Claro, Antonio

Podemos fazer em **tres etapas**:
- Primeiro, revisar.
- Depois, testar.`;
    const result = prepareTextForSpeech(input);
    expect(result).not.toContain("##");
    expect(result).not.toContain("**");
    expect(result).not.toContain("- Primeiro");
    expect(result).toContain("Claro, Antonio");
    expect(result).toContain("tres etapas");
    expect(result).toContain("Primeiro, revisar.");
    expect(result).toContain("Depois, testar.");
  });

  it("replace brand marks correctly", () => {
    const input = "K∧LINE, Kuan-Yin e Klio estao no app.";
    const result = prepareTextForSpeech(input);
    expect(result).toBe("Kallistis, Kuan Yin e Clio estao no app.");
  });

  it("convert common values", () => {
    const result = prepareTextForSpeech("O valor e R$ 150. A reuniao e 24/10 as 10h30.");
    expect(result).toContain("cento e cinquenta reais");
    expect(result).toContain("vinte e quatro de outubro");
    expect(result).toContain("dez e meia");
  });

  it("does not read code blocks, tables or heavy URLs literally", () => {
    const input = `Veja:
| Campo | Valor |
| --- | --- |
| id | abc |
https://example.com/um/caminho/muito/grande
\`\`\`ts
const x = 1
\`\`\``;
    const result = prepareTextForSpeech(input);
    expect(result).not.toContain("const x");
    expect(result).not.toContain("| Campo");
    expect(result).not.toContain("https://");
    expect(result).toContain("link na tela");
    expect(result).toContain("bloco tecnico");
  });

  it("applies different speech profiles without losing content", () => {
    const input = "Consequentemente, a operacionalizacao metacognitiva pode utilizar outro passo.";
    const kallistis = prepareTextForSpeech(input, { profile: "kallistis" });
    const klio = prepareTextForSpeech(input, { profile: "klio" });
    const kharis = prepareTextForSpeech(input, { profile: "kharis" });

    expect(klio).toContain("entao");
    expect(klio).toContain("organizacao");
    expect(kharis).toContain("usar");
    expect(kallistis.length).toBeGreaterThan(20);
  });

  it("breaks long compound sentences into shorter ones for klio", () => {
    const input =
      "Primeiro precisamos organizar os documentos importantes da familia porque o prazo esta chegando logo.";
    const result = prepareTextForSpeech(input, { profile: "klio" });
    const sentenceCount = (result.match(/\./g) || []).length;
    expect(sentenceCount).toBeGreaterThan(1);
    expect(result.toLowerCase()).not.toMatch(/\bporque\b/);
  });

  it("leaves short klio sentences untouched", () => {
    const input = "Vamos ler juntos agora.";
    const result = prepareTextForSpeech(input, { profile: "klio" });
    expect(result).toBe("Vamos ler juntos agora.");
  });
});

describe("splitSpeechChunks", () => {
  it("splits long text into bounded chunks", () => {
    const text =
      "Frase um. Frase dois. Frase tres. Frase quatro. Frase cinco. Frase seis. Frase sete. Frase oito. Frase nove. Frase dez.";
    const chunks = splitSpeechChunks(text, 50, { minChars: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(50);
  });

  it("joins tiny phrases into a more natural chunk", () => {
    const chunks = splitSpeechChunks("Sim. Vamos. Primeiro, leia.", 120, {
      profile: "kallistis",
      minChars: 80,
    });
    expect(chunks).toEqual(["Sim. Vamos. Primeiro, leia."]);
  });

  it("handles empty text", () => {
    expect(splitSpeechChunks("")).toEqual([]);
  });
});
