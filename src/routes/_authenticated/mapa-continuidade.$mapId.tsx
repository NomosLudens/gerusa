import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText } from "lucide-react";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/mapa-continuidade/$mapId")({
  component: ContinuityMapPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

function ContinuityMapPage() {
  const { mapId } = Route.useParams();
  const source = `/api/continuity-maps/${encodeURIComponent(mapId)}`;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col bg-[#08080E] text-[#F3EBDD]">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-2 text-sm text-[#F3EBDD]/65 transition-colors hover:text-[color:var(--gold)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao KALLISTIS
        </Link>
        <div className="ml-auto hidden items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[color:var(--gold)]/80 sm:flex">
          <ScrollText className="h-4 w-4" />
          Mapa da Continuidade
        </div>
      </header>
      <div className="min-h-0 flex-1 p-2 sm:p-4">
        <iframe
          title="Mapa da Continuidade"
          src={source}
          sandbox=""
          referrerPolicy="same-origin"
          className="h-full w-full rounded-xl border border-white/10 bg-[#100d13]"
        />
      </div>
    </div>
  );
}
