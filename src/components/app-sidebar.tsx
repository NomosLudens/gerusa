import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  Download,
  Dumbbell,
  Feather,
  Flower2,
  Gauge,
  Gavel,
  Heart,
  Home,
  Images,
  LogOut,
  Mic,
  Scale,
  Sparkle,
  Sprout,
  UserCircle,
  Users,
} from "lucide-react";
import { kharisApple, kuanyinApple } from "@/lib/brand-assets";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOutLocal } from "@/lib/local-auth-client";
import { getSidebarApps, useAuthz } from "@/lib/use-authz";
import { groupAppsForNavigation, type AppRegistryItem } from "@/lib/app-registry";
import { toast } from "sonner";

type SidebarItem = {
  id: string;
  label: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  facet?: string;
  external?: boolean;
};

type SidebarGroupDef = { id: string; label: string; items: SidebarItem[] };

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const APP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  "kallistis-chat": Sparkle,
  "kallistis-presente": Mic,
  kharis: Heart,
  klio: BookOpen,
  "modo-fala-klio": Mic,
  codice: BookOpen,
  kuanyin: Briefcase,
  drive: Gauge,
  jardim: Flower2,
  "registro-vivo": Feather,
  "mesa-do-mestre": Users,
  agenda: CalendarDays,
  revisao: Sprout,
  juridico: Gavel,
  legislacao: Scale,
  jurisprudencia: Gavel,
  treinos: Dumbbell,
  "corpore-sano": Dumbbell,
  perfil: UserCircle,
  perfis: Users,
  facetas: Sparkle,
  galeria: Images,
};

function appToItem(app: AppRegistryItem): SidebarItem {
  return {
    id: app.id,
    label: app.sidebarLabel ?? app.shortLabel ?? app.label,
    url:
      app.kind === "microapp-html" && app.path.startsWith("/jogar/")
        ? `/microapp?app=${encodeURIComponent(app.id)}`
        : app.path,
    icon: APP_ICONS[app.id] ?? Sparkle,
    facet: app.engineFacet ?? app.allowedFacets?.[0],
    external: false,
  };
}

function buildGroups(apps: AppRegistryItem[]): SidebarGroupDef[] {
  return groupAppsForNavigation(apps).map((group) => ({
    id: group.id,
    label: group.label,
    items: group.apps.map(appToItem),
  }));
}

function getFacetApple(facet: string | undefined) {
  if (facet === "kallistis") return "/gerusa-logo.png";
  if (facet === "kharis") return kharisApple.url;
  if (facet === "kuanyin") return kuanyinApple.url;
  return null;
}

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const router = useRouter();
  const { setOpen, setOpenMobile, isMobile, state: sidebarState } = useSidebar();
  const authz = useAuthz();
  const { loading: authzLoading } = authz;
  const isCollapsed = sidebarState === "collapsed" && !isMobile;
  const groups = useMemo(() => buildGroups(getSidebarApps(authz)), [authz]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("sidebar-open-groups");
      return saved
        ? new Set(JSON.parse(saved))
        : new Set(["principal", "organizacao", "memory", "conta"]);
    } catch {
      return new Set(["principal", "organizacao", "memory", "conta"]);
    }
  });

  useEffect(() => {
    localStorage.setItem("sidebar-open-groups", JSON.stringify([...openGroups]));
  }, [openGroups]);

  const activeGroupId = useMemo(() => {
    for (const group of groups) {
      for (const item of group.items) {
        if (isActivePath(path, item.url)) return group.id;
      }
    }
    return null;
  }, [groups, path]);

  useEffect(() => {
    if (activeGroupId) {
      setOpenGroups((prev) => new Set([...prev, activeGroupId]));
    }
  }, [activeGroupId]);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      installPromptRef.current = promptEvent;
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      installPromptRef.current = null;
    });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = installPromptRef.current;
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      setDeferredPrompt(null);
      installPromptRef.current = null;
    }
  }, []);

  function closeSidebar() {
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  }

  async function signOut() {
    try {
      await signOutLocal();
      await router.invalidate();
      await navigate({ to: "/auth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao encerrar sessão");
    }
  }

  if (authzLoading) {
    return (
      <Sidebar collapsible="icon" className="border-white/[0.12] bg-[#111218]">
        <SidebarContent />
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-white/[0.12] bg-[#111218]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActivePath(path, "/home")}
                  className="rounded-md text-sidebar-foreground/80 data-[active=true]:bg-white/[0.08] data-[active=true]:text-[#eceaf0]"
                >
                  <Link to="/home" onClick={closeSidebar} className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {groups.map((group) => {
          const isOpen = openGroups.has(group.id);
          const isActive = activeGroupId === group.id;

          return (
            <SidebarGroup key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`
                  group-data-[collapsible=icon]:hidden
                  flex h-8 w-full shrink-0 items-center justify-between rounded-md px-2
                  text-xs font-medium text-sidebar-foreground/70
                  outline-none ring-sidebar-ring transition-colors duration-150 ease-linear
                  hover:bg-white/[0.04] focus-visible:ring-2
                  ${isActive ? "text-[color:var(--ivory)]" : ""}
                `}
              >
                <span className="truncate text-[10px] uppercase tracking-[0.2em]">
                  {group.label}
                </span>
                <ChevronDown
                  className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>

              <div
                className={`
                  group-data-[collapsible=icon]:hidden
                  overflow-hidden transition-all duration-200 ease-in-out
                  ${isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}
                `}
              >
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = isActivePath(path, item.url);
                      const apple = getFacetApple(item.facet);

                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            className="rounded-md text-sidebar-foreground/80 data-[active=true]:bg-white/[0.08] data-[active=true]:text-[#eceaf0]"
                          >
                            {item.external ? (
                              <a
                                href={item.url}
                                onClick={closeSidebar}
                                className="flex items-center gap-2"
                              >
                                {apple ? (
                                  <img src={apple} alt="" className="h-4 w-4 apple-glow" />
                                ) : (
                                  <item.icon className="h-4 w-4" />
                                )}
                                <span>{item.label}</span>
                              </a>
                            ) : (
                              <Link
                                to={item.url as never}
                                onClick={closeSidebar}
                                className="flex items-center gap-2"
                              >
                                {apple ? (
                                  <img src={apple} alt="" className="h-4 w-4 apple-glow" />
                                ) : (
                                  <item.icon className="h-4 w-4" />
                                )}
                                <span>{item.label}</span>
                              </Link>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </div>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {deferredPrompt && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleInstall}
                className="flex items-center gap-2"
                aria-label="Instalar Gerusa"
              >
                <Download className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Instalar Gerusa</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="rounded-md text-sidebar-foreground/80 hover:bg-white/[0.04]"
            >
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function isActivePath(currentPath: string, itemUrl: string) {
  if (currentPath === itemUrl) return true;
  if (itemUrl === "/klio") return false;
  return currentPath.startsWith(itemUrl + "/");
}
