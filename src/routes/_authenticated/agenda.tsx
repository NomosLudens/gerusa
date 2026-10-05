import { createFileRoute } from "@tanstack/react-router";
import { AgendaHost } from "@/components/AgendaHost";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaHost,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});
