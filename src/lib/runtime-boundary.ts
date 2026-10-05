export type RuntimeBoundaryInput = {
  facet?: string | null;
  surface?: string | null;
  mode?: string | null;
  latestUserText?: string | null;
};

export type RuntimeBoundaryDecision =
  | {
      blocked: false;
      runtimeFacet: "kallistis";
      note?: string;
    }
  | {
      blocked: true;
      targetApp: "klio-coder" | "kuan-yin";
      reason: "coding_scope" | "commercial_scope" | "legacy_klio_scope";
      message: string;
    };

export function resolveRuntimeBoundary(input: RuntimeBoundaryInput): RuntimeBoundaryDecision {
  const { facet, surface, mode, latestUserText } = input;

  // 1. Escopo comercial
  if (facet === "kuanyin" || surface === "kuanyin" || mode === "commercial") {
    return {
      blocked: true,
      targetApp: "kuan-yin",
      reason: "commercial_scope",
      message:
        "Kuan-Yin não está disponível na Kallistis Clean. Esse escopo será reconstruído em app separado.",
    };
  }

  // 2. Escopo Klio legado
  if (surface === "klio" || mode === "pedagogical") {
    return {
      blocked: true,
      targetApp: "klio-coder",
      reason: "legacy_klio_scope",
      message:
        "Klio não está disponível na Kallistis Clean. Esse escopo será atendido em app separado.",
    };
  }

  // 3. Escopo de programação/código
  // Não bloquear "app" sozinha. Usamos \b para garantir palavras inteiras e evitar falsos positivos
  if (latestUserText) {
    const lowerText = latestUserText.toLowerCase();
    const codingIntentRegex =
      /\b(codar|programar|programação|implementar|implemente|escrever código|escreva código|criar uma função|crie uma função|corrigir bug|corrija o bug|fazer debug|depurar|debugar|pull request|commit|branch|endpoint|migration|migração|schema|supabase|cloudflare worker|typescript|javascript|react|vite|build|lint)\b/i;
    const codingRequestRegex =
      /\b(ajuda com|problema com|erro em|bug em|analise|analise este|analisar|revisar|revise|corrija|corrigir|implemente|implementar|escreva|escrever|crie|criar|refatore|refatorar|edite|editar|configure|configurar)\b[\s\S]{0,100}\b(código|código-fonte|função|bug|debug|repo|repositório|pull request|typescript|javascript|react|vite|build|lint)\b/i;

    if (codingIntentRegex.test(lowerText) || codingRequestRegex.test(lowerText)) {
      return {
        blocked: true,
        targetApp: "klio-coder",
        reason: "coding_scope",
        message:
          "A Kallistis Clean não escreve código. Esse escopo será atendido em app separado: Klio.",
      };
    }
  }

  // 4. Kháris
  if (facet === "kharis" || surface === "kharis") {
    return {
      blocked: false,
      runtimeFacet: "kallistis",
      note: "Kháris foi incorporada à Kallistis como cuidado, presença e orientação simples.",
    };
  }

  // 5. Padrão
  return {
    blocked: false,
    runtimeFacet: "kallistis",
  };
}
