import { createFileRoute } from "@tanstack/react-router";

import { CharacterVisualSheet } from "@/components/CharacterVisualSheet";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/personagem/$characterId/ficha")({
  component: CharacterVisualSheetRoute,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

function CharacterVisualSheetRoute() {
  const { characterId } = Route.useParams();
  return <CharacterVisualSheet characterId={characterId} />;
}
