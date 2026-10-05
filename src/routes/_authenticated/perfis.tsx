import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/perfis")({
  component: PerfisArchivedPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

function PerfisArchivedPage() {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[color:var(--background)] p-8">
      <div className="max-w-xl mx-auto rounded-2xl border border-[color:var(--wine)] bg-[color:var(--wine)]/10 p-6 space-y-3">
        <h2 className="serif text-xl text-[color:var(--gold)]">Admin Workspace (Arquivado)</h2>
        <p className="text-sm text-[color:var(--ivory-dim)]">
          O conceito de workspaces e perfis secundários foi removido da Kallistis Clean. A Kallistis
          agora é estritamente pessoal e single-tenant.
        </p>
      </div>
    </div>
  );
}
