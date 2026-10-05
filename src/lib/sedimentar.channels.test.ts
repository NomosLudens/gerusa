import { beforeEach, describe, expect, it, vi } from "vitest";

const generateTextMock = vi.hoisted(() => vi.fn());

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: (...args: unknown[]) => generateTextMock(...args),
  };
});

vi.mock("@/lib/openrouter.server", () => ({
  createOpenRouterProvider: () => (model: string) => model,
}));

vi.mock("@/lib/ai-models.server", () => ({
  AI_MODELS: { fast: "fast-model", reasoning: "reasoning-model" },
}));

import {
  extractSedimentationSignals,
  fallbackHipotese,
  renderSedimentationSignals,
  sedimentarThreadCore,
  selectSedimentableMessages,
} from "./sedimentar.functions";

describe("sedimentação privada por canal", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });

  it("combina C01 e C02 cronologicamente, mantendo legado e excluindo C03", () => {
    const selected = selectSedimentableMessages([
      { role: "user", content: "Primeira decisão importante da conversa.", source_channel: "C01" },
      {
        role: "assistant",
        content: "Resposta privada do Telegram com contexto.",
        source_channel: "C02",
      },
      { role: "user", content: "Diálogo da Câmara não entra no privado.", source_channel: "C03" },
      {
        role: "user",
        content: "Mensagem legada com fato relevante em janeiro.",
        source_channel: null,
      },
    ]);
    expect(selected.map((message) => message.source_channel)).toEqual(["C01", "C02", null]);
  });

  it("usa C01 apenas para desempatar sinais semanticamente equivalentes", () => {
    const hypothesis = fallbackHipotese([
      {
        role: "user",
        content: "Prefiro respostas objetivas no Telegram.",
        source_channel: "C02",
      },
      { role: "user", content: "Prefiro respostas objetivas no Web.", source_channel: "C01" },
    ]);
    expect(hypothesis.hipotese).toContain("respostas objetivas no Web");
    expect(hypothesis.hipotese).not.toContain("respostas objetivas no Telegram");
  });

  it("deduplica sinal idêntico preservando o representante de maior prioridade", () => {
    const signals = extractSedimentationSignals([
      {
        role: "user",
        content: "Preciso manter este formato de resposta.",
        source_channel: "C02",
      },
      {
        role: "user",
        content: "Preciso manter este formato de resposta.",
        source_channel: "C01",
      },
    ]);
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.sourceChannel === "C01")).toBe(true);
  });

  it("preserva fato explícito de C02 mesmo quando C01 vence outro empate", () => {
    const signals = extractSedimentationSignals([
      { role: "user", content: "Prefiro respostas objetivas no Web.", source_channel: "C01" },
      {
        role: "user",
        content: "A decisão obrigatória é concluir isso em janeiro de 2027.",
        source_channel: "C02",
      },
    ]);
    const rendered = renderSedimentationSignals(signals);
    expect(rendered).toContain("[fato | C02 | prioridade 0.8]");
    expect(rendered).toContain("janeiro de 2027");
  });

  it("sedimentarThreadCore preserva os canais e cria um único candidato revisável misto", async () => {
    const messages = [
      {
        id: "m1",
        role: "user",
        content: "Prefiro respostas objetivas no Web.",
        created_at: "2027-01-01T00:00:01Z",
        source_channel: "C01",
      },
      {
        id: "m-c03",
        role: "user",
        content: "Esta mensagem bruta da Câmara deve ficar isolada.",
        created_at: "2027-01-01T00:00:02Z",
        source_channel: "C03",
      },
      {
        id: "m2",
        role: "user",
        content: "Prefiro respostas objetivas no Telegram.",
        created_at: "2027-01-01T00:00:03Z",
        source_channel: "C02",
      },
      {
        id: "m3",
        role: "assistant",
        content: "Podemos manter continuidade entre os dois canais privados.",
        created_at: "2027-01-01T00:00:04Z",
        source_channel: "C01",
      },
      {
        id: "m4",
        role: "user",
        content: "A mensagem legada registra o prazo de 12 dias.",
        created_at: "2027-01-01T00:00:05Z",
        source_channel: null,
      },
      {
        id: "m5",
        role: "user",
        content: "A decisão obrigatória é concluir isso em janeiro de 2027.",
        created_at: "2027-01-01T00:00:06Z",
        source_channel: "C02",
      },
    ];
    const inserted: Array<Record<string, unknown>> = [];
    const runtime = {
      chat: {
        getThreadById: vi.fn(async () => ({
          id: "thread-1",
          userId: "user-1",
          facet: "kallistis",
          surface: "kallistis",
          title: null,
          createdAt: "2027-01-01T00:00:00Z",
          lastSedimentadoAt: null,
        })),
        listThreadMessages: vi.fn(async () =>
          messages.map((message) => ({
            id: message.id,
            threadId: "thread-1",
            userId: "user-1",
            role: message.role as "user" | "assistant",
            content: message.content,
            createdAt: message.created_at,
            derivedFrom: [],
            sourceChannel: message.source_channel,
          })),
        ),
        updateThreadSedimentationCursor: vi.fn(),
        insertMessage: vi.fn(),
      },
      memory: {
        listCandidates: vi.fn(),
        listMemories: vi.fn(),
        listSediments: vi.fn(async () => []),
      },
      sedimentation: {
        insertSediment: vi.fn(async (input: Record<string, unknown>) => {
          inserted.push(input);
          return "sediment-1";
        }),
        getSediment: vi.fn(),
        discardSediment: vi.fn(),
        approveMemoryCandidate: vi.fn(),
        confirmSediment: vi.fn(),
        promoteSedimentBatch: vi.fn(),
      },
      close: vi.fn(),
      databaseUrl: "",
    };

    const result = await sedimentarThreadCore(runtime as never, "user-1", "thread-1");

    expect(result).toMatchObject({ sedimentados: 1, janelas: 1, restantes: 0 });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      level: "short_term",
      status: "em_revisao",
      sourceKind: "chat_message",
      sourceIds: ["m1", "m2", "m3", "m4", "m5"],
    });
    expect(inserted[0].sourceIds).not.toContain("m-c03");

    expect(generateTextMock).not.toHaveBeenCalled();
  });
});
