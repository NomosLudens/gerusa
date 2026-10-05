import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";

import appCss from "../styles.css?url";
import "../lib/fonts";
import { reportClientError } from "../lib/client-error-reporting";
import { KallistisLoadingShell } from "../components/KallistisLoadingShell";
import { Toaster } from "../components/ui/sonner";
import { getPublicRuntimeConfig } from "@/server/runtime/public-config";

function getPublicConfigScript() {
  // No cliente (hidratação), lê o que o SSR já injetou — garante que
  // servidor e cliente produzam exatamente o mesmo HTML e elimina o #418.
  // [TAREFA 1: Sem manipulação de DOM/head no script]
  if (
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).__KALLISTIS_CONFIG__
  ) {
    const existing = (window as unknown as Record<string, unknown>).__KALLISTIS_CONFIG__ as Record<
      string,
      string
    >;
    return `window.__KALLISTIS_CONFIG__=${JSON.stringify(existing).replace(/</g, "\\u003c")};`;
  }
  const runtime = getPublicRuntimeConfig();
  const payload = {
    SUPABASE_URL: runtime.supabaseUrl || "",
    SUPABASE_PUBLISHABLE_KEY: runtime.supabasePublishableKey || "",
    VITE_GOOGLE_API_KEY: runtime.googleApiKey || "",
    VITE_GOOGLE_CLIENT_ID: runtime.googleClientId || "",
  };
  return `window.__KALLISTIS_CONFIG__=${JSON.stringify(payload).replace(/</g, "\\u003c")};`;
}

// Registra o service worker e adiciona recuperação de erro de chunk/assets
const swScript = `
var kallistisSwCacheVersion = 'kallistis-pwa-v2026-07-04-01';
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING', cacheVersion: kallistisSwCacheVersion });
      }
      registration.addEventListener('updatefound', function() {
        var worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', function() {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING', cacheVersion: kallistisSwCacheVersion });
          }
        });
      });
    }).catch(function(error) {
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        console.warn('Kallistis service worker registration failed', error && error.message ? error.message : error);
      }
    });
  });
}
// Recuperação de erro de chunk — reload seguro com proteção de loop
window.addEventListener('error', function(e) {
  if (e.target && e.target.tagName === 'LINK') return;
  // Detecta erro de chunk dinâmico (Failed to fetch dynamically imported module)
  if (e.message && (
    e.message.indexOf('Failed to fetch dynamically imported module') !== -1 ||
    e.message.indexOf('Loading chunk') !== -1 ||
    e.message.indexOf('Importing a module script failed') !== -1
  )) {
    e.preventDefault();
    var key = 'kallistis:chunk-reload-attempted';
    if (sessionStorage.getItem(key)) {
      document.getElementById('chunk-error-ui')?.classList.remove('hidden');
      return;
    }
    sessionStorage.setItem(key, '1');
    if ('caches' in window) {
      caches.keys().then(function(keys) {
        return Promise.all(keys.map(function(k) { return caches.delete(k); }));
      }).catch(function() {}).finally(function() {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }
}, true);
`;

function ChunkErrorFallback() {
  const handleRefresh = () => {
    const reload = () => {
      window.location.reload();
    };
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(reload)
        .catch(reload);
    } else {
      reload();
    }
  };
  const handleDismiss = () => document.getElementById("chunk-error-ui")?.classList.add("hidden");
  return (
    <div
      id="chunk-error-ui"
      role="status"
      aria-live="polite"
      className="hidden fixed inset-x-3 bottom-3 z-[9999] mx-auto max-w-md rounded-3xl border border-[color:var(--gold)]/50 bg-[#120B12]/95 p-4 text-[#F7EFE4] shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_36px_rgba(201,138,101,0.18)] backdrop-blur sm:bottom-5"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[color:var(--gold)] shadow-[0_0_18px_rgba(201,138,101,0.8)]" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h1 className="serif text-xl text-[#F7EFE4]">Kallistis precisa atualizar</h1>
            <p className="text-sm leading-relaxed text-[#F7EFE4]/75">
              Uma nova versão está pronta. Atualize agora para abrir mais rápido, ou deixe para
              depois.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--gold)] px-5 text-sm font-semibold text-[#08080E] shadow-[0_0_22px_rgba(201,138,101,0.3)] transition hover:bg-[color:var(--gold)] focus:outline-none focus:ring-2 focus:ring-[#F7EFE4]/80"
            >
              Atualizar agora
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#F7EFE4]/18 px-4 text-sm text-[#F7EFE4]/75 transition hover:text-[#F7EFE4] focus:outline-none focus:ring-2 focus:ring-[#F7EFE4]/60"
            >
              Depois
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl leading-none text-[#F7EFE4]/55 transition hover:bg-white/10 hover:text-[#F7EFE4] focus:outline-none focus:ring-2 focus:ring-[#F7EFE4]/60"
          aria-label="Fechar aviso de atualização"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

class ReactDiagnosticBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const stack =
      info.componentStack
        ?.split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 12)
        .join(" > ") || "<sem component stack>";
    const constructor =
      error !== null &&
      (typeof error === "object" || typeof error === "function") &&
      "constructor" in error
        ? String(
            (error as { constructor?: { name?: string } }).constructor?.name ?? "<sem constructor>",
          )
        : "<não objeto>";

    console.info(
      `kallistis_e2e:react_boundary_caught type=${typeof error} constructor=${constructor} stack=${stack}`,
    );
  }

  render() {
    if (this.state.failed) {
      return <div data-testid="react-diagnostic-fallback" />;
    }

    return this.props.children;
  }
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportClientError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado por aqui. Você pode tentar novamente ou voltar ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { name: "theme-color", content: "#08080E" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Kallistis" },
      { name: "application-name", content: "Kallistis" },
      { name: "mobile-web-app-capable", content: "yes" },
      { title: "Kallistis — mundos partidos" },
      {
        name: "description",
        content:
          "Kallistis: um universo vivo para jogar, criar personagens e atravessar histórias.",
      },
      { property: "og:title", content: "Kallistis — mundos partidos" },
      {
        property: "og:description",
        content: "Um universo vivo para jogar, criar personagens e atravessar histórias.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/brand-assets/kallistis-canon-crystal.png?v=20260830" },
      {
        rel: "icon",
        href: "/brand-assets/kallistis-canon-crystal.png?v=20260830",
        type: "image/png",
      },
    ],
  }),

  shellComponent: RootShell,
  pendingComponent: KallistisLoadingShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: getPublicConfigScript() }} />
        <HeadContent />
      </head>
      <body style={{ margin: 0, background: "#08080E" }}>
        {children}
        <ChunkErrorFallback />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // App montou com sucesso → libera o guard de recuperação de chunk, para que
  // um erro de chunk após um deploy futuro (numa sessão de PWA longa) ainda
  // consiga se auto-recuperar uma vez em vez de emperrar na tela de atualizar.
  useEffect(() => {
    try {
      sessionStorage.removeItem("kallistis:chunk-reload-attempted");
    } catch {
      /* sessionStorage indisponível — ignora */
    }
  }, []);

  useEffect(() => {
    return router.subscribe("onBeforeNavigate", () => {
      (document.activeElement as HTMLElement | null)?.blur?.();
    });
  }, [router]);

  // View Transitions API — crossfade nativo entre rotas.
  // Intercepta cada navegação e re-renderiza dentro de startViewTransition.
  // [TAREFA 2: Desligado temporariamente para estabilização de runtime/Invariant failed]
  /*
  useEffect(() => {
    const doc = typeof document !== "undefined" ? document : null;
    const supportsVT =
      doc &&
      typeof (doc as Document & { startViewTransition?: unknown }).startViewTransition ===
        "function";
    if (!supportsVT) return;

    const unsub = router.subscribe("onBeforeNavigate", () => {
      // Coalescent: cada navegação dispara uma transição.
      const d = document as Document & {
        startViewTransition: (cb: () => void) => { finished: Promise<void> };
      };
      let resolveReady: (() => void) | null = null;
      const ready = new Promise<void>((r) => {
        resolveReady = r;
      });
      d.startViewTransition(() => ready);
      // Liberar no próximo frame após o React commit do novo match.
      requestAnimationFrame(() => requestAnimationFrame(() => resolveReady?.()));
    });

    return () => {
      unsub();
    };
  }, [router]);
  */

  return (
    <QueryClientProvider client={queryClient}>
      <ReactDiagnosticBoundary>
        <Outlet />
      </ReactDiagnosticBoundary>
      <Toaster richColors closeButton position="top-center" />
    </QueryClientProvider>
  );
}
