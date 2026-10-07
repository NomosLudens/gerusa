// Hook de autorização — unifica role, assigned_facet e permissões de acesso.
// FacetSlug permanece como alias de compatibilidade: agora representa permissão de acesso, não faceta técnica de motor.
import { useEffect, useState, useCallback } from "react";
import { getLocalSession } from "@/lib/local-auth-client";
import {
  DEFAULT_AUTHENTICATED_PATH,
  getCanonicalPathForAccessFacet,
  normalizeAccessFacet,
  isArchivedApp,
} from "@/lib/identity-routing";
import {
  APP_REGISTRY,
  getAppByPath,
  getHomeRegistryApps,
  getSidebarRegistryApps,
  isAppVisible,
  resolveLegacyPath,
  type AccessFacet,
  type AppRegistryItem,
  type AppRole,
  type EngineFacet,
} from "@/lib/app-registry";

export type FacetSlug = AccessFacet;
export type { AccessFacet, AppRegistryItem };

export type AuthzUser = {
  role: AppRole | null;
  assignedFacet: AccessFacet | null;
  isAdmin: boolean;
  isMaster: boolean;
  allowedFacets: AccessFacet[];
  allowedAppIds?: string[] | null;
};

export type AuthzState = AuthzUser & { loading: boolean };

const ALL_FACETS: AccessFacet[] = ["kallistis"];

function normalizeRole(raw: string | null | undefined): AppRole {
  return raw === "admin" || raw === "guardian" || raw === "user" ? raw : "user";
}

export function getEngineFacetForAccessFacet(facet: AccessFacet | null): EngineFacet | null {
  switch (facet) {
    case "kallistis":
      return "kallistis";
    default:
      return null;
  }
}

export function canAccessApp(user: AuthzUser | AuthzState, app: AppRegistryItem): boolean {
  if (app.status === "hidden") return false;
  if (user.isAdmin) return true;
  if (app.status === "planned") return false;
  if (app.adminOnly) return false;
  if (app.id === "mesa-do-mestre" && !user.isMaster) return false;
  // Personagens é a porta canônica da jornada; as ferramentas internas continuam
  // protegidas por suas próprias rotas/autorizações.
  if (user.allowedAppIds && !user.allowedAppIds.includes(app.id) && app.id !== "personagens")
    return false;
  if (app.allowedRoles?.length && (!user.role || !app.allowedRoles.includes(user.role)))
    return false;
  if (!app.allowedFacets?.length) return true;
  return user.allowedFacets.some((facet) => app.allowedFacets?.includes(facet));
}

export function canAccessPath(user: AuthzUser | AuthzState, path: string): boolean {
  const target = resolveLegacyPath(path) ?? path;
  const app = getAppByPath(target);

  // Rotas autenticadas ainda não catalogadas continuam acessíveis só para admin.
  if (!app) return user.isAdmin;

  // Kallistis Clean: app arquivado não abre nem por URL direta.
  if (isArchivedApp(app.id)) return false;

  return canAccessApp(user, app);
}

export function getAllowedApps(user: AuthzUser | AuthzState): AppRegistryItem[] {
  return APP_REGISTRY.filter((app) => isAppVisible(app) && canAccessApp(user, app));
}

export function getSidebarApps(user: AuthzUser | AuthzState): AppRegistryItem[] {
  const allowed = new Set(["personagens", "kallistis-chat", "mesa-do-mestre", "perfil"]);
  return getSidebarRegistryApps()
    .filter((app) => allowed.has(app.id) && canAccessApp(user, app))
    .map((app) => ({
      ...app,
      label:
        app.id === "kallistis-chat"
          ? "Conversa com Gerusa"
          : app.id === "mesa-do-mestre"
            ? "Mesa da professora"
            : app.id === "personagens"
              ? "Meu personagem"
              : "Meu perfil",
      sidebarLabel:
        app.id === "kallistis-chat"
          ? "Gerusa"
          : app.id === "mesa-do-mestre"
            ? "Professora"
            : app.id === "personagens"
              ? "Personagem"
              : "Perfil",
    }));
}

export function getHomeApps(user: AuthzUser | AuthzState): AppRegistryItem[] {
  return getHomeRegistryApps().filter((app) => canAccessApp(user, app));
}

export function getDefaultPathForUser(_user: AuthzUser | AuthzState): string {
  return DEFAULT_AUTHENTICATED_PATH;
}

export { normalizeAccessFacet, resolveLegacyPath };

function buildState(
  roleRaw: string | null | undefined,
  facetRaw: string | null | undefined,
  allowedAppIds: string[] | null = null,
  isMaster = false,
): AuthzState {
  const role = normalizeRole(roleRaw);
  const assignedFacet = normalizeAccessFacet(facetRaw);
  const isAdmin = role === "admin";
  const allowedFacets = ["kallistis"] as AccessFacet[];
  return {
    role,
    assignedFacet,
    isAdmin,
    isMaster: isAdmin || isMaster,
    allowedFacets,
    allowedAppIds,
    loading: false,
  };
}

const EMPTY_AUTHZ: AuthzState = {
  role: null,
  assignedFacet: null,
  isAdmin: false,
  isMaster: false,
  allowedFacets: [],
  allowedAppIds: null,
  loading: false,
};

// Cache de módulo: a sessão local é buscada uma única vez por
// sessão de página e compartilhado entre getAuthz() (beforeLoad de rotas) e
// useAuthz() (sidebar/home). O cache se auto-invalida quando o usuário da
// sessão muda (login/logout), comparando o user.id atual com o cacheado. A
// autorização sensível continua validada no servidor a cada chamada de API;
// este estado só decide navegação e menus.
let authzCache: { userId: string; promise: Promise<AuthzState> } | null = null;

async function loadAuthz(): Promise<AuthzState> {
  const session = await getLocalSession();
  const user = session?.user;
  if (!user) {
    authzCache = null;
    return EMPTY_AUTHZ;
  }
  if (authzCache && authzCache.userId === user.id) return authzCache.promise;

  const promise = fetch("/api/profile", { credentials: "same-origin", cache: "no-store" })
    .then((response) =>
      response.ok
        ? (response.json() as Promise<{
            is_system_master?: boolean;
            is_master?: boolean;
            allowed_app_ids?: string[];
          }>)
        : null,
    )
    .then((profile) =>
      buildState(
        profile?.is_system_master ? "admin" : null,
        null,
        profile?.is_system_master ? null : (profile?.allowed_app_ids ?? null),
        profile?.is_master ?? false,
      ),
    );
  authzCache = { userId: user.id, promise };
  // Falha de rede não deve ficar cacheada — a próxima chamada tenta de novo.
  promise.catch(() => {
    if (authzCache?.promise === promise) authzCache = null;
  });
  return promise;
}

export function useAuthz(): AuthzState {
  const [state, setState] = useState<AuthzState>({
    role: null,
    assignedFacet: null,
    isAdmin: false,
    isMaster: false,
    allowedFacets: [],
    allowedAppIds: null,
    loading: true,
  });
  const load = useCallback(async () => {
    try {
      setState(await loadAuthz());
    } catch {
      setState(EMPTY_AUTHZ);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return state;
}

export async function getAuthz(): Promise<AuthzState> {
  return loadAuthz();
}

export function getChatRouteForFacet(facet: FacetSlug | null): string {
  return getCanonicalPathForAccessFacet(facet);
}
