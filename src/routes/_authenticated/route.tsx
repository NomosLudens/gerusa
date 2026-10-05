import { kallistisWordmark } from "@/lib/brand-assets";
import { kallistisCrystal } from "@/lib/brand-assets";
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { getLocalSession } from "@/lib/local-auth-client";
import { getAppByPath } from "@/lib/app-registry";
import { isPlayerAccessAppId } from "@/lib/player-access";
import { canAccessPath, getAuthz, useAuthz } from "@/lib/use-authz";
import { OstPlayer } from "@/components/OstPlayer";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";
import { ScenePulseReceiver } from "@/components/ScenePulseReceiver";

export async function authenticatedBeforeLoad({ location }: { location: { pathname: string } }) {
  console.info("kallistis_e2e:authenticated_beforeload_started");
  const session = await getLocalSession();
  if (!session?.user) throw redirect({ to: "/auth" });
  const playerOnboardingResponse = await fetch("/api/auth/google-player-onboarding", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!playerOnboardingResponse.ok) throw redirect({ to: "/auth" });
  const playerOnboarding = (await playerOnboardingResponse.json().catch(() => null)) as {
    required?: boolean;
  } | null;
  if (playerOnboarding?.required) throw redirect({ to: "/auth" });
  const app = getAppByPath(location.pathname);
  const isMasterRoute = app?.id === "mesa-do-mestre";
  if (app && (app.adminOnly || isPlayerAccessAppId(app.id) || isMasterRoute)) {
    const authz = await getAuthz();
    const canAccess = isMasterRoute ? authz.isMaster : canAccessPath(authz, location.pathname);
    if (!canAccess) throw new AccessDeniedError();
  }
}

class AccessDeniedError extends Error {
  constructor() {
    super("Você não tem permissão para acessar esta aplicação.");
    this.name = "AccessDeniedError";
  }
}

function AuthenticatedRouteErrorBoundary({ error, reset }: { error: unknown; reset: () => void }) {
  if (error instanceof AccessDeniedError) {
    return <RouteNotFoundBoundary message={error.message} />;
  }
  return <RouteErrorBoundary error={error} reset={reset} />;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMs: Infinity,
  beforeLoad: authenticatedBeforeLoad,
  errorComponent: AuthenticatedRouteErrorBoundary,
  component: AuthedLayout,
});

function HeaderBar() {
  const { toggleSidebar } = useSidebar();

  return (
    <header
      className="sticky top-0 z-30 flex min-h-14 items-end gap-2 border-b border-white/[0.12] bg-[#08080e]/85 px-2 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Abrir menu"
        title="Menu"
        className="flex h-14 min-w-0 flex-1 items-center justify-center gap-3 rounded-none px-3 transition-colors hover:bg-white/[0.03]"
      >
        <img src={kallistisCrystal.url} alt="" className="h-8 w-8 shrink-0 grayscale apple-glow" />
        <img src={kallistisWordmark.url} alt="KALLISTIS" className="h-4 w-auto" />
      </button>
    </header>
  );
}

function CompactMenuButton() {
  const { toggleSidebar } = useSidebar();

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex items-center px-4 py-3"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Abrir menu"
        title="Menu"
        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-background/80 shadow-md backdrop-blur transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[color:var(--kallistis)] focus-visible:outline-none hover:bg-[color:var(--ivory)]/[0.05] active:scale-95"
      >
        <img src={kallistisCrystal.url} alt="" className="h-6 w-6 shrink-0 apple-glow" />
      </button>
    </div>
  );
}

export function AuthedLayout() {
  console.info("kallistis_e2e:authed_layout_render_started");
  const isMobile = useIsMobile();
  const authz = useAuthz();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isChat = pathname.startsWith("/chat");

  console.info("kallistis_e2e:authed_layout_render_finished");
  return (
    <SidebarProvider defaultOpen={isMobile}>
      <div className="relative flex h-[100dvh] min-h-[100dvh] w-full bg-[#08080e] text-[#eceaf0]">
        <AppSidebar />
        {!authz.loading && !authz.isMaster ? <ScenePulseReceiver /> : null}
        {authz.isMaster ? <OstPlayer /> : null}
        <div className="flex-1 flex min-w-0 flex-col relative">
          {!isChat ? <HeaderBar /> : <CompactMenuButton />}
          <main
            className={`min-h-0 flex-1 min-w-0 relative ${isChat ? "pt-[calc(env(safe-area-inset-top)+3.5rem)]" : ""}`}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
