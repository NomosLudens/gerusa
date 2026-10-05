import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
// Trilha de sedimentação 5→1 por faceta.
// Janelas de 5 mensagens (user+assistant) viram 1 hipótese (`short_term`)
// com status `em_revisao` — nunca confirmada automaticamente.
// Confirmar = promove a `jardim_memorias`. Promover sedimentos do mesmo nível em 5 vira nível seguinte.

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { createLocalChatRuntime, type LocalChatRuntime } from "@/server/local-core/chat-runtime";

const NIVEIS = [
  "iconic",
  "echoic",
  "short_term",
  "working",
  "prospective",
  "episodic",
  "semantic",
  "procedural",
] as const;
type Nivel = (typeof NIVEIS)[number];

const NEXT_LEVEL: Record<Nivel, Nivel | null> = {
  iconic: "echoic",
  echoic: "short_term",
  short_term: "working",
  working: "prospective",
  prospective: "episodic",
  episodic: "semantic",
  semantic: "procedural",
  procedural: null,
};

const WINDOW = 5;
const MIN_SUBSTANTIVE_CHARS = 24;
const FALLBACK_MAX_CHARS = 360;
const SIGNAL_MAX_CHARS = 180;
const MAX_CASCADE_PASSES = 6;
const MAX_WINDOWS_PER_RUN = 2;
const MAX_CASCADE_CREATIONS_PER_RUN = 2;

const HipoteseSchema = z.object({
  hipotese: z.string().min(8).max(600),
  resumo: z.string().min(8).max(400),
  confianca: z.number().int().min(1).max(3),
  descartar: z.boolean().default(false),
});

type Hipotese = z.infer<typeof HipoteseSchema>;
type Gateway = ReturnType<typeof import("@/lib/openrouter.server").createOpenRouterProvider>;
type Facet = "kallistis" | "kharis" | "kuanyin";

type SignalKind = "pedido" | "preferencia" | "restricao" | "decisao" | "fato" | "pergunta" | "tema";

type SedimentationSignal = {
  kind: SignalKind;
  weight: number;
  channelWeight: number;
  sourceChannel: "C01" | "C02" | "LEGACY";
  text: string;
  role: string;
};

type SedimentationMessage = {
  id?: string;
  role: string;
  content: string;
  created_at?: string;
  source_channel?: string | null;
};

function channelWeight(sourceChannel: string | null | undefined) {
  if (sourceChannel === "C01" || sourceChannel === null || sourceChannel === undefined) return 1;
  if (sourceChannel === "C02") return 0.8;
  return 0;
}

function sedimentationSource(sourceChannel: string | null | undefined) {
  return sourceChannel === "C01" || sourceChannel === "C02" ? sourceChannel : "LEGACY";
}

export function selectSedimentableMessages(messages: SedimentationMessage[]) {
  return messages.filter((message) => channelWeight(message.source_channel) > 0);
}

const SIGNAL_LABEL: Record<SignalKind, string> = {
  pedido: "pedido",
  preferencia: "preferência",
  restricao: "restrição",
  decisao: "decisão",
  fato: "fato",
  pergunta: "pergunta",
  tema: "tema",
};

function sanitizeSnippet(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

function compact(content: string, max = SIGNAL_MAX_CHARS) {
  const sanitized = sanitizeSnippet(content);
  return sanitized.length > max ? `${sanitized.slice(0, max - 1)}…` : sanitized;
}

function isSubstantiveMessage(content: string) {
  const normalized = sanitizeSnippet(content).toLowerCase();
  if (normalized.length < MIN_SUBSTANTIVE_CHARS && !normalized.includes("?")) return false;
  return !/^(ok|okay|sim|não|nao|valeu|obrigad[oa]|thanks|👍|🙏|rs|haha|kkk)[.!?…]*$/i.test(
    normalized,
  );
}

function pushSignal(
  signals: SedimentationSignal[],
  seen: Map<string, number>,
  signal: SedimentationSignal,
) {
  const key = `${signal.kind}:${signal.text.toLowerCase()}`;
  const existingIndex = seen.get(key);
  if (existingIndex !== undefined) {
    if (signal.channelWeight > signals[existingIndex].channelWeight) {
      signals[existingIndex] = signal;
    }
    return;
  }
  seen.set(key, signals.length);
  signals.push(signal);
}

export function extractSedimentationSignals(win: SedimentationMessage[]) {
  const signals: SedimentationSignal[] = [];
  const seen = new Map<string, number>();

  for (const message of win) {
    const text = compact(message.content);
    const raw = message.content;
    const lower = sanitizeSnippet(raw).toLowerCase();
    if (!isSubstantiveMessage(raw)) continue;

    const isUser = message.role === "user";
    const baseWeight = isUser ? 2 : 1;
    const sourceWeight = channelWeight(message.source_channel);
    const sourceChannel = sedimentationSource(message.source_channel);

    if (
      /\b(quero|preciso|faça|faca|ajuste|corrija|crie|adicione|remova|reforce|endureça|endureca|implemente|melhore|troque|substitua|garanta)\b/i.test(
        raw,
      )
    ) {
      pushSignal(signals, seen, {
        kind: "pedido",
        weight: baseWeight + 4,
        channelWeight: sourceWeight,
        sourceChannel,
        text,
        role: message.role,
      });
    }

    if (
      /\b(prefiro|gosto de|não quero|nao quero|evite|sempre|nunca|mantenha|deixe como|tom|estilo|formato)\b/i.test(
        raw,
      )
    ) {
      pushSignal(signals, seen, {
        kind: "preferencia",
        weight: baseWeight + 3,
        channelWeight: sourceWeight,
        sourceChannel,
        text,
        role: message.role,
      });
    }

    if (
      /\b(inegociável|inegociavel|obrigatório|obrigatorio|deve|precisa|não pode|nao pode|sem |proibido|apenas|somente)\b/i.test(
        raw,
      )
    ) {
      pushSignal(signals, seen, {
        kind: "restricao",
        weight: baseWeight + 3,
        channelWeight: sourceWeight,
        sourceChannel,
        text,
        role: message.role,
      });
    }

    if (
      /\b(decidi|decidimos|combinado|confirmo|aprovado|fica assim|vamos seguir|fechado)\b/i.test(
        raw,
      )
    ) {
      pushSignal(signals, seen, {
        kind: "decisao",
        weight: baseWeight + 3,
        channelWeight: sourceWeight,
        sourceChannel,
        text,
        role: message.role,
      });
    }

    if (
      /\b(\d+[.,]?\d*|r\$|kg|km|%|janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|hoje|amanhã|amanha|ontem)\b/i.test(
        raw,
      )
    ) {
      pushSignal(signals, seen, {
        kind: "fato",
        weight: baseWeight + 2,
        channelWeight: sourceWeight,
        sourceChannel,
        text,
        role: message.role,
      });
    }

    if (raw.includes("?")) {
      pushSignal(signals, seen, {
        kind: "pergunta",
        weight: baseWeight + 1,
        channelWeight: sourceWeight,
        sourceChannel,
        text,
        role: message.role,
      });
    }

    if (signals.length === 0 || (isUser && lower.length >= FALLBACK_MAX_CHARS / 2)) {
      pushSignal(signals, seen, {
        kind: "tema",
        weight: baseWeight,
        channelWeight: sourceWeight,
        sourceChannel,
        text,
        role: message.role,
      });
    }
  }

  // Relevância semântica é soberana; o canal só desempata equivalências.
  return signals
    .sort((a, b) => b.weight - a.weight || b.channelWeight - a.channelWeight)
    .slice(0, WINDOW);
}

export function renderSedimentationSignals(signals: SedimentationSignal[]) {
  return signals
    .map(
      (signal) =>
        `[${SIGNAL_LABEL[signal.kind]} | ${signal.sourceChannel} | prioridade ${signal.channelWeight.toFixed(1)}]\npeso semântico: ${signal.weight}\n${signal.text}`,
    )
    .join("\n\n");
}

function confidenceFromSignals(signals: SedimentationSignal[]) {
  if (
    signals.some((s) => s.kind === "preferencia" || s.kind === "restricao" || s.kind === "decisao")
  ) {
    return 3;
  }
  if (signals.some((s) => s.kind === "pedido" || s.kind === "fato") || signals.length >= 2) {
    return 2;
  }
  return 1;
}

function buildHypoteseFromSignals(signals: SedimentationSignal[]) {
  const primary = signals[0];
  const prefix: Record<SignalKind, string> = {
    pedido: "O usuário pediu",
    preferencia: "Indica preferência do usuário",
    restricao: "Registra restrição operacional",
    decisao: "Registra decisão assumida",
    fato: "Registra dado factual citado",
    pergunta: "O usuário investigou",
    tema: "Sugere tema relevante",
  };

  return compact(`${prefix[primary.kind]}: ${primary.text}`, 560);
}

export function fallbackHipotese(win: SedimentationMessage[]): Hipotese {
  // Camadas determinísticas: limpeza → ruído/substância → sinais → síntese.
  const signals = extractSedimentationSignals(win);
  if (signals.length === 0) {
    return {
      hipotese: "Indica apenas ruído conversacional sem substância sedimentável.",
      resumo:
        "A janela contém confirmações breves, cumprimentos ou mensagens sem conteúdo operacional.",
      confianca: 1,
      descartar: true,
    };
  }

  const resumo = compact(
    signals.map((s) => `${SIGNAL_LABEL[s.kind]}: ${s.text}`).join(" · "),
    FALLBACK_MAX_CHARS,
  );

  return {
    hipotese: buildHypoteseFromSignals(signals),
    resumo,
    confianca: confidenceFromSignals(signals),
    descartar: false,
  };
}

function isWeakAiSediment(hipotese: Hipotese) {
  const joined = `${hipotese.hipotese} ${hipotese.resumo}`.toLowerCase();
  return /ponto relevante|ajuste explícito|tema relevante|conversa em geral|não especificado|nao especificado/.test(
    joined,
  );
}

function hardenHipotese(hipotese: Hipotese, win: Array<{ role: string; content: string }>) {
  const fallback = fallbackHipotese(win);
  if (hipotese.descartar) return fallback.descartar ? hipotese : fallback;
  if (isWeakAiSediment(hipotese) && !fallback.descartar) return fallback;
  return HipoteseSchema.parse({
    ...hipotese,
    hipotese: compact(hipotese.hipotese, 600),
    resumo: compact(hipotese.resumo, 400),
  });
}

async function generateHipotese(
  gateway: Gateway,
  model: string,
  system: string,
  transcript: string,
  win: Array<{ role: string; content: string }>,
): Promise<Hipotese> {
  try {
    const structuredSignals = renderSedimentationSignals(extractSedimentationSignals(win));
    const { experimental_output } = await generateText({
      model: gateway(model),
      system: `${system}\nA prioridade do canal apenas desempata sinais semanticamente equivalentes. Nunca descarte fato, decisão, preferência ou restrição explícita por vir do Telegram.`,
      prompt: `5 mensagens consecutivas em ordem cronológica:\n\n${transcript}\n\nSinais estruturados por relevância semântica e desempate de canal:\n\n${structuredSignals}\n\nDestile em hipótese revisável.`,
      experimental_output: Output.object({ schema: HipoteseSchema }),
      temperature: 0.3,
      timeout: 20_000,
    });
    return hardenHipotese(experimental_output, win);
  } catch (err) {
    console.error("Sedimentation AI failed; using deterministic fallback", err);
    return fallbackHipotese(win);
  }
}

type SedimentoCandidate = {
  id: string;
  nivel: Nivel;
  hipotese: string;
  resumo: string | null;
  confianca: number;
};

function sedimentoAsMessage(s: SedimentoCandidate) {
  return {
    role: "sedimento",
    content: `[${s.nivel} · confiança ${s.confianca}/3] ${s.hipotese} — ${s.resumo ?? ""}`,
  };
}

async function generateCascadeHipotese(
  gateway: Gateway | null,
  model: string,
  facetLabel: string,
  nivel: Nivel,
  next: Nivel,
  batch: SedimentoCandidate[],
) {
  const win = batch.map(sedimentoAsMessage);
  const transcript = win.map((m, i) => `${i + 1}. ${m.content}`).join("\n");
  const fallback = fallbackHipotese(win);

  if (!gateway) {
    return fallback;
  }

  try {
    const { experimental_output } = await generateText({
      model: gateway(model),
      system: `Você sedimenta 5 sedimentos da faceta ${facetLabel} do nível ${nivel} em 1 sedimento do nível ${next}.
REGRA INEGOCIÁVEL: isto NÃO confirma verdade; cria uma hipótese revisável mais compacta.
Preserve proveniência, reduza repetição, mantenha contradições como tensão, e descarte se não houver convergência mínima.
A síntese deve ser mais estável que as 5 entradas, mas nunca virar memória confirmada.`,
      prompt: `5 sedimentos consecutivos:\n\n${transcript}\n\nComprima 5→1 em uma hipótese revisável do nível ${next}.`,
      experimental_output: Output.object({ schema: HipoteseSchema }),
      temperature: 0.25,
      timeout: 20_000,
    });
    return hardenHipotese(experimental_output, win);
  } catch (err) {
    console.error("Cascade sedimentation AI failed; using deterministic fallback", err);
    return fallback;
  }
}

async function cascadeSedimentacao(
  runtime: LocalChatRuntime,
  userId: string,
  threadId: string,
  facetLabel: string,
  gateway: Gateway | null,
  model: string,
) {
  let camadasCriadas = 0;

  for (let pass = 0; pass < MAX_CASCADE_PASSES; pass += 1) {
    let criouNestaPassagem = false;

    // 1 select para todos os níveis pendentes desta passagem, em vez de 1
    // select por nível (7 round-trips sequenciais antes). Nota: uma promoção
    // feita no meio desta passagem só fica visível para o nível seguinte na
    // PRÓXIMA passagem (antes era visível na mesma passagem, via select em
    // tempo real por nível) — cascatas de vários níveis em sequência levam
    // uma passagem a mais para completar, sempre dentro do orçamento de
    // MAX_CASCADE_PASSES e do mesmo limite MAX_CASCADE_CREATIONS_PER_RUN, então
    // o resultado final do run é equivalente.
    const pendentes = (await runtime.memory.listSediments(userId, threadId))
      .filter((sediment) => sediment.status === "em_revisao" && !sediment.promotedTo)
      .map((sediment) => ({
        id: sediment.id,
        nivel: sediment.level as Nivel,
        hipotese: sediment.hypothesis,
        resumo: sediment.summary,
        confianca: sediment.confidence,
        created_at: sediment.createdAt,
      }));

    const porNivel = new Map<Nivel, SedimentoCandidate[]>();
    for (const row of (pendentes ?? []) as SedimentoCandidate[]) {
      const lista = porNivel.get(row.nivel) ?? [];
      lista.push(row);
      porNivel.set(row.nivel, lista);
    }

    for (const nivel of NIVEIS) {
      const next = NEXT_LEVEL[nivel];
      if (!next) continue;

      const batch = (porNivel.get(nivel) ?? []).slice(0, WINDOW);
      if (batch.length < WINDOW) continue;

      const hipotese = await generateCascadeHipotese(
        gateway,
        model,
        facetLabel,
        nivel,
        next,
        batch,
      );
      if (hipotese.descartar) continue;

      let resultObj: Record<string, unknown>;
      try {
        resultObj = await runtime.sedimentation.promoteSedimentBatch(
          userId,
          threadId,
          batch.map((s) => s.id),
          {
            nextLevel: next,
            hypothesis: hipotese.hipotese,
            summary: hipotese.resumo,
            confidence: hipotese.confianca,
            parentStatus: "em_revisao",
            newStatus: "em_revisao",
          },
        );
      } catch (error) {
        console.error("Cascade sedimentation via PostgreSQL failed", error);
        continue;
      }
      if (typeof resultObj.novo_id !== "string") {
        console.error("Cascade sedimentation returned invalid result object", resultObj);
        continue;
      }

      camadasCriadas += 1;
      criouNestaPassagem = true;
      if (camadasCriadas >= MAX_CASCADE_CREATIONS_PER_RUN) return camadasCriadas;
    }

    if (!criouNestaPassagem) break;
  }

  return camadasCriadas;
}

function facetLabel(facet: Facet | null | undefined) {
  if (facet === "kuanyin") return "Kuan-Yin";
  if (facet === "kharis") return "Kháris";
  return "Kallistis";
}

function sedimentationSystemForFacet(label: string) {
  return `Você sedimenta conversa em hipótese para ${label}.
REGRA INEGOCIÁVEL: sedimentação NÃO confirma verdade.
Você comprime 5 trocas em 1 hipótese curta, marcada com confiança (1-3).
NÃO generalizar identidade do usuário ("você é…", "você sempre…").
NÃO transformar trivialidade (cumprimento, "ok", "valeu", emoji) em hipótese — nesse caso retorne descartar:true.
NÃO inventar dado que não está nas 5 mensagens.
Linguagem: pt-BR, sóbria, sem empatia performática.
Formato de saída JSON estrito:
- hipotese: 1 frase (máx 200 chars) começando com verbo no presente: "Indica que…", "Sugere…", "O usuário pediu…".
- resumo: 1-2 frases descrevendo o que foi conversado (factual, sem inferência psicológica).
- confianca: 1 (traço fraco) · 2 (padrão consistente nas 5) · 3 (regra/preferência explicitada pelo usuário).
- descartar: true se as 5 mensagens forem trivialidade ou ruído sem substância.`;
}

// Core reutilizável — recebe repositories já escopados pela identidade local.
// Usado pelo `sedimentarThread` e pelo background do chat.
export async function sedimentarThreadCore(
  runtime: LocalChatRuntime,
  userId: string,
  threadId: string,
) {
  const thread = await runtime.chat.getThreadById(userId, threadId);
  if (!thread) {
    return { sedimentados: 0, motivo: "thread inválida" };
  }

  const cutoff = thread.lastSedimentadoAt ?? "1970-01-01T00:00:00Z";
  const cutoffMs = Date.parse(cutoff);
  const msgs = (await runtime.chat.listThreadMessages(userId, threadId, 10_000))
    .filter((message) => {
      const createdAtMs = new Date(message.createdAt).getTime();
      return Number.isFinite(createdAtMs) && createdAtMs > cutoffMs;
    })
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        String(a.id).localeCompare(String(b.id)),
    )
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.createdAt,
      source_channel: message.sourceChannel,
    }));

  const pending = selectSedimentableMessages(msgs);

  // Imports server-only carregados dinamicamente: este módulo é referenciado por
  // rotas de cliente (via os RPCs createServerFn), então um import estático de
  // `*.server.*` quebraria o build (import-protection do TanStack Start).
  const { createOpenRouterProvider } = await import("@/lib/openrouter.server");
  const { AI_MODELS } = await import("@/lib/ai-models.server");

  let gateway: Gateway | null = null;
  try {
    gateway = createOpenRouterProvider();
  } catch (err) {
    console.error("AI provider configuration error; using deterministic sedimentation", err);
  }

  const label = facetLabel(thread.facet as Facet);
  const SYSTEM = sedimentationSystemForFacet(label);

  const windows: (typeof pending)[] = [];
  for (
    let i = 0;
    i + WINDOW <= pending.length && windows.length < MAX_WINDOWS_PER_RUN;
    i += WINDOW
  ) {
    windows.push(pending.slice(i, i + WINDOW));
  }
  let sedimentadosCount = 0;
  let lastSedimentadoAt: string | null = null;

  for (const win of windows) {
    const transcript = win.map((m) => `[${m.role}] ${m.content}`).join("\n");
    // A ação explícita da Trilha precisa produzir uma candidata determinística
    // mesmo quando a saída estruturada do provider não chega utilizável.
    // O fallback usa somente os sinais das mensagens reais da janela.
    const hipotese = fallbackHipotese(win);

    if (!hipotese.descartar) {
      await runtime.sedimentation.insertSediment({
        userId,
        threadId,
        level: "short_term",
        status: "em_revisao",
        sourceKind: "chat_message",
        sourceIds: win.map((m) => m.id!),
        hypothesis: hipotese.hipotese,
        summary: hipotese.resumo,
        confidence: hipotese.confianca,
      });
      sedimentadosCount += 1;
    }
    lastSedimentadoAt = win[win.length - 1].created_at!;
  }

  if (lastSedimentadoAt) {
    await runtime.chat.updateThreadSedimentationCursor(userId, threadId, lastSedimentadoAt);
  }

  const camadasCriadas = await cascadeSedimentacao(
    runtime,
    userId,
    threadId,
    label,
    gateway,
    AI_MODELS.reasoning,
  );

  return {
    sedimentados: sedimentadosCount,
    janelas: windows.length,
    camadasCriadas,
    restantes: pending.length % WINDOW,
  };
}

async function localRuntime() {
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) throw new Error("local_database_not_configured");
  const auth = await requireUser(getRequest());
  if ("error" in auth) throw new Error("local_auth_unavailable");
  return { runtime: createLocalChatRuntime(databaseUrl), userId: auth.userId };
}

// ─── Sedimentar pendentes do thread ───
export const sedimentarThread = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { runtime, userId } = await localRuntime();
    try {
      return await sedimentarThreadCore(runtime, userId, data.threadId);
    } finally {
      runtime.close();
    }
  });

// ─── Confirmar um sedimento → vira memória no Jardim ───
export const confirmarSedimento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sedimentoId: z.string().uuid(),
        titulo: z.string().min(1).max(200),
        conteudo: z.string().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { runtime, userId } = await localRuntime();
    try {
      const sed = await runtime.sedimentation.getSediment(userId, data.sedimentoId);
      if (!sed) throw new Error("sedimento não encontrado");
      const result = await runtime.sedimentation.confirmSediment(userId, data.sedimentoId, {
        title: data.titulo,
        content: data.conteudo,
        importance: 2,
        tags: ["sedimentado", `de:${sed.level}`],
      });
      if (typeof result.memory_id !== "string") throw new Error("memória não criada");
      return { ok: true, memoriaId: result.memory_id };
    } finally {
      runtime.close();
    }
  });

// ─── Descartar sedimento ───
export const descartarSedimento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ sedimentoId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { runtime, userId } = await localRuntime();
    try {
      const updated = await runtime.sedimentation.discardSediment(
        userId,
        data.sedimentoId,
        new Date().toISOString(),
      );
      if (!updated) throw new Error("sedimento não encontrado ou já revisado");
      return { ok: true };
    } finally {
      runtime.close();
    }
  });

// ─── Promover 5 sedimentos confirmados do mesmo nível para o nível seguinte ───
export const promoverNivel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
        nivel: z.enum(NIVEIS),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { runtime, userId } = await localRuntime();
    try {
      const next = NEXT_LEVEL[data.nivel as Nivel];
      if (!next) return { promovido: 0, motivo: "nivel terminal" };

      const confirmados = (await runtime.memory.listSediments(userId, data.threadId))
        .filter(
          (sediment) =>
            sediment.level === data.nivel &&
            sediment.status === "confirmado" &&
            !sediment.promotedTo,
        )
        .slice(0, WINDOW)
        .map((sediment) => ({
          id: sediment.id,
          hipotese: sediment.hypothesis,
          resumo: sediment.summary,
          confianca: sediment.confidence,
        }));

      if (confirmados.length < WINDOW) {
        return { promovido: 0, restantes: confirmados.length };
      }

      // Imports server-only carregados dinamicamente (ver nota em sedimentarThreadCore).
      const { createOpenRouterProvider } = await import("@/lib/openrouter.server");
      const { AI_MODELS } = await import("@/lib/ai-models.server");

      let gateway: ReturnType<typeof createOpenRouterProvider>;
      try {
        gateway = createOpenRouterProvider();
      } catch (err) {
        console.error("AI provider configuration error", err instanceof Error ? err.message : err);
        throw new Error("A IA ainda não está configurada neste ambiente.");
      }

      const bloco = confirmados
        .map((s, i) => `${i + 1}. [conf:${s.confianca}] ${s.hipotese} — ${s.resumo ?? ""}`)
        .join("\n");
      const { experimental_output } = await generateText({
        model: gateway(AI_MODELS.reasoning),
        system: `Você promove 5 hipóteses do nível ${data.nivel} para 1 síntese do nível ${next}.
Regra: a síntese deve ser MAIS DURÁVEL e MENOS situacional que as hipóteses.
Se as 5 hipóteses contradizem entre si ou não convergem, marque descartar:true.`,
        prompt: `5 hipóteses confirmadas:\n${bloco}\n\nSintetize 1 unidade do nível ${next}.`,
        experimental_output: Output.object({ schema: HipoteseSchema }),
        temperature: 0.3,
        timeout: 20_000,
      });
      if (experimental_output.descartar) {
        return { promovido: 0, motivo: "sem convergência" };
      }

      const resultObj = await runtime.sedimentation.promoteSedimentBatch(
        userId,
        data.threadId,
        confirmados.map((s) => s.id),
        {
          nextLevel: next,
          hypothesis: experimental_output.hipotese,
          summary: experimental_output.resumo,
          confidence: experimental_output.confianca,
        },
      );
      if (typeof resultObj.novo_id !== "string") throw new Error("promoção não criada");

      return { promovido: 1, novoId: resultObj.novo_id };
    } finally {
      runtime.close();
    }
  });
