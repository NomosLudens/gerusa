import { createFileRoute } from "@tanstack/react-router";
import { RefugioView } from "@/components/RefugioView";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/refugio")({
  component: RefugioView,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});
