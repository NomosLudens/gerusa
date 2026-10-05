import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contrato do bridge da Agenda", () => {
  it("usa a mesma origem nas respostas do host e no receiver HTML", () => {
    const host = readFileSync(new URL("./AgendaHost.tsx", import.meta.url), "utf8");
    const html = readFileSync(
      new URL("../../public/microapps/agenda/index.html", import.meta.url),
      "utf8",
    );
    const microappConfig = readFileSync(
      new URL("./microapps/microapp-events.ts", import.meta.url),
      "utf8",
    );
    expect(existsSync(new URL("../../public/agenda/index.html", import.meta.url))).toBe(false);
    expect(microappConfig).toContain(
      'src: "/microapps/agenda/index.html?delete-handler-v=20260902"',
    );
    expect(host).toContain('source: "kaline-host"');
    expect(host).not.toContain('source: "kallistis-host"');
    expect(html).toContain('msg.source !== "kaline-host"');
  });
});
