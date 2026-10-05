import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import "../lib/fonts";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#160b0c" },
      { name: "application-name", content: "Gerusa" },
      { title: "Gerusa Poulain — Mestra de RPG" },
      {
        name: "description",
        content: "Histórias, pessoas, mundos e pequenos desastres narrativos com Gerusa Poulain.",
      },
      { property: "og:title", content: "Gerusa Poulain — Mestra de RPG" },
      {
        property: "og:description",
        content: "Boas histórias tornam pessoas comuns extraordinárias.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/gerusa-logo.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body style={{ margin: 0 }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
