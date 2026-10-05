import { describe, expect, it } from "vitest";
import { verifyChatResponseStructure } from "./chat-response-structure";

describe("verifyChatResponseStructure", () => {
  it("allows benign responses for all facets", () => {
    expect(
      verifyChatResponseStructure(
        "kallistis",
        "Claro. Posso te ajudar a organizar isso em passos.",
      ),
    ).toEqual([]);
    expect(
      verifyChatResponseStructure(
        "kharis",
        "Vamos simplificar: primeiro respira, depois escolhe uma tarefa pequena.",
      ),
    ).toEqual([]);
  });

  it("flags Kallistis false execution claims", () => {
    const signals = verifyChatResponseStructure(
      "kallistis",
      "Já plantei isso no Jardim e enviei para revisão.",
    );
    expect(signals.some((s) => s.category === "falsa_execucao")).toBe(true);
  });

  it("flags Kháris diagnosis claims", () => {
    const signals = verifyChatResponseStructure("kharis", "Você tem TDAH, esse é o diagnóstico.");
    expect(signals.some((s) => s.category === "diagnostico_indevido")).toBe(true);
  });
});
