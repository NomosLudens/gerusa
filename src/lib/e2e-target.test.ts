import { describe, expect, it } from "vitest";
import { validateAuthenticatedE2ETarget } from "./e2e-target";

describe("authenticated E2E target", () => {
  it("aceita somente a produção e o preview exato da conta Cloudflare configurada", () => {
    expect(validateAuthenticatedE2ETarget("https://kallistis.app")).toBe("https://kallistis.app");
    expect(
      validateAuthenticatedE2ETarget(
        "https://kallistis.kallistis-account.workers.dev",
        "kallistis-account",
      ),
    ).toBe("https://kallistis.kallistis-account.workers.dev");
    expect(
      validateAuthenticatedE2ETarget(
        "https://eef2c8be-kallistis.kallistis-account.workers.dev",
        "kallistis-account",
      ),
    ).toBe("https://eef2c8be-kallistis.kallistis-account.workers.dev");
    expect(
      validateAuthenticatedE2ETarget(
        "https://fix-final-integrity-closure-kallistis.kallistis-account.workers.dev",
        "kallistis-account",
      ),
    ).toBe("https://fix-final-integrity-closure-kallistis.kallistis-account.workers.dev");
  });

  it("rejeita protocolo, hosts parecidos, IPs, credenciais, portas e fragmentos", () => {
    for (const value of [
      "http://kallistis.app",
      "https://kallistis.app.evil.example",
      "https://127.0.0.1",
      "https://user:password@kallistis.app",
      "https://kallistis.app:8443",
      "https://kallistis.app#fragment",
      "https://preview.kallistis-account.workers.dev",
      "https://outro-projeto.kallistis-account.workers.dev",
      "https://evil-kallistis.kallistis-account.workers.dev.evil.example",
    ]) {
      expect(() => validateAuthenticatedE2ETarget(value, "kallistis-account"), value).toThrow();
    }
  });
});
