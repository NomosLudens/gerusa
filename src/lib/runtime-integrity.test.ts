import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_TOTAL_BYTES, validateAttachmentTotal } from "./attachment-limits";
import { assertValidDateRange } from "./agenda-validation";
import { APP_REGISTRY } from "./app-registry";
import { canAccessApp, type AuthzUser } from "./use-authz";

const kallistisUser: AuthzUser = {
  role: "user",
  assignedFacet: "kallistis",
  isAdmin: false,
  isMaster: false,
  allowedFacets: ["kallistis"],
};
const kallistisAdmin: AuthzUser = { ...kallistisUser, role: "admin", isAdmin: true };
const readySource = readFileSync(
  fileURLToPath(new URL("../routes/api/public/ready.ts", import.meta.url)),
  "utf8",
);

describe("runtime integrity guards", () => {
  it("permite Kallistis Presente para usuário comum e admin com faceta Kallistis", () => {
    const app = APP_REGISTRY.find((item) => item.id === "kallistis-presente");
    expect(app).toBeTruthy();
    expect(canAccessApp(kallistisUser, app!)).toBe(true);
    expect(canAccessApp(kallistisAdmin, app!)).toBe(true);
  });

  it("bloqueia Kallistis Presente quando a faceta permitida não está presente", () => {
    const app = APP_REGISTRY.find((item) => item.id === "kallistis-presente");
    expect(canAccessApp({ ...kallistisUser, allowedFacets: [] }, app!)).toBe(false);
  });

  it("recusa anexos acima de 8 MB no total da mensagem", () => {
    const result = validateAttachmentTotal([{ size: MAX_ATTACHMENT_TOTAL_BYTES + 1 }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("8 MB");
  });

  it("aceita evento com fim posterior ao início", () => {
    expect(() =>
      assertValidDateRange("2026-07-11T10:00:00.000Z", "2026-07-11T11:00:00.000Z"),
    ).not.toThrow();
  });

  it("recusa fim anterior ao início na agenda", () => {
    expect(() =>
      assertValidDateRange("2026-07-11T10:00:00.000Z", "2026-07-11T09:00:00.000Z"),
    ).toThrow(/posterior/);
  });

  it("recusa fim igual ao início na agenda", () => {
    expect(() =>
      assertValidDateRange("2026-07-11T10:00:00.000Z", "2026-07-11T10:00:00.000Z"),
    ).toThrow(/posterior/);
  });

  it("recusa intervalo de listagem invertido", () => {
    expect(() =>
      assertValidDateRange(
        "2026-07-11T10:00:00.000Z",
        "2026-07-11T09:00:00.000Z",
        "intervalo de listagem",
      ),
    ).toThrow(/intervalo de listagem/);
  });

  it("mantém readiness no PostgreSQL operacional sem legado Supabase", () => {
    expect(readySource).toContain("checkPostgres");
    expect(readySource).toContain("public.users");
    expect(readySource).toContain("openrouter_config");
    expect(readySource).not.toContain("SUPABASE");
    expect(readySource).not.toContain("kallistis_schema_migrations");
  });
});
