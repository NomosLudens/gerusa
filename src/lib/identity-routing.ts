export type ProductIdentity = "KALLISTIS";
export type AssistantIdentity = "KALLISTIS";
export type PlayerExperience = "CHARACTER_CREATION" | "CAMPAIGN" | "ONTOLOGICAL";
export type ContextState = "UNKNOWN" | "NOT_SELECTED" | "NOT_AVAILABLE" | "DEFERRED";
export type ChatSurface = "GENERAL" | "CHARACTER" | "MASTER";

export type IdentityRoute = {
  product: ProductIdentity;
  assistant: AssistantIdentity;
  userId: string;
  profile: string | null;
  profilePronouns: string | null;
  role: string | null;
  campaign: ContextState | string;
  table: ContextState | string;
  scene: ContextState | string;
  character: ContextState | string;
  surface: ChatSurface;
  requestedVoice: AssistantIdentity;
  allowedContext: "AUTHORIZED_USER_SCOPE" | "DENIED_CROSS_PROFILE";
};

export type IdentityRouteInput = {
  userId: string;
  profileId?: string | null;
  profileLabel?: string | null;
  profilePronouns?: string | null;
  role?: string | null;
  campaignId?: string | null;
  tableId?: string | null;
  sceneId?: string | null;
  characterId?: string | null;
  surface?: ChatSurface | null;
  requestedVoice?: string | null;
};

export const CANONICAL_IDENTITY = "KALLISTIS" as const;
export const ASSISTANT_IDENTITY = "KALLISTIS" as const;
export const CANONICAL_IDENTITY_SOURCE_PATH = "CANON/IDENTIDADE.md" as const;
export const DEFAULT_AUTHENTICATED_PATH = "/chat" as const;

export const ACTIVE_PUBLIC_APP_IDS = [
  "kallistis-chat",
  "kallistis-presente",
  "personagens",
  "character-forge",
  "galeria",
  "velarim",
  "canon-explorer",
  "agenda",
  "registro-vivo",
  "jardim",
  "revisao",
  "perfil",
  "perfis",
  "mesa-do-mestre",
] as const;

export const ARCHIVED_APP_IDS = [] as const;

export function resolveIdentityRoute(input: IdentityRouteInput): IdentityRoute {
  const profileId = input.profileId?.trim() || null;
  const profile = input.profileLabel?.trim() || profileId;
  const crossProfile = Boolean(profileId && profileId !== input.userId);
  const profilePronouns = !crossProfile ? input.profilePronouns?.trim() || null : null;
  return {
    product: CANONICAL_IDENTITY,
    assistant: ASSISTANT_IDENTITY,
    userId: input.userId,
    profile,
    profilePronouns,
    role: input.role?.trim() || null,
    campaign: input.campaignId?.trim() || "NOT_SELECTED",
    table: input.tableId?.trim() || "NOT_SELECTED",
    scene: input.sceneId?.trim() || "NOT_SELECTED",
    character: input.characterId?.trim() || "NOT_AVAILABLE",
    surface: input.surface ?? "GENERAL",
    requestedVoice: ASSISTANT_IDENTITY,
    allowedContext: crossProfile ? "DENIED_CROSS_PROFILE" : "AUTHORIZED_USER_SCOPE",
  };
}

export function renderIdentityRouteBlock(route: IdentityRoute): string {
  return `=== ROTEADOR DE IDENTIDADE ===
produto=${route.product}
assistente=${route.assistant}
user_id=${route.userId}
perfil=${route.profile ?? "UNKNOWN"}
pronomes=${route.profilePronouns ?? "UNKNOWN"}
papel=${route.role ?? "UNKNOWN"}
campanha=${route.campaign}
mesa=${route.table}
cena=${route.scene}
personagem=${route.character}
superficie=${route.surface}
contexto=${route.allowedContext}
Falha fechada: não invente vínculos ausentes nem atravesse o escopo autenticado.`;
}

export function normalizeAccessFacet(raw: string | null | undefined): "kallistis" | null {
  return raw === "kallistis" ? raw : null;
}

export function getCanonicalIdentityForAccessFacet(
  _facet: "kallistis" | null,
): typeof CANONICAL_IDENTITY {
  return CANONICAL_IDENTITY;
}

export function getDefaultPathForIdentity(): string {
  return DEFAULT_AUTHENTICATED_PATH;
}

export function getCanonicalPathForAccessFacet(_facet: "kallistis" | null): string {
  return DEFAULT_AUTHENTICATED_PATH;
}

export function isActivePublicApp(appId: string): boolean {
  return ACTIVE_PUBLIC_APP_IDS.includes(appId as (typeof ACTIVE_PUBLIC_APP_IDS)[number]);
}

export function isArchivedApp(appId: string): boolean {
  return ARCHIVED_APP_IDS.includes(appId as (typeof ARCHIVED_APP_IDS)[number]);
}
