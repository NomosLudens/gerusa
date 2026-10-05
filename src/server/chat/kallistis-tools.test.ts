import { describe, expect, it, vi } from "vitest";
import { buildCharacterDraft } from "@/server/characters/chat-creation";
import {
  applyCharacterCreationPatch,
  applyExplicitCharacterDraftChoice,
  createKallistisTools,
} from "./kallistis-tools";

function runtimeForDraft() {
  const draft = {
    id: "draft-1",
    ownerUserId: "user-1",
    masterUserId: "",
    status: "draft" as const,
    ruleset: "KALLISTIS_REGRAS_CANONICAS_2.0",
    name: "Ari",
    playerName: "",
    version: 2,
    snapshot: buildCharacterDraft("Ari", "", "Evocador"),
    mechanicalFingerprint: "before",
    createdAt: "",
    updatedAt: "",
    mesas: [],
  };
  const save = vi.fn(async (_userId: string, _id: string, snapshot: typeof draft.snapshot) => ({
    ...draft,
    snapshot,
    version: draft.version + 1,
  }));
  return {
    draft,
    save,
    runtime: {
      characters: {
        get: vi.fn(async () => draft),
        list: vi.fn(async () => [draft]),
        save,
      },
      chat: { updatePlayerExperience: vi.fn(async () => null) },
    } as any,
  };
}

describe("ação explícita do Chat de Criação no Forge", () => {
  it("não persiste pergunta ou sugestão e persiste somente Povo na escolha", async () => {
    const question = runtimeForDraft();
    expect(
      await applyExplicitCharacterDraftChoice({
        runtime: question.runtime,
        userId: "user-1",
        threadId: "thread-1",
        scope: "character_creation",
        text: "quais Povos existem?",
      }),
    ).toBeNull();
    expect(question.save).not.toHaveBeenCalled();

    const suggestion = runtimeForDraft();
    expect(
      await applyExplicitCharacterDraftChoice({
        runtime: suggestion.runtime,
        userId: "user-1",
        threadId: "thread-1",
        scope: "character_creation",
        text: "Nomos parece interessante",
      }),
    ).toBeNull();
    expect(suggestion.save).not.toHaveBeenCalled();

    const choice = runtimeForDraft();
    const before = structuredClone(choice.draft.snapshot);
    const result = await applyExplicitCharacterDraftChoice({
      runtime: choice.runtime,
      userId: "user-1",
      threadId: "thread-1",
      scope: "character_creation",
      activeCharacterId: "draft-1",
      text: "vou de Nomos",
    });
    expect(result).toMatchObject({ status: "success", targetField: "povo", targetValue: "Nomos" });
    expect(choice.save).toHaveBeenCalledWith(
      "user-1",
      "draft-1",
      expect.objectContaining({ povo: "Nomos", nome: before.nome, trilhas: before.trilhas }),
      expect.any(String),
      2,
    );
  });

  it("persiste nome e povo no mesmo turno e devolve o readback autoritativo", async () => {
    const choice = runtimeForDraft();
    const result = await applyExplicitCharacterDraftChoice({
      runtime: choice.runtime,
      userId: "user-1",
      threadId: "thread-1",
      scope: "character_creation",
      activeCharacterId: "draft-1",
      text: "o nome dela é Elara e vou de Livres",
    });
    expect(result).toMatchObject({
      status: "success",
      authoritativeReadback: true,
      nome: "Elara",
      jogador: "",
      nextField: expect.any(String),
    });
    expect(choice.save).toHaveBeenCalledWith(
      "user-1",
      "draft-1",
      expect.objectContaining({ nome: "Elara", povo: "Livres" }),
      expect.any(String),
      2,
    );
  });

  it("persiste campos conversacionais incrementais sem apagar o restante do snapshot", async () => {
    const choice = runtimeForDraft();
    const result = await applyCharacterCreationPatch({
      runtime: choice.runtime,
      userId: "user-1",
      threadId: "thread-1",
      scope: "character_creation",
      activeCharacterId: "draft-1",
      patch: {
        conceito: {
          identidade: "guardião de memórias",
          objetivo: "preservar nomes",
          perda: "o arquivo ancestral",
        },
        atributosBase: { Corpo: 3, Agilidade: 2 },
        equipamento: { arma: "Espada", consumiveis: ["Tônico de Vitalidade", "Sal de Memória"] },
        vinculos: ["Arquivo", "Lira", "Medalhão"],
        promessa: "reconstruir o arquivo",
        ferida: "falhei em protegê-lo",
        pergunta: "quem é esquecido?",
      },
    });
    expect(result).toMatchObject({
      status: "success",
      authoritativeReadback: true,
      updatedFields: expect.any(Array),
    });
    expect(choice.save).toHaveBeenCalledWith(
      "user-1",
      "draft-1",
      expect.objectContaining({
        nome: "Ari",
        trilhas: expect.any(Array),
        conceito: expect.objectContaining({ identidade: "guardião de memórias" }),
        atributosBase: expect.objectContaining({ Corpo: 3, Agilidade: 2 }),
        equipamento: expect.objectContaining({
          arma: "Espada",
          consumiveis: ["Tônico de Vitalidade", "Sal de Memória"],
        }),
        vinculos: ["Arquivo", "Lira", "Medalhão"],
      }),
      expect.any(String),
      2,
    );
  });

  it("rejeita patch fora do contrato e não grava", async () => {
    const choice = runtimeForDraft();
    const result = await applyCharacterCreationPatch({
      runtime: choice.runtime,
      userId: "user-1",
      threadId: "thread-1",
      scope: "character_creation",
      activeCharacterId: "draft-1",
      patch: { jogador: "inventado" },
    });
    expect(result).toMatchObject({
      status: "validation_error",
      code: "creation_patch_field_forbidden",
    });
    expect(choice.save).not.toHaveBeenCalled();
  });

  it.each([
    { patch: { povo: "Guardião" }, code: "forge_draft_people_invalid" },
    { patch: { trilhas: [{ oficio: "Kragor" }] }, code: "forge_draft_office_invalid" },
    {
      patch: { trilhas: [{ oficio: "Guardião" }, { oficio: "Aelvari" }] },
      code: "forge_draft_office_invalid",
    },
  ])("rejeita valores cruzados entre Povo e Ofício sem gravar", async ({ patch, code }) => {
    const choice = runtimeForDraft();
    const result = await applyCharacterCreationPatch({
      runtime: choice.runtime,
      userId: "user-1",
      threadId: "thread-1",
      scope: "character_creation",
      activeCharacterId: "draft-1",
      patch,
    });
    expect(result).toMatchObject({ status: "validation_error", code });
    expect(choice.save).not.toHaveBeenCalled();
  });
});

describe("ferramenta de campanha do chat", () => {
  it("trata um campaignId que não é UUID sem abortar o turno", async () => {
    const tools = createKallistisTools({
      databaseUrl: "",
      userId: "user-1",
      threadId: "thread-1",
      requestId: "request-1",
      scope: "character_creation",
    });

    const result = await tools.consult_campaign.execute!(
      { campaignId: "QA-RECUPERACAO-20260930" },
      {} as never,
    );

    expect(result).toEqual({ status: "not_found", code: "invalid_campaign_id" });
  });
});
