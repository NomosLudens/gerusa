import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
// Trilha de sedimentação inline + leitura de provenance.
// Cliente puro (sem chamada AI) — só lê o que já existe.

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { createLocalChatRuntime } from "@/server/local-core/chat-runtime";

export type SedimentoRow = {
  id: string;
  thread_id: string;
  nivel: string;
  status: string;
  source_kind: string;
  source_ids: string[];
  hipotese: string;
  resumo: string | null;
  confianca: number;
  created_at: string;
  promovido_para: string | null;
  promovido_tipo: string | null;
};

export type ChatMessageRow = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  derived_from: string[];
};

export const loadTrilha = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const auth = await requireUser(getRequest());
    if ("error" in auth) return { messages: [], sedimentos: [] };
    const databaseUrl = getRuntimeDatabaseUrl();
    if (!databaseUrl) throw new Error("local_database_not_configured");
    const runtime = createLocalChatRuntime(databaseUrl);
    try {
      const [messages, sediments] = await Promise.all([
        runtime.chat.listThreadMessages(auth.userId, data.threadId, 10_000),
        runtime.memory.listSediments(auth.userId, data.threadId),
      ]);
      return {
        messages: [...messages].reverse().map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          created_at: message.createdAt,
          derived_from: message.derivedFrom,
        })) as ChatMessageRow[],
        sedimentos: sediments.map((sediment) => ({
          id: sediment.id,
          thread_id: sediment.threadId,
          nivel: sediment.level,
          status: sediment.status,
          source_kind: "chat_message",
          source_ids: sediment.sourceIds,
          hipotese: sediment.hypothesis,
          resumo: sediment.summary,
          confianca: sediment.confidence,
          created_at: sediment.createdAt,
          promovido_para: sediment.promotedTo,
          promovido_tipo: sediment.promotedTo ? "sedimento" : null,
        })) as SedimentoRow[],
      };
    } finally {
      runtime.close();
    }
  });

// Sedimentos que cobrem uma dada mensagem (aparecem como "compactado a partir daqui").
export function sedimentosForMessage(sedimentos: SedimentoRow[], messageId: string) {
  return sedimentos.filter(
    (s) => s.source_kind === "chat_message" && s.source_ids.includes(messageId),
  );
}

// Mensagens-fonte que entraram no contexto de uma resposta da Kallistis.
export function sourcesForAssistant(messages: ChatMessageRow[], assistantId: string) {
  const target = messages.find((m) => m.id === assistantId);
  if (!target) return [];
  const ids = new Set(target.derived_from);
  return messages.filter((m) => ids.has(m.id));
}

export const NIVEL_META: Record<string, { label: string; subtitle: string }> = {
  iconic: {
    label: "Icônica · impressão sensorial",
    subtitle: "registro instantâneo do que apareceu antes de virar linguagem",
  },
  echoic: {
    label: "Ecoica · ressonância auditiva",
    subtitle: "eco curto da fala, tom e formulação antes da primeira síntese",
  },
  short_term: {
    label: "Atencional · curto prazo",
    subtitle: "traço ativo recém-comprimido: 5 mensagens → 1 hipótese",
  },
  working: {
    label: "Operatória · memória de trabalho",
    subtitle: "bancada mental que combina 5 hipóteses em uma síntese manipulável",
  },
  prospective: {
    label: "Prospectiva · simulação de futuro",
    subtitle: "direções, intenções e possibilidades que começam a ganhar vetor",
  },
  episodic: {
    label: "Episódica · cena autobiográfica",
    subtitle: "conjunto situado de acontecimentos, contexto e passagem no tempo",
  },
  semantic: {
    label: "Semântica · significado consolidado",
    subtitle: "entendimento conceitual mais estável, menos preso à cena original",
  },
  procedural: {
    label: "Procedural · hábito incorporado",
    subtitle: "regra de operação, preferência ou modo de agir que pode orientar execução",
  },
};

export const NIVEL_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(NIVEL_META).map(([nivel, meta]) => [nivel, meta.label]),
);

export const NIVEL_SUBTITLE: Record<string, string> = Object.fromEntries(
  Object.entries(NIVEL_META).map(([nivel, meta]) => [nivel, meta.subtitle]),
);

export const STATUS_LABEL: Record<string, string> = {
  rascunho: "rascunho",
  em_revisao: "em revisão",
  confirmado: "confirmado",
  descartado: "descartado",
};
