import { createPostgresCharacterRepository } from "@/server/characters/repository";
import type {
  CampaignRepository,
  ChatRepository,
  MemoryRepository,
  MutationRepository,
  SedimentationRepository,
} from "./data-contracts";
import { createBunPostgresExecutor, type SqlExecutor } from "./postgres";
import {
  createPostgresChatRepository,
  createPostgresCampaignRepository,
  createPostgresMemoryRepository,
  createPostgresMutationRepository,
  createPostgresSedimentationRepository,
  getHermesIdentityForUser,
  type HermesIdentityRecord,
} from "./postgres-repositories";

export type LocalChatRuntime = {
  campaigns?: CampaignRepository;
  chat: ChatRepository;
  characters?: ReturnType<typeof createPostgresCharacterRepository>;
  memory: MemoryRepository;
  mutations?: MutationRepository;
  sedimentation: SedimentationRepository;
  identity?: {
    getForUser(userId: string): Promise<HermesIdentityRecord>;
  };
  close: () => void;
  databaseUrl: string;
};

export function createLocalChatRuntime(databaseUrl: string): LocalChatRuntime {
  const sql: SqlExecutor = createBunPostgresExecutor(databaseUrl);
  return {
    campaigns: createPostgresCampaignRepository(sql),
    chat: createPostgresChatRepository(sql),
    characters: createPostgresCharacterRepository(sql),
    memory: createPostgresMemoryRepository(sql),
    mutations: createPostgresMutationRepository(sql),
    sedimentation: createPostgresSedimentationRepository(sql),
    identity: {
      getForUser: (userId) => getHermesIdentityForUser(sql, userId),
    },
    close: () => sql.close(),
    databaseUrl,
  };
}
