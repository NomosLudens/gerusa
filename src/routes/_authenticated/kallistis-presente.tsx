// Kallistis Presente — experiência voice-first real para usuário autenticado.
// Rota: /kallistis-presente

import { createFileRoute } from "@tanstack/react-router";
import { ensureThread } from "@/lib/ensure-thread";
import { KallistisPresenteView } from "@/components/KallistisPresenteView";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/kallistis-presente")({
  loader: async () => {
    const id = await ensureThread("general");
    return { threadId: id };
  },
  component: KallistisPresentePage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

function KallistisPresentePage() {
  const { threadId } = Route.useLoaderData();
  return <KallistisPresenteView threadId={threadId ?? ""} />;
}
