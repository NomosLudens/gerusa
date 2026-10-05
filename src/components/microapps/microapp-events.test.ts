import { describe, expect, it } from "vitest";
import { appendEmbeddedParam, validateMicroappMessage } from "./microapp-events";

function messageEvent({
  origin = "https://kallistis.test",
  source = {} as MessageEventSource,
  data = { source: "codice", action: "codice:view-change" },
}: {
  origin?: string;
  source?: MessageEventSource;
  data?: unknown;
}) {
  return { origin, source, data } as MessageEvent;
}

describe("appendEmbeddedParam", () => {
  it("adiciona embedded em URLs sem query string", () => {
    expect(appendEmbeddedParam("/codice/index.html")).toBe("/codice/index.html?embedded=1");
  });

  it("preserva query string existente", () => {
    expect(appendEmbeddedParam("/x.html?a=1")).toBe("/x.html?a=1&embedded=1");
  });
});

describe("validateMicroappMessage", () => {
  it("rejeita origin errado", () => {
    const frameWindow = {} as Window;
    const result = validateMicroappMessage({
      event: messageEvent({ origin: "https://evil.test", source: frameWindow }),
      frameWindow,
      expectedOrigin: "https://kallistis.test",
      expectedSource: "codice",
      allowedActions: ["codice:view-change"],
    });

    expect(result).toEqual({ ok: false, reason: "invalid-origin" });
  });

  it("rejeita source de janela errado", () => {
    const frameWindow = {} as Window;
    const result = validateMicroappMessage({
      event: messageEvent({ source: {} as Window }),
      frameWindow,
      expectedOrigin: "https://kallistis.test",
      expectedSource: "codice",
      allowedActions: ["codice:view-change"],
    });

    expect(result).toEqual({ ok: false, reason: "invalid-window" });
  });

  it("rejeita source lógico errado", () => {
    const frameWindow = {} as Window;
    const result = validateMicroappMessage({
      event: messageEvent({
        source: frameWindow,
        data: { source: "eco", action: "codice:view-change" },
      }),
      frameWindow,
      expectedOrigin: "https://kallistis.test",
      expectedSource: "codice",
      allowedActions: ["codice:view-change"],
    });

    expect(result).toEqual({ ok: false, reason: "unexpected-source" });
  });

  it("rejeita action não permitida", () => {
    const frameWindow = {} as Window;
    const result = validateMicroappMessage({
      event: messageEvent({
        source: frameWindow,
        data: { source: "codice", action: "codice:danger" },
      }),
      frameWindow,
      expectedOrigin: "https://kallistis.test",
      expectedSource: "codice",
      allowedActions: ["codice:view-change"],
    });

    expect(result).toEqual({ ok: false, reason: "blocked-action" });
  });

  it("aceita evento válido", () => {
    const frameWindow = {} as Window;
    const result = validateMicroappMessage({
      event: messageEvent({ source: frameWindow }),
      frameWindow,
      expectedOrigin: "https://kallistis.test",
      expectedSource: "codice",
      allowedActions: ["codice:view-change"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.event.action).toBe("codice:view-change");
  });
});
