import { describe, expect, it } from "vitest";
import { KALLISTIS_ORIENTED_SYSTEM } from "./kallistis-oriented-assistant";

describe("contexto cultural da criação conversacional", () => {
  it("carrega as decisões culturais canônicas", () => {
    expect(KALLISTIS_ORIENTED_SYSTEM).toContain(
      "Entre os Draken, a sociedade é culturalmente agênero",
    );
    expect(KALLISTIS_ORIENTED_SYSTEM).toContain(
      "Uma personagem Draken Artífice agênero é compatível com sua cultura",
    );
    expect(KALLISTIS_ORIENTED_SYSTEM).toContain(
      "Nenhum novo lexema, pronome ou morfema de gênero foi criado",
    );
  });
});
