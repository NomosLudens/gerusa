import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("controle de remocao da Agenda", () => {
  it("usa delegacao no conteiner reconstruido da lista", () => {
    const html = readFileSync(
      new URL("../../public/microapps/agenda/index.html", import.meta.url),
      "utf8",
    );
    expect(html).toContain('dia-lista").onclick = function (event)');
    expect(html).toContain('target.closest("[data-edit], [data-del]")');
    expect(html).toContain('emit("agenda:evento-deletar", { id: id })');
  });
});
