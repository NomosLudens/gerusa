import { describe, expect, it } from "vitest";
import { hydratePlayer } from "./repository";

describe("hidratação do jogador no snapshot", () => {
  it("usa o display_name autenticado e o fallback canônico do produto", () => {
    const source = { nome: "Elara", jogador: "" };
    expect(hydratePlayer(source, "Tonyus Jogador")).toMatchObject({ jogador: "Tonyus Jogador" });
    expect(hydratePlayer(source, "")).toMatchObject({ jogador: "Jogador" });
    expect(source).toMatchObject({ jogador: "" });
  });
});
