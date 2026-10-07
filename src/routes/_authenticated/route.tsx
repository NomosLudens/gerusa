import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthz } from "@/lib/use-authz";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

import { authenticatedBeforeLoad } from "@/lib/authenticated-before-load";

function AuthenticatedRouteErrorBoundary({ error, reset }: { error: unknown; reset: () => void }) {
  if (
    error instanceof Error &&
    error.message === "Você não tem permissão para acessar esta aplicação."
  ) {
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
        <img src="/gerusa-logo.png" alt="" className="h-8 w-8 shrink-0 rounded-full" />
        <span className="serif text-lg text-[#f5e9df]">Gerusa Poulain</span>
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
        <img src="/gerusa-logo.png" alt="" className="h-6 w-6 shrink-0 rounded-full" />
      </button>
    </div>
  );
}

export function AuthedLayout() {
  const isMobile = useIsMobile();
  const authz = useAuthz();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isChat = pathname.startsWith("/chat");

  return (
    <SidebarProvider defaultOpen={isMobile}>
      <div className="relative flex h-[100dvh] min-h-[100dvh] w-full bg-[#08080e] text-[#eceaf0]">
        <AppSidebar />
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
