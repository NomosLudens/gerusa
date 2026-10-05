import { randomUUID } from "node:crypto";
import { tool } from "ai";
import { z } from "zod";
import { retrieveCanonicalRules } from "@/lib/canonical-rules.server";
import type { ChatScope } from "@/server/local-core/data-contracts";
import { createLocalChatRuntime } from "@/server/local-core/chat-runtime";
import type { LocalChatRuntime } from "@/server/local-core/chat-runtime";
import {
  applyExplicitCharacterChoice,
  applyExplicitCharacterChoices,
  buildCharacterDraft,
  detectExplicitCharacterChoices,
  getCharacterCreationState,
} from "@/server/characters/chat-creation";
import {
  CHARACTER_OFFICES,
  CHARACTER_PEOPLES,
  CHARACTER_ORIGINS,
  CHARACTER_RULESET,
  mechanicalFingerprint,
  type CharacterSnapshot,
  validateCharacterSnapshot,
} from "@/server/characters/character-canon";
const MAX_TOOL_CALLS_PER_TURN = 4;
const MAX_RULE_TEXT = 4_000;
const MAX_BIOGRAPHY = 2_500;

type ToolStatus =
  | "success"
  | "not_found"
  | "forbidden"
  | "validation_error"
  | "requires_confirmation";

type ToolResult = {
  status: ToolStatus;
  code?: string;
  [key: string]: unknown;
};

export type KallistisToolInput = {
  databaseUrl: string;
  userId: string;
  threadId: string;
  requestId: string;
  scope: ChatScope;
  activeCharacterId?: string | null;
};

function safeText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function findEditableCharacter(
  runtime: ReturnType<typeof createLocalChatRuntime>,
  userId: string,
  characterId?: string,
) {
  if (!characterId) return null;
  return runtime.characters?.get(userId, characterId) ?? null;
}

async function saveCharacterDraftSnapshot(input: {
  runtime: LocalChatRuntime;
  userId: string;
  threadId: string;
  character: NonNullable<Awaited<ReturnType<NonNullable<LocalChatRuntime["characters"]>["get"]>>>;
  snapshot: CharacterSnapshot;
}): Promise<ToolResult> {
  const character = input.character;
  if (!["draft", "rejected"].includes(character.status))
    return { status: "forbidden", code: "character_not_editable" };
  if (
    input.snapshot.povo &&
    !(CHARACTER_PEOPLES as readonly string[]).includes(String(input.snapshot.povo))
  )
    return { status: "validation_error", code: "forge_draft_people_invalid" };
  const trails = Array.isArray(input.snapshot.trilhas) ? input.snapshot.trilhas : [];
  if (
    trails.some(
      (trail) =>
        trail &&
        typeof trail === "object" &&
        !Array.isArray(trail) &&
        Boolean((trail as Record<string, unknown>).oficio) &&
        !(CHARACTER_OFFICES as readonly string[]).includes(
          String((trail as Record<string, unknown>).oficio),
        ),
    )
  )
    return { status: "validation_error", code: "forge_draft_office_invalid" };
  const updated = await input.runtime.characters?.save(
    input.userId,
    character.id,
    input.snapshot,
    mechanicalFingerprint(input.snapshot),
    character.version,
  );
  if (!updated) return { status: "validation_error", code: "forge_draft_not_saved" };
  if (input.runtime.chat.updatePlayerExperience)
    await input.runtime.chat.updatePlayerExperience(
      input.userId,
      input.threadId,
      "CHARACTER_CREATION",
      updated.id,
    );
  const trail = Array.isArray(updated.snapshot.trilhas)
    ? updated.snapshot.trilhas[Number(updated.snapshot.trilhaAtiva) || 0]
    : null;
  const creationState = getCharacterCreationState(updated.snapshot);
  return {
    status: "success",
    draftUpdated: updated.version !== character.version,
    characterId: updated.id,
    nome: safeText(updated.snapshot.nome, 160),
    jogador: safeText(updated.snapshot.jogador, 160),
    povo: safeText(updated.snapshot.povo, 100),
    oficio:
      trail && typeof trail === "object"
        ? safeText((trail as Record<string, unknown>).oficio, 100)
        : "",
    version: updated.version,
    authoritativeReadback: true,
    nextField: creationState.nextField?.key ?? null,
    nextPrompt: creationState.nextPrompt,
    missingFields: creationState.missing.map((field) => field.key),
  };
}

async function saveCharacterDraftChoice(input: {
  runtime: LocalChatRuntime;
  userId: string;
  threadId: string;
  characterId?: string | null;
  povo?: (typeof CHARACTER_PEOPLES)[number];
  oficio?: (typeof CHARACTER_OFFICES)[number];
}): Promise<ToolResult> {
  const character = await findEditableCharacter(
    input.runtime,
    input.userId,
    input.characterId ?? undefined,
  );
  if (!character) return { status: "not_found", code: "forge_draft_not_found" };
  const nextSnapshot = structuredClone(character.snapshot);
  if (input.povo) nextSnapshot.povo = input.povo;
  if (input.oficio) {
    const trails = Array.isArray(nextSnapshot.trilhas) ? nextSnapshot.trilhas : [];
    const index = Number.isInteger(nextSnapshot.trilhaAtiva) ? Number(nextSnapshot.trilhaAtiva) : 0;
    const trail = trails[index];
    if (!trail || typeof trail !== "object" || Array.isArray(trail))
      return { status: "validation_error", code: "forge_draft_trail_not_found" };
    const choice = { field: "oficio" as const, value: input.oficio };
    const mapped = applyExplicitCharacterChoice(nextSnapshot, choice);
    return saveCharacterDraftSnapshot({ ...input, character, snapshot: mapped });
  }
  return saveCharacterDraftSnapshot({ ...input, character, snapshot: nextSnapshot });
}

const CHARACTER_CREATION_PATCH_FIELDS = new Set([
  "nome",
  "conceito",
  "pronomes",
  "campanha",
  "apelido",
  "descricao",
  "aparencia",
  "biografia",
  "manifestacao_pessoal",
  "capacidade_manifestacoes",
  "montaria",
  "pet",
  "povo",
  "heranca",
  "escolhasPovo",
  "pericaLivre",
  "aspectoOutro",
  "tecnicaHeranca",
  "origem",
  "origemDetalhe",
  "origemBeneficio",
  "dividaComunitaria",
  "origemTrocado",
  "trilhas",
  "atributosBase",
  "atributosGanhos",
  "periciasBase",
  "periciasProveniencia",
  "equipamento",
  "vinculos",
  "promessa",
  "ferida",
  "pergunta",
  "reservas",
  "condicoes",
  "anotacoes",
  "retrato",
  "galeria",
]);

function mergeCharacterCreationPatch(
  current: CharacterSnapshot,
  patch: Record<string, unknown>,
): CharacterSnapshot {
  const next = structuredClone(current);
  const merge = (before: unknown, value: unknown): unknown => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return structuredClone(value);
    const result =
      before && typeof before === "object" && !Array.isArray(before) ? structuredClone(before) : {};
    for (const [key, nested] of Object.entries(value))
      (result as Record<string, unknown>)[key] = merge(
        (result as Record<string, unknown>)[key],
        nested,
      );
    return result;
  };
  for (const [key, value] of Object.entries(patch)) {
    if (key === "trilhas" && Array.isArray(value)) {
      const currentTrails = Array.isArray(next.trilhas) ? next.trilhas : [];
      next.trilhas = value.map((trail, index) => merge(currentTrails[index], trail)) as unknown[];
    } else {
      next[key] = merge(next[key], value);
    }
  }
  return next;
}

export async function applyCharacterCreationPatch(input: {
  runtime: LocalChatRuntime;
  userId: string;
  threadId: string;
  activeCharacterId?: string | null;
  scope: ChatScope;
  patch: Record<string, unknown>;
}): Promise<ToolResult | null> {
  if (input.scope !== "character_creation") return null;
  const invalidFields = Object.keys(input.patch).filter(
    (key) => !CHARACTER_CREATION_PATCH_FIELDS.has(key),
  );
  if (invalidFields.length)
    return { status: "validation_error", code: "creation_patch_field_forbidden", invalidFields };
  if (Object.hasOwn(input.patch, "capacidade_manifestacoes")) {
    const manifestations = input.patch.capacidade_manifestacoes;
    if (
      !manifestations ||
      typeof manifestations !== "object" ||
      Array.isArray(manifestations) ||
      Object.keys(manifestations).length > 128 ||
      Object.entries(manifestations).some(
        ([key, value]) =>
          !/^(ability|technique|magic):[A-Za-z0-9._-]+$/.test(key) ||
          typeof value !== "string" ||
          value.length > 10_000,
      )
    )
      return { status: "validation_error", code: "ability_manifestations_invalid" };
  }
  const character = await findEditableCharacter(
    input.runtime,
    input.userId,
    input.activeCharacterId ?? undefined,
  );
  if (!character) return { status: "not_found", code: "forge_draft_not_found" };
  const result = await saveCharacterDraftSnapshot({
    runtime: input.runtime,
    userId: input.userId,
    threadId: input.threadId,
    character,
    snapshot: mergeCharacterCreationPatch(character.snapshot, input.patch),
  });
  return { ...result, updatedFields: Object.keys(input.patch) };
}

export async function applyExplicitCharacterDraftChoice(input: {
  runtime: LocalChatRuntime;
  userId: string;
  threadId: string;
  scope: ChatScope;
  activeCharacterId?: string | null;
  text: string;
}): Promise<ToolResult | null> {
  if (input.scope !== "character_creation") return null;
  const choices = detectExplicitCharacterChoices(input.text);
  if (!choices.length) return null;
  let current = await findEditableCharacter(
    input.runtime,
    input.userId,
    input.activeCharacterId ?? undefined,
  );
  if (!current && input.runtime.characters?.create) {
    const seed = buildCharacterDraft("", "", "");
    current = await input.runtime.characters.create(
      input.userId,
      randomUUID(),
      seed,
      CHARACTER_RULESET,
      mechanicalFingerprint(seed),
    );
  }
  if (!current) return { status: "not_found", code: "forge_draft_not_found" };
  const next = applyExplicitCharacterChoices(current.snapshot, choices);
  const result = await saveCharacterDraftSnapshot({
    runtime: input.runtime,
    userId: input.userId,
    threadId: input.threadId,
    character: current,
    snapshot: next,
  });
  return {
    ...result,
    explicitChoices: choices,
    explicitChoice: choices[0],
    targetField: choices[0].field,
    targetValue: choices[0].value,
  };
}

export function createKallistisTools(input: KallistisToolInput) {
  let callCount = 0;

  async function runTool(name: string, execute: () => Promise<ToolResult>): Promise<ToolResult> {
    callCount += 1;
    if (callCount > MAX_TOOL_CALLS_PER_TURN) {
      console.info(
        JSON.stringify({
          level: "info",
          type: "chat_tool_result",
          request_id: input.requestId,
          tool_name: name,
          status: "validation_error",
          call_number: callCount,
        }),
      );
      return { status: "validation_error", code: "tool_call_limit" };
    }
    try {
      const result = await execute();
      console.info(
        JSON.stringify({
          level: "info",
          type: "chat_tool_result",
          request_id: input.requestId,
          tool_name: name,
          status: result.status,
          call_number: callCount,
        }),
      );
      return result;
    } catch {
      console.warn(
        JSON.stringify({
          level: "warn",
          type: "chat_tool_result",
          request_id: input.requestId,
          tool_name: name,
          status: "validation_error",
          call_number: callCount,
        }),
      );
      return { status: "validation_error", code: "tool_execution_failed" };
    }
  }

  const consultRule = tool({
    description:
      "Consulta uma regra normativa do cânone KALLISTIS por termos fornecidos pelo usuário.",
    inputSchema: z.object({ query: z.string().trim().min(1).max(200) }).strict(),
    execute: ({ query }) =>
      runTool("consult_rule", async () => {
        const matches = retrieveCanonicalRules(query);
        if (!matches.length) return { status: "not_found", code: "rule_not_found" };
        return {
          status: "success",
          sourceId: matches[0].sourceId,
          sourceVersion: matches[0].sourceVersion,
          sections: matches.slice(0, 6).map((match) => ({
            section: match.section,
            text: safeText(match.text, MAX_RULE_TEXT),
          })),
        };
      }),
  });

  const consultCampaign = tool({
    description: "Consulta apenas a campanha já autorizada para a conversa atual.",
    // Keep malformed model output inside the tool contract. Zod rejecting an
    // invalid UUID here aborts the whole UI stream before the assistant can
    // recover and answer the user's actual question.
    inputSchema: z.object({ campaignId: z.string().optional() }).strict(),
    execute: ({ campaignId }) =>
      runTool("consult_campaign", async () => {
        if (campaignId && !z.string().uuid().safeParse(campaignId).success)
          return { status: "not_found", code: "invalid_campaign_id" };
        const runtime = createLocalChatRuntime(input.databaseUrl);
        try {
          const thread = await runtime.chat.getThreadById(input.userId, input.threadId);
          if (!thread?.campaignId) return { status: "not_found", code: "campaign_not_selected" };
          if (campaignId && campaignId !== thread.campaignId)
            return { status: "forbidden", code: "campaign_not_in_thread" };
          const campaign =
            thread.scope === "master"
              ? await runtime.campaigns?.getMasterAuthorized(input.userId, thread.campaignId)
              : await runtime.campaigns?.getAuthorized(input.userId, thread.campaignId);
          if (!campaign) return { status: "forbidden", code: "campaign_not_authorized" };
          return {
            status: "success",
            campaign: {
              id: campaign.id,
              name: campaign.name,
              mesaName: campaign.mesaName,
              status: campaign.status,
            },
          };
        } finally {
          runtime.close();
        }
      }),
  });

  const consultCharacter = tool({
    description: "Consulta uma ficha de personagem pertencente ao usuário autenticado.",
    inputSchema: z.object({ characterId: z.string().trim().min(1).max(200).optional() }).strict(),
    execute: ({ characterId }) =>
      runTool("consult_character", async () => {
        const runtime = createLocalChatRuntime(input.databaseUrl);
        try {
          if (input.scope !== "general" && !input.activeCharacterId)
            if (input.scope !== "character_creation")
              return { status: "not_found", code: "active_character_not_selected" };
          const characterIdForLookup =
            input.scope !== "general" ? input.activeCharacterId : characterId;
          const draft =
            input.scope === "character_creation" && !characterIdForLookup
              ? (await runtime.characters?.list(input.userId))?.find((item) =>
                  ["draft", "rejected"].includes(item.status),
                )
              : null;
          const characterIdToLookup = characterIdForLookup ?? draft?.id;
          if (!characterIdToLookup)
            return { status: "not_found", code: "active_character_not_selected" };
          const character = await runtime.characters?.get(input.userId, characterIdToLookup);
          if (!character || character.status === "archived")
            return { status: "not_found", code: "character_not_found" };
          return {
            status: "success",
            character: {
              id: character.id,
              name: character.name,
              playerName: character.playerName,
              status: character.status,
              version: character.version,
              povo: safeText(character.snapshot.povo, 100),
              oficio: safeText(
                Array.isArray(character.snapshot.trilhas)
                  ? (character.snapshot.trilhas[0] as { oficio?: unknown })?.oficio
                  : "",
                100,
              ),
              biography: safeText(character.snapshot.biografia, MAX_BIOGRAPHY),
            },
          };
        } finally {
          runtime.close();
        }
      }),
  });

  const updateCharacterDraft = tool({
    description:
      "Atualiza no Character Forge somente escolhas de Povo e Ofício declaradas inequivocamente pelo usuário. Nome e sobrenome declarados são persistidos pelo detector determinístico antes da resposta. Nunca cria uma personagem completa, inventa campos ou altera uma ficha protegida.",
    inputSchema: z
      .object({
        characterId: z.string().trim().min(1).max(200).optional(),
        povo: z.enum(CHARACTER_PEOPLES).optional(),
        oficio: z.enum(CHARACTER_OFFICES).optional(),
      })
      .strict()
      .refine((value) => Boolean(value.povo || value.oficio), "draft_choice_required"),
    execute: ({ characterId, povo, oficio }) =>
      runTool("update_character_draft", async () => {
        if (input.scope !== "character_creation")
          return { status: "forbidden", code: "character_creation_experience_required" };
        const runtime = createLocalChatRuntime(input.databaseUrl);
        try {
          return saveCharacterDraftChoice({
            runtime,
            userId: input.userId,
            threadId: input.threadId,
            characterId,
            povo,
            oficio,
          });
        } finally {
          runtime.close();
        }
      }),
  });

  const updateCharacterCreationFields = tool({
    description:
      "Persiste incrementalmente campos declarados explicitamente pelo jogador no rascunho atual do Character Forge. Use o histórico para entender a referência do pedido, mas altere somente campos e valores declarados pelo jogador; perguntas, sugestões, exemplos e pedidos de consulta nunca chamam esta ferramenta. Preserve os demais dados. O patch pode conter nome completo, conceito, origem, herança, escolhas condicionais, atributos, perícias, proveniência, equipamento, vínculos, manifestação de capacidades, promessa, ferida, pergunta e campos opcionais. O campo jogador é automático e não pode ser enviado.",
    inputSchema: z
      .object({
        patch: z
          .record(z.string(), z.unknown())
          .refine((value) => Object.keys(value).length > 0, "creation_patch_required"),
      })
      .strict(),
    execute: ({ patch }) =>
      runTool("update_character_creation_fields", async () => {
        const runtime = createLocalChatRuntime(input.databaseUrl);
        try {
          const result = await applyCharacterCreationPatch({
            runtime,
            userId: input.userId,
            threadId: input.threadId,
            activeCharacterId: input.activeCharacterId,
            scope: input.scope,
            patch,
          });
          return result ?? { status: "forbidden", code: "character_creation_experience_required" };
        } finally {
          runtime.close();
        }
      }),
  });

  const proposeCharacterBiographyUpdate = tool({
    description:
      "Prepara um preview de alteração de biografia; nunca grava sem confirmação explícita.",
    inputSchema: z
      .object({
        characterId: z.string().trim().min(1).max(200),
        biography: z.string().trim().min(1).max(MAX_BIOGRAPHY),
      })
      .strict(),
    execute: ({ characterId, biography }) =>
      runTool("propose_character_biography_update", async () => {
        if (input.scope !== "character_creation")
          return { status: "forbidden", code: "character_surface_required" };
        const runtime = createLocalChatRuntime(input.databaseUrl);
        try {
          const characterIdForLookup = input.activeCharacterId ?? characterId;
          if (!characterIdForLookup)
            return { status: "not_found", code: "active_character_not_selected" };
          const character = await runtime.characters?.get(input.userId, characterIdForLookup);
          if (!character) return { status: "not_found", code: "character_not_found" };
          if (!(["draft", "rejected"] as string[]).includes(character.status))
            return { status: "forbidden", code: "character_not_editable" };
          if (!runtime.mutations)
            return { status: "validation_error", code: "mutation_unavailable" };
          const mutation = await runtime.mutations.createCharacterBiographyPreview({
            id: randomUUID(),
            operationId: randomUUID(),
            userId: input.userId,
            threadId: input.threadId,
            characterId: character.id,
            expectedVersion: character.version,
            beforeBiography: safeText(character.snapshot.biografia, MAX_BIOGRAPHY),
            nextBiography: biography,
            expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
          });
          return {
            status: "requires_confirmation",
            operation: mutation.operation,
            confirmationId: mutation.id,
            operationId: mutation.operationId,
            characterId: mutation.characterId,
            expectedVersion: mutation.expectedVersion,
            beforeBiography: mutation.beforeBiography,
            nextBiography: mutation.nextBiography,
            expiresAt: mutation.expiresAt,
          };
        } finally {
          runtime.close();
        }
      }),
  });

  const proposeCharacterCreate = tool({
    description:
      "Prepara um preview de criação de personagem. Quando a conversa já tiver coletado e normalizado os dados, envie o snapshot canônico COMPLETO nesta chamada — não envie apenas nome, povo, ofício e biografia. O snapshot deve seguir exatamente o modelo do Character Forge, com completo=true, origem, conceito {identidade, objetivo, perda}, trilhas completas (papel, chave, técnica inicial e perícias), atributosBase, periciasBase, periciasProveniencia, equipamento, vínculos, promessa, ferida e pergunta. Use apenas valores já normalizados pelo cânone (por exemplo, Guardião, nunca Guardiã). A validação canônica é obrigatória e nada grava sem confirmação explícita.",
    inputSchema: z
      .object({
        snapshot: z
          .object({
            ruleset: z.literal(CHARACTER_RULESET),
            nome: z.string().trim().min(2).max(160),
            jogador: z.string().trim().max(160).optional(),
            povo: z.enum(CHARACTER_PEOPLES),
            heranca: z.string().trim().min(1).max(160),
            origem: z.enum(CHARACTER_ORIGINS),
            conceito: z
              .object({
                identidade: z.string().trim().min(1).max(500),
                objetivo: z.string().trim().min(1).max(500),
                perda: z.string().trim().min(1).max(500),
              })
              .strict(),
            biografia: z.string().trim().max(MAX_BIOGRAPHY).optional(),
            completo: z.literal(true),
            trilhas: z
              .array(
                z
                  .object({
                    id: z.string().trim().min(1).max(160),
                    oficio: z.enum(CHARACTER_OFFICES),
                    marco: z.number().int().min(1).max(15),
                    papel: z.string().trim().min(1).max(160),
                    chave: z.string().trim().min(1).max(160),
                    tecnicas: z.array(z.string().trim().min(1)).min(1),
                    pericias: z.array(z.string().trim().min(1)).min(1),
                    pericaEscolhida: z.string().trim().max(160).optional(),
                    especializacoes: z.array(z.string().trim().min(1)).optional(),
                    ganhos: z.record(z.string(), z.unknown()),
                    atributosGanhos: z.record(z.string(), z.number()),
                  })
                  .passthrough(),
              )
              .min(1),
            trilhaAtiva: z.number().int().nonnegative(),
            atributosBase: z.record(z.string(), z.number()),
            periciasBase: z.record(z.string(), z.number()),
            periciasProveniencia: z.record(
              z.string(),
              z
                .object({
                  base: z.number(),
                  bonus: z.number(),
                  fontes: z.array(z.string().trim().min(1)),
                })
                .strict(),
            ),
            equipamento: z
              .object({
                arma: z.string().trim().min(1).max(160),
                armadura: z.string().trim().min(1).max(160),
                ferramenta: z.string().trim().min(1).max(160),
                consumiveis: z.array(z.string().trim().min(1)).min(2),
                extras: z.array(z.string().trim().min(1)),
                proficienciaConfirmada: z.literal(true),
              })
              .passthrough(),
            vinculos: z.array(z.string().trim().min(1)).min(3),
            promessa: z.string().trim().min(1).max(1000),
            ferida: z.string().trim().min(1).max(1000),
            pergunta: z.string().trim().min(1).max(1000),
          })
          .passthrough(),
      })
      .strict(),
    execute: ({ snapshot }) =>
      runTool("propose_character_create", async () => {
        if (input.scope !== "character_creation")
          return { status: "forbidden", code: "character_creation_experience_required" };
        const candidate = snapshot as CharacterSnapshot;
        const validation = validateCharacterSnapshot(candidate, true);
        if (!validation.ok) {
          console.info(
            JSON.stringify({
              level: "info",
              type: "character_create_snapshot_rejected",
              request_id: input.requestId,
              errors: validation.errors,
            }),
          );
          return {
            status: "validation_error",
            code: "character_snapshot_invalid",
            errors: validation.errors,
          };
        }
        const runtime = createLocalChatRuntime(input.databaseUrl);
        try {
          const existing = await runtime.characters?.list(input.userId);
          if (
            existing?.some(
              (character) =>
                character.name === String(candidate.nome) && character.status !== "archived",
            )
          )
            return { status: "validation_error", code: "character_name_already_exists" };
          if (!runtime.mutations)
            return { status: "validation_error", code: "mutation_unavailable" };
          const mutation = await runtime.mutations.createCharacterCreatePreview({
            id: randomUUID(),
            operationId: randomUUID(),
            userId: input.userId,
            threadId: input.threadId,
            plannedCharacterId: randomUUID(),
            payload: {
              snapshot: candidate,
              ruleset: CHARACTER_RULESET,
              mechanicalFingerprint: mechanicalFingerprint(candidate),
            },
            expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
          });
          return {
            status: "requires_confirmation",
            operation: mutation.operation,
            confirmationId: mutation.id,
            operationId: mutation.operationId,
            name: String(candidate.nome),
            povo: String(candidate.povo),
            oficio: String((candidate.trilhas as Array<{ oficio: string }>)[0]?.oficio ?? ""),
            biografia: safeText(candidate.biografia, MAX_BIOGRAPHY),
            expiresAt: mutation.expiresAt,
          };
        } finally {
          runtime.close();
        }
      }),
  });

  const tools = {
    consult_rule: consultRule,
    consult_campaign: consultCampaign,
    consult_character: consultCharacter,
    ...(input.scope === "character_creation"
      ? {
          update_character_draft: updateCharacterDraft,
          update_character_creation_fields: updateCharacterCreationFields,
        }
      : {}),
    ...(input.scope === "character_creation"
      ? {
          propose_character_biography_update: proposeCharacterBiographyUpdate,
          ...(input.scope === "character_creation"
            ? { propose_character_create: proposeCharacterCreate }
            : {}),
        }
      : {}),
  };

  return tools;
}

export const KALLISTIS_MAX_TOOL_CALLS_PER_TURN = MAX_TOOL_CALLS_PER_TURN;
