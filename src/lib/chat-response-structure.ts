export type ChatFacet = "kallistis" | "kharis";
export type ChatResponseSignal = {
  category: string;
  severity: "block" | "warn";
  note: string;
  excerpt: string;
};

export function normalizeChatResponseText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

const norm = (s: string) =>
  normalizeChatResponseText(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

function signal(category: string, severity: "block" | "warn", note: string, text: string) {
  return { category, severity, note, excerpt: normalizeChatResponseText(text).slice(0, 180) };
}

export function verifyChatResponseStructure(facet: ChatFacet, text: string): ChatResponseSignal[] {
  const clean = normalizeChatResponseText(text);
  if (clean.length < 8) return [];
  const t = norm(clean);
  const signals: ChatResponseSignal[] = [];

  if (
    /\b(system prompt|prompt interno|service_role|openrouter_api_key|supabase_(url|anon|service_role)|gemini|openai|anthropic)\b/.test(
      t,
    )
  ) {
    signals.push(
      signal(
        "vazamento_de_prompt_ou_provedor",
        "block",
        "Resposta expôs prompt/provedor/chave técnica.",
        clean,
      ),
    );
  }

  if (
    /\b(ja )?(salvei|registrei|plantei|enviei para revisao|marquei|agendei|cadastrei)\b/.test(t) &&
    !/\b(preview|proposta|confirmar|posso|quer que eu)\b/.test(t)
  ) {
    signals.push(
      signal(
        "falsa_execucao",
        "warn",
        "Resposta afirmou execução sem ação real confirmada pelo sistema.",
        clean,
      ),
    );
  }

  if (facet !== "kharis" && /\b(sou|aqui e)\s+(a\s+)?kharis\b/.test(t)) {
    signals.push(
      signal(
        "troca_indebida_de_identidade",
        "warn",
        "Resposta trocou indevidamente a identidade da faceta.",
        clean,
      ),
    );
  }
  if (/\b(sou|aqui e)\s+(a\s+)?kuan-?yin\b/.test(t)) {
    signals.push(
      signal(
        "troca_indebida_de_identidade",
        "warn",
        "Resposta trocou indevidamente a identidade da faceta.",
        clean,
      ),
    );
  }

  if (
    facet === "kharis" &&
    /\b(voce tem|diagnostico|diagnostiquei|e autismo|e tdah|transtorno)\b/.test(t)
  ) {
    signals.push(
      signal(
        "diagnostico_indevido",
        "warn",
        "Kháris não deve diagnosticar nem cravar condição clínica.",
        clean,
      ),
    );
  }

  return signals;
}
