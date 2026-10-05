import { describe, expect, it } from "vitest";
import {
  CANONICAL_IDENTITY_FILES,
  canonicalIdentityHashes,
  loadCanonicalIdentity,
  renderCanonicalCulturalContextBlock,
  renderCanonicalIdentityBlock,
} from "./canonical-identity.server";
import { resolveIdentityRoute } from "./identity-routing";
import { buildKallistisSystemPrompt } from "./kallistis-prompt";

describe("fronteira canônica do Hermes", () => {
  it("carrega os quatro documentos e expõe hashes diagnósticos", () => {
    const bundle = loadCanonicalIdentity({ refresh: true });
    expect(bundle.files.map((file) => file.name)).toEqual([...CANONICAL_IDENTITY_FILES]);
    expect(Object.keys(canonicalIdentityHashes(bundle))).toHaveLength(4);
    expect(renderCanonicalIdentityBlock(bundle)).toContain("KALLISTIS — Identidade Canônica");
  });

  it("expõe as decisões culturais aprovadas sem criar novas regras de Velarim", () => {
    const context = renderCanonicalCulturalContextBlock(loadCanonicalIdentity({ refresh: true }));
    expect(context).toContain("Entre os Draken, a sociedade é culturalmente agênero");
    expect(context).toContain(
      "Uma personagem Draken Artífice agênero é compatível com sua cultura",
    );
    expect(context).toContain(
      "`si` continua sendo pronome de terceira pessoa aplicável a ele, ela ou isso",
    );
    expect(context).toContain("Nenhum novo lexema, pronome ou morfema de gênero foi criado");
  });

  it("falha fechado quando a raiz canônica não existe", () => {
    expect(() => loadCanonicalIdentity({ root: "/definitely-missing-kallistis-canon" })).toThrow(
      "Arquivo canônico indisponível",
    );
  });

  it("monta Hermes como assistente do produto KALLISTIS", () => {
    const prompt = buildKallistisSystemPrompt();
    expect(prompt).toContain("Você é KALLISTIS, a única identidade conversacional do produto");
    expect(prompt).toContain("superficie=GENERAL");
    expect(prompt).not.toContain("Você é Kallistis, presença viva");
    expect(prompt).not.toContain("Sou Kallistis, a única identidade");
  });

  it("nega contexto de outro perfil e mantém roleplay desligado", () => {
    const route = resolveIdentityRoute({
      userId: "user-a",
      profileId: "user-b",
    });
    expect(route.allowedContext).toBe("DENIED_CROSS_PROFILE");
    expect(route).not.toHaveProperty("responseMode");
    expect(route).not.toHaveProperty("roleplayActive");
    expect(route.profilePronouns).toBeNull();
  });

  it("carrega pronomes declarados, normaliza espaços e trata ausência como UNKNOWN", () => {
    const route = resolveIdentityRoute({
      userId: "user-a",
      profileId: "user-a",
      profileLabel: "Tony",
      profilePronouns: "  ele/dele  ",
    });
    expect(route.profilePronouns).toBe("ele/dele");
    expect(buildKallistisSystemPrompt("", route)).toContain("pronomes=ele/dele");

    const withoutPronouns = resolveIdentityRoute({ userId: "user-b", profileId: "user-b" });
    expect(withoutPronouns.profilePronouns).toBeNull();
    expect(buildKallistisSystemPrompt("", withoutPronouns)).toContain("pronomes=UNKNOWN");
  });

  it("não deriva gênero nem tratamento a partir dos pronomes", () => {
    const route = resolveIdentityRoute({
      userId: "user-a",
      profileId: "user-a",
      profilePronouns: "ela/dela",
    });
    expect(route.profilePronouns).toBe("ela/dela");
    expect(route).not.toHaveProperty("gender");
    expect(route).not.toHaveProperty("treatmentType");
  });
});
