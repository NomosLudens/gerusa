import { isActivePublicApp } from "@/lib/identity-routing";
export type AppDomain = "kallistis" | "memory" | "system";

export type AppSurface =
  | "kallistis"
  | "kallistis-presente"
  | "jardim"
  | "revisao"
  | "registro-vivo"
  | "admin"
  | "profile"
  | "agenda"
  | "refugio";

export type AppKind = "react" | "microapp-html" | "external" | "legacy" | "system";
export type AppStatus = "real" | "mock" | "legacy" | "planned" | "hidden";
export type AppNavGroup =
  | "principal"
  | "jogar"
  | "organizacao"
  | "memory"
  | "conta"
  | "kallistis"
  | "admin";
export type AccessFacet = "kallistis";
export type EngineFacet = "kallistis";
export type AppRole = "admin" | "user" | "guardian";
// prettier-ignore
export type AppMode =
  | "personal"
  | "memory"
  | "system";

export type AppRegistryItem = {
  id: string;
  label: string;
  description?: string;
  path: string;
  legacyPaths?: string[];
  domain: AppDomain;
  surface: AppSurface;
  mode?: AppMode;
  /** Faceta técnica usada por motor/chat/memória/sedimentação. Importante: não adicionar "klio" aqui. */
  engineFacet?: EngineFacet;
  kind: AppKind;
  status: AppStatus;
  icon?: string;
  group?: AppNavGroup;
  groupLabel?: string;
  groupOrder?: number;
  order?: number;
  shortLabel?: string;
  homeDescription?: string;
  sidebarLabel?: string;
  badge?: string;
  sidebar?: boolean;
  home?: boolean;
  adminOnly?: boolean;
  /** Permissões/perfis que podem acessar a superfície. Aqui "klio" pode existir como permissão restrita. */
  allowedFacets?: AccessFacet[];
  allowedRoles?: AppRole[];
  children?: string[];
  parentId?: string;
  /** Define se app com status mock/legacy pode aparecer na UI. */
  exposeWhenMock?: boolean;
};

const ALL: AccessFacet[] = ["kallistis"];

export const APP_NAV_GROUPS: Record<
  AppNavGroup,
  { label: string; order: number; description: string }
> = {
  principal: {
    label: "Principal",
    order: 10,
    description: "Conversa, presença e encontros da KALLISTIS.",
  },
  organizacao: {
    label: "Organização",
    order: 20,
    description: "Compromissos, notas e acontecimentos do dia.",
  },
  jogar: {
    label: "Jogar",
    order: 15,
    description: "Ferramentas canônicas para criar, explorar e jogar KALLISTIS.",
  },
  kallistis: {
    label: "Kallistis",
    order: 10,
    description: "Presença, agenda e superfícies pessoais do shell.",
  },
  memory: {
    label: "Memória",
    order: 30,
    description: "Memórias aprovadas e pendentes de decisão.",
  },
  conta: {
    label: "Conta",
    order: 40,
    description: "Dados e preferências pessoais.",
  },
  admin: {
    label: "Administração",
    order: 90,
    description: "Configuração e governança do shell.",
  },
};

export const APP_STATUS_LABELS: Record<AppStatus, string> = {
  real: "Funcional",
  mock: "Mock visual",
  legacy: "Legado",
  planned: "Planejado",
  hidden: "Oculto",
};

export const APP_REGISTRY: AppRegistryItem[] = [
  {
    id: "personagens",
    label: "Personagens",
    description: "Criação, fichas e aprovação das suas personagens.",
    path: "/personagens",
    domain: "kallistis",
    surface: "kallistis",
    kind: "react",
    status: "real",
    group: "jogar",
    order: 5,
    sidebar: true,
    home: true,
    allowedFacets: ["kallistis"],
  },
  {
    id: "character-forge",
    label: "Character Forge",
    description: "Forja canônica de personagens KALLISTIS.",
    path: "/jogar/character-forge.html",
    domain: "kallistis",
    surface: "kallistis",
    kind: "microapp-html",
    status: "real",
    group: "jogar",
    order: 10,
    sidebar: false,
    home: false,
    allowedFacets: ["kallistis"],
  },
  {
    id: "velarim",
    label: "Velarim",
    description: "Dicionário, tradutor e construtor de Velarim.",
    path: "/jogar/velarim.html",
    domain: "kallistis",
    surface: "kallistis",
    kind: "microapp-html",
    status: "real",
    group: "jogar",
    order: 20,
    sidebar: true,
    home: false,
    allowedFacets: ["kallistis"],
  },
  {
    id: "canon-explorer",
    label: "Canon Explorer",
    description: "Explorador do cânone de KALLISTIS.",
    path: "/jogar/canon-explorer.html",
    domain: "kallistis",
    surface: "kallistis",
    kind: "microapp-html",
    status: "real",
    group: "jogar",
    order: 30,
    sidebar: true,
    home: false,
    allowedFacets: ["kallistis"],
  },
  {
    id: "refugio",
    label: "Refúgio",
    description: "Espaço coletivo do grupo, ancorado na Pedr’alma.",
    path: "/refugio",
    domain: "kallistis",
    surface: "refugio",
    mode: "personal",
    engineFacet: "kallistis",
    kind: "react",
    status: "real",
    group: "jogar",
    order: 45,
    sidebar: true,
    home: false,
    allowedFacets: ["kallistis"],
  },
  {
    id: "galeria",
    label: "Galeria",
    description: "Acervo visual real de KALLISTIS.",
    path: "/galeria",
    domain: "kallistis",
    surface: "kallistis",
    mode: "personal",
    engineFacet: "kallistis",
    kind: "react",
    status: "real",
    group: "jogar",
    order: 40,
    sidebar: true,
    home: false,
    allowedFacets: ["kallistis"],
  },
  {
    id: "kallistis-chat",
    label: "Chat Geral",
    description: "Conversa da comunidade; KALLISTIS responde somente por @kallistis.",
    path: "/chat",
    domain: "kallistis",
    surface: "kallistis",
    mode: "personal",
    engineFacet: "kallistis",
    kind: "react",
    status: "real",
    group: "principal",
    order: 10,
    homeDescription: "Conversa humana da comunidade com KALLISTIS sob menção explícita",
    sidebar: true,
    home: true,
    allowedFacets: ["kallistis"],
  },
  {
    id: "kallistis-presente",
    label: "Kallistis Presente",
    description: "Presença, voz e abertura do dia",
    path: "/kallistis-presente",
    domain: "kallistis",
    surface: "kallistis-presente",
    mode: "personal",
    engineFacet: "kallistis",
    kind: "react",
    status: "real",
    group: "principal",
    order: 20,
    homeDescription: "Presença, voz e abertura do dia",
    sidebar: true,
    home: true,
    allowedFacets: ["kallistis"],
  },
  {
    id: "jardim",
    label: "Jardim",
    description: "Memórias aprovadas",
    path: "/jardim",
    domain: "memory",
    surface: "jardim",
    mode: "memory",
    engineFacet: "kallistis",
    kind: "react",
    status: "real",
    group: "memory",
    order: 10,
    homeDescription: "Memórias aprovadas",
    sidebar: true,
    home: true,
    allowedFacets: ["kallistis"],
  },
  {
    id: "revisao",
    label: "Revisão",
    description: "Memórias pendentes de decisão",
    path: "/revisao",
    domain: "memory",
    surface: "revisao",
    mode: "memory",
    engineFacet: "kallistis",
    kind: "microapp-html",
    status: "real",
    group: "memory",
    order: 15,
    homeDescription: "Memórias pendentes de decisão",
    sidebar: true,
    home: true,
    allowedFacets: ["kallistis"],
  },
  {
    id: "registro-vivo",
    label: "Registro Vivo",
    description: "Notas, acontecimentos e marcas do dia",
    path: "/registro-vivo",
    domain: "memory",
    surface: "registro-vivo",
    mode: "memory",
    engineFacet: "kallistis",
    kind: "react",
    status: "real",
    group: "organizacao",
    order: 20,
    homeDescription: "Notas, acontecimentos e marcas do dia",
    sidebar: true,
    home: true,
    allowedFacets: ["kallistis"],
  },
  {
    id: "mesa-do-mestre",
    label: "Central do Mestre",
    description: "Campanhas e roteiros para mestres.",
    path: "/mestre",
    domain: "kallistis",
    surface: "kallistis",
    mode: "system",
    kind: "react",
    status: "real",
    group: "organizacao",
    order: 25,
    sidebar: true,
    home: false,
    allowedFacets: ["kallistis"],
  },

  {
    id: "agenda",
    label: "Calendário",
    description: "Compromissos e organização.",
    path: "/agenda",
    domain: "kallistis",
    surface: "agenda",
    mode: "personal",
    engineFacet: "kallistis",
    kind: "microapp-html",
    status: "real",
    group: "organizacao",
    order: 10,
    homeDescription: "Compromissos e organização",
    sidebar: true,
    home: true,
    allowedFacets: ["kallistis"],
  },
  {
    // Travessia em camadas de uma conversa (sedimentação). Acessada a partir do
    // chat, não navegável pela sidebar/home — registrada para satisfazer o
    // invariante do registry e liberar acesso a usuários não-admin.
    id: "trilha",
    label: "Trilha",
    description: "Travessia em camadas de uma conversa.",
    path: "/trilha",
    domain: "kallistis",
    surface: "kallistis",
    mode: "personal",
    engineFacet: "kallistis",
    kind: "react",
    status: "real",
    group: "kallistis",
    order: 999,
    sidebar: false,
    home: false,
    allowedFacets: ["kallistis"],
  },
  {
    id: "perfil",
    label: "Meu Perfil",
    description: "Dados e preferências",
    path: "/perfil",
    domain: "system",
    surface: "profile",
    mode: "system",
    kind: "system",
    status: "real",
    group: "conta",
    order: 10,
    sidebar: true,
    home: true,
    homeDescription: "Dados e preferências",
    allowedFacets: ALL,
  },
  {
    id: "perfis",
    label: "Admin",
    path: "/perfis",
    domain: "system",
    surface: "admin",
    mode: "system",
    kind: "system",
    status: "hidden",
    group: "admin",
    order: 10,
    sidebarLabel: "Admin",
    homeDescription: "O antigo painel de workspace foi arquivado.",
    sidebar: false,
    home: false,
    adminOnly: true,
    allowedFacets: ALL,
  },
];

export function getAppById(id: string) {
  return APP_REGISTRY.find((app) => app.id === id);
}
export function getAppByPath(path: string) {
  return APP_REGISTRY.find((app) => app.path === path || path.startsWith(app.path + "/"));
}
export function resolveLegacyPath(path: string): string | null {
  const app = APP_REGISTRY.find((item) => item.legacyPaths?.includes(path));
  return app && app.path !== path ? app.path : null;
}
export function isAppVisible(app: AppRegistryItem): boolean {
  if (app.status === "hidden") return false;
  if (app.status === "real") return true;
  return app.exposeWhenMock === true;
}
export function getAppStatusLabel(status: AppStatus): string {
  return APP_STATUS_LABELS[status];
}
export function getAppGroupId(app: AppRegistryItem): AppNavGroup {
  if (app.group) return app.group;
  if (app.adminOnly || app.domain === "system") return "admin";
  if (app.domain === "memory") return "memory";
  return "kallistis";
}
export function getAppGroupLabel(appOrGroup: AppRegistryItem | AppNavGroup): string {
  if (typeof appOrGroup === "string") return APP_NAV_GROUPS[appOrGroup].label;
  return appOrGroup.groupLabel ?? APP_NAV_GROUPS[getAppGroupId(appOrGroup)].label;
}
export function getAppGroupDescription(group: AppNavGroup): string {
  return APP_NAV_GROUPS[group].description;
}
export function getAppGroupOrder(app: AppRegistryItem): number {
  return app.groupOrder ?? APP_NAV_GROUPS[getAppGroupId(app)].order;
}
export function sortRegistryApps(apps: AppRegistryItem[]): AppRegistryItem[] {
  return [...apps].sort((a, b) => {
    const groupDiff = getAppGroupOrder(a) - getAppGroupOrder(b);
    if (groupDiff !== 0) return groupDiff;
    const orderDiff = (a.order ?? 100) - (b.order ?? 100);
    if (orderDiff !== 0) return orderDiff;
    return a.label.localeCompare(b.label, "pt-BR");
  });
}
export function groupAppsForNavigation(apps: AppRegistryItem[]) {
  const groups = new Map<
    AppNavGroup,
    {
      id: AppNavGroup;
      label: string;
      description: string;
      order: number;
      apps: AppRegistryItem[];
    }
  >();

  for (const app of sortRegistryApps(apps)) {
    const id = getAppGroupId(app);
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        label: getAppGroupLabel(app),
        description: getAppGroupDescription(id),
        order: getAppGroupOrder(app),
        apps: [],
      });
    }
    groups.get(id)?.apps.push(app);
  }

  return [...groups.values()].sort((a, b) => a.order - b.order);
}
export function isEnabledInCanonicalShell(app: AppRegistryItem): boolean {
  return isActivePublicApp(app.id);
}
export function getSidebarRegistryApps() {
  return sortRegistryApps(
    APP_REGISTRY.filter(
      (app) => app.sidebar && isAppVisible(app) && isEnabledInCanonicalShell(app),
    ),
  );
}
export function getHomeRegistryApps() {
  return sortRegistryApps(
    APP_REGISTRY.filter((app) => app.home && isAppVisible(app) && isEnabledInCanonicalShell(app)),
  );
}
export function getChildrenOfApp(parentId: string) {
  return sortRegistryApps(
    APP_REGISTRY.filter((app) => app.parentId === parentId && isAppVisible(app)),
  );
}
