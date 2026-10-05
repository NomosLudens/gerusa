// Regime de presença declarado (Semáforo).
// Server-only: lê o estado atual do usuário e renderiza o bloco de modulação
// injetado no system prompt da Kallistis.
//
// PRINCÍPIO: o estado é regime operacional momentâneo, não traço da pessoa.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PresencaState = "green" | "yellow" | "blue" | "red";

const STATE_LABEL: Record<PresencaState, string> = {
  green: "VERDE — fluxo aberto",
  yellow: "AMARELO — atenção mediada",
  blue: "AZUL — presença calma",
  red: "VERMELHO — limite ativo",
};

export async function lerPresencaRegime(
  sb: SupabaseClient<Database>,
  userId: string,
): Promise<PresencaState | null> {
  try {
    const { data } = await sb
      .from("presenca_regimes")
      .select("state")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.state as PresencaState | undefined) ?? null;
  } catch {
    return null;
  }
}

export function renderPresencaRegimeBlock(
  state: PresencaState | null,
  notaEfemera?: string,
): string {
  if (!state) return "";

  const linhas: string[] = [];
  linhas.push("=== REGIME DE PRESENÇA (semáforo) ===");
  linhas.push(`Estado declarado agora: ${STATE_LABEL[state]}.`);
  linhas.push(
    "Isto é regime operacional MOMENTÂNEO. NÃO é identidade, humor, diagnóstico, traço de personalidade nem memória sobre a pessoa.",
  );
  linhas.push("");
  linhas.push("Modulação obrigatória nesta resposta:");
  linhas.push(
    "- Tamanho: verde=médio/longo · amarelo=curto-médio · azul=curto · vermelho=muito curto.",
  );
  linhas.push(
    "- Quantidade de escolhas/opções: verde≤3 · amarelo≤2 · azul=1 · vermelho=0 (não abra menu).",
  );
  linhas.push(
    "- Iniciativa: verde=propor · amarelo=sugerir com cuidado · azul=orientar com baixa estimulação · vermelho=conter, ajudar a pausar.",
  );
  linhas.push("- Densidade cognitiva e ritmo proporcionais ao estado.");
  linhas.push("");
  linhas.push("REGRAS INEGOCIÁVEIS DO SEMÁFORO:");
  linhas.push(
    '- NUNCA trate o estado como traço da pessoa ("você é/sempre/costuma/parece estar…"). É só o regime declarado agora.',
  );
  linhas.push("- NUNCA psicologize nem diagnostique a partir do estado.");
  linhas.push(
    '- NÃO use "como você está no <cor>…" como muleta repetida; apenas obedeça a modulação. Mencione o estado só quando útil de verdade.',
  );
  linhas.push(
    '- VERMELHO: não proponha projeto novo, não dê aula, não abra decisão complexa, não use "sinto muito" como reflexo.',
  );
  linhas.push(
    "- AZUL não é vermelho. É baixo estímulo, não acolhimento terapêutico — não infantilize, não trate como tristeza.",
  );
  linhas.push(
    '- Se o usuário pedir mudança de semáforo em texto ("estou em vermelho"), PROPONHA a troca como ação a confirmar; NÃO afirme "mudei/coloquei em <cor>" sem confirmação real.',
  );

  const nota = (notaEfemera ?? "").trim();
  if (nota) {
    linhas.push("");
    linhas.push(
      `Nota efêmera do usuário (válida só para esta conversa, não vira memória): "${nota.slice(0, 280)}"`,
    );
  }

  return linhas.join("\n");
}
