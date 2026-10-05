import { describe, expect, it } from "vitest";
import { hasExplicitKallistisMention } from "./community-chat";

describe("Chat Geral comunitário", () => {
  it("mantém KALLISTIS silenciosa sem menção explícita", () => {
    expect(hasExplicitKallistisMention("alguém vai jogar sábado?")).toBe(false);
    expect(hasExplicitKallistisMention("contato@kallistis.app")).toBe(false);
  });

  it("reconhece somente @kallistis", () => {
    expect(hasExplicitKallistisMention("@kallistis, como funciona o Forge?")).toBe(true);
    expect(hasExplicitKallistisMention("gente, @KALLISTIS sabe onde fica Nimaris?")).toBe(true);
  });
});
