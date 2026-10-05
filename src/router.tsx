import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { KallistisLoadingShell } from "./components/KallistisLoadingShell";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: KallistisLoadingShell,
  });

  return router;
};
