import { createFileRoute } from "@tanstack/react-router";
import { RevisaoHost } from "@/components/RevisaoHost";
import { HandoffReviewPanel } from "@/components/HandoffReviewPanel";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

function RevisaoPage() {
  return (
    <div className="flex flex-col h-full">
      {/* ── Handoffs pendentes (Ledger) ─────────────────────────────────── */}
      <div className="border-b border-border">
        <HandoffReviewPanel />
      </div>

      {/* ── Revisão de memórias (microapp existente) ────────────────────── */}
      <div className="flex-1 min-h-0">
        <RevisaoHost />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/revisao")({
  component: RevisaoPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});
