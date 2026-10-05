import type { PlayerExperience } from "../../lib/identity-routing";

export type ChatResponseMode =
  | "ASSISTENTE"
  | "MESTRE"
  | "NARRADOR"
  | "PERSONAGEM"
  | "NPC"
  | "COMPANHEIRO"
  | "REGRA"
  | "EDITORIAL";

export type ChatScope = "general" | "character_creation" | "master";
export const CHAT_SCOPE_MARKERS: Record<ChatScope, string> = {
  general: "[KALLISTIS_SCOPE:general]",
  character_creation: "[KALLISTIS_SCOPE:character_creation]",
  master: "[KALLISTIS_SCOPE:master]",
};

export function chatScopeMarker(scope: ChatScope): string {
  return CHAT_SCOPE_MARKERS[scope];
}

export type ChatThread = {
  id: string;
  userId: string;
  surface: string;
  facet: string;
  title: string | null;
  createdAt: string;
  lastSedimentadoAt: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  mesaId?: string | null;
  scope?: ChatScope;
  /** @deprecated persisted only for historical compatibility; never drives behavior. */
  responseMode?: ChatResponseMode;
  /** @deprecated persisted only for historical compatibility; never drives behavior. */
  roleplayTargetId?: string | null;
  /** @deprecated persisted only for historical compatibility; ChatScope drives behavior. */
  playerExperience?: PlayerExperience | null;
  activeCharacterId?: string | null;
};

export type Campaign = {
  id: string;
  mesaId: string;
  mesaName: string;
  name: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type CampaignMesa = {
  id: string;
  slug: string;
  name: string;
  memberRole: "mestre" | "jogador";
};

export interface CampaignRepository {
  listAuthorized(userId: string): Promise<readonly Campaign[]>;
  listMasterAuthorized(userId: string): Promise<readonly Campaign[]>;
  listMasterMesas(userId: string): Promise<readonly CampaignMesa[]>;
  getAuthorized(userId: string, campaignId: string): Promise<Campaign | null>;
  getMasterAuthorized(userId: string, campaignId: string): Promise<Campaign | null>;
  create(userId: string, mesaId: string, name: string): Promise<Campaign | null>;
}

export type ChatMessage = {
  id: string;
  threadId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  derivedFrom: string[];
  sourceChannel: string | null;
};

export type MemoryCandidate = {
  id: string;
  userId: string;
  title: string;
  content: string;
  status: "pending" | "approved" | "rejected" | "archived";
  createdAt: string;
};

export type GardenMemory = {
  id: string;
  userId: string;
  title: string;
  body: string;
  campaignId?: string | null;
  createdAt: string;
};

export type Sediment = {
  id: string;
  userId: string;
  threadId: string;
  level: string;
  status: "rascunho" | "em_revisao" | "confirmado" | "descartado";
  sourceIds: string[];
  hypothesis: string;
  summary: string | null;
  confidence: number;
  promotedTo: string | null;
  createdAt: string;
};

export interface ChatRepository {
  findCanonicalThread(userId: string): Promise<ChatThread | null>;
  findScopedThread?(userId: string, scope: ChatScope): Promise<ChatThread | null>;
  createThread(thread: ChatThread): Promise<ChatThread>;
  getThreadById(userId: string, threadId: string): Promise<ChatThread | null>;
  insertMessage(message: ChatMessage): Promise<void>;
  listThreadMessages(
    userId: string,
    threadId: string,
    limit: number,
  ): Promise<readonly ChatMessage[]>;
  updateThreadSedimentationCursor(userId: string, threadId: string, at: string): Promise<void>;
  updatePlayerExperience?(
    userId: string,
    threadId: string,
    playerExperience: PlayerExperience | null,
    activeCharacterId: string | null,
  ): Promise<ChatThread | null>;
}

export type PendingCharacterBiographyMutation = {
  id: string;
  operationId: string;
  userId: string;
  threadId: string;
  characterId: string;
  operation: "character_biography_update";
  expectedVersion: number;
  beforeBiography: string;
  nextBiography: string;
  status: "pending" | "executing" | "confirmed" | "cancelled" | "expired";
  createdAt: string;
  expiresAt: string;
  confirmedAt: string | null;
  payload: Record<string, unknown>;
};

export type PendingCharacterCreateMutation = Omit<
  PendingCharacterBiographyMutation,
  "characterId" | "operation" | "expectedVersion" | "beforeBiography" | "nextBiography"
> & {
  characterId: null;
  operation: "character_create";
  expectedVersion: null;
  beforeBiography: null;
  nextBiography: null;
  payload: Record<string, unknown>;
};

export type PendingCharacterMutation =
  | PendingCharacterBiographyMutation
  | PendingCharacterCreateMutation;

export interface MutationRepository {
  createCharacterBiographyPreview(input: {
    id: string;
    operationId: string;
    userId: string;
    threadId: string;
    characterId: string;
    expectedVersion: number;
    beforeBiography: string;
    nextBiography: string;
    expiresAt: string;
  }): Promise<PendingCharacterBiographyMutation>;
  createCharacterCreatePreview(input: {
    id: string;
    operationId: string;
    userId: string;
    threadId: string;
    plannedCharacterId: string;
    payload: Record<string, unknown>;
    expiresAt: string;
  }): Promise<PendingCharacterCreateMutation>;
  getPendingMutation(userId: string, id: string): Promise<PendingCharacterMutation | null>;
  listPendingMutations(userId: string, threadId: string): Promise<PendingCharacterMutation[]>;
  claimPendingMutation(userId: string, id: string): Promise<PendingCharacterMutation | null>;
  releasePendingMutation(userId: string, id: string): Promise<void>;
  completePendingMutation(userId: string, id: string): Promise<void>;
  cancelPendingMutation(userId: string, id: string): Promise<boolean>;
}

export interface MemoryRepository {
  listCandidates(userId: string): Promise<readonly MemoryCandidate[]>;
  listMemories(userId: string, campaignId?: string | null): Promise<readonly GardenMemory[]>;
  listSediments(userId: string, threadId: string): Promise<readonly Sediment[]>;
}

export type SedimentInput = {
  userId: string;
  threadId: string;
  level: string;
  status: Sediment["status"];
  sourceKind: string;
  sourceIds: readonly string[];
  hypothesis: string;
  summary: string | null;
  confidence: number;
};

export interface SedimentationRepository {
  insertSediment(input: SedimentInput): Promise<string>;
  getSediment(userId: string, sedimentId: string): Promise<Sediment | null>;
  discardSediment(userId: string, sedimentId: string, at: string): Promise<boolean>;
  approveMemoryCandidate(
    userId: string,
    candidateId: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  confirmSediment(
    userId: string,
    sedimentId: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  promoteSedimentBatch(
    userId: string,
    threadId: string,
    sourceIds: readonly string[],
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}
