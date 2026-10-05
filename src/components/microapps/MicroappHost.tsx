import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAppById } from "@/lib/app-registry";
import { cn } from "@/lib/utils";
import {
  appendEmbeddedParam,
  DEFAULT_MICROAPP_SANDBOX,
  MICROAPP_REGISTRY_DEFAULTS,
  validateMicroappMessage,
} from "./microapp-events";
import type { MicroappEvent, MicroappHostProps, MicroappHostState } from "./microapp-types";

function resolveMicroapp({
  app,
  appId,
  title,
  src,
  expectedSource,
  allowedActions,
}: Pick<
  MicroappHostProps,
  "app" | "appId" | "title" | "src" | "expectedSource" | "allowedActions"
>) {
  const registryApp = app ?? (appId ? getAppById(appId) : undefined);
  const defaults = registryApp ? MICROAPP_REGISTRY_DEFAULTS[registryApp.id] : undefined;

  return {
    app: registryApp,
    id: registryApp?.id ?? appId,
    title: title ?? registryApp?.label ?? "Microapp",
    src: src ?? defaults?.src,
    expectedSource: expectedSource ?? defaults?.expectedSource ?? registryApp?.id,
    allowedActions: allowedActions ?? defaults?.allowedActions,
  };
}

function statusMessage(status: string | undefined, title: string) {
  if (status === "planned") return `Esta superfície ainda está planejada: ${title}.`;
  if (status === "hidden") return `Esta superfície não está disponível no shell agora: ${title}.`;
  if (status === "legacy")
    return `Esta superfície usa uma rota legada ou foi substituída: ${title}.`;
  return "Não consegui abrir esta superfície agora.";
}

export function MicroappHost(props: MicroappHostProps) {
  const {
    className,
    iframeClassName,
    sandbox = DEFAULT_MICROAPP_SANDBOX,
    allow = "clipboard-write; screen-wake-lock",
    embedded = true,
    showHeader = true,
    minHeight = "calc(100dvh - 5.5rem)",
    loadingTimeoutMs = 10_000,
    loadingLabel,
    onEvent,
  } = props;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [state, setState] = useState<MicroappHostState>("loading");
  const [timedOut, setTimedOut] = useState(false);

  const microapp = useMemo(
    () =>
      resolveMicroapp({
        app: props.app,
        appId: props.appId,
        title: props.title,
        src: props.src,
        expectedSource: props.expectedSource,
        allowedActions: props.allowedActions,
      }),
    [props.allowedActions, props.app, props.appId, props.expectedSource, props.src, props.title],
  );
  const frameSrc = useMemo(
    () => (microapp.src ? appendEmbeddedParam(microapp.src, embedded) : null),
    [embedded, microapp.src],
  );
  const blocked =
    !frameSrc ||
    (microapp.app ? microapp.app.kind !== "microapp-html" : false) ||
    ["planned", "hidden"].includes(microapp.app?.status ?? "");

  const isLegacy = microapp.app?.status === "legacy";

  useEffect(() => {
    setState(blocked ? "blocked" : "loading");
    setTimedOut(false);
  }, [blocked, frameSrc]);

  useEffect(() => {
    if (blocked || state !== "loading") return;
    const timer = window.setTimeout(() => {
      setTimedOut(true);
      setState("error");
    }, loadingTimeoutMs);
    return () => window.clearTimeout(timer);
  }, [blocked, loadingTimeoutMs, state, frameKey]);

  const handleEvent = useCallback(
    (event: MicroappEvent) => {
      if (import.meta.env.DEV) {
        console.debug("[MicroappHost] evento validado", {
          source: event.source,
          action: event.action,
          payload: event.payload,
        });
      }

      if (event.action === "microapp:ready") {
        toast.message(`${microapp.title} pronto.`);
        setState("loaded");
        setTimedOut(false);
      }
      if (event.action === "microapp:error") {
        toast.error(`${microapp.title} relatou um erro.`);
        setState("error");
      }
      onEvent?.(event, iframeRef.current);
    },
    [microapp.title, onEvent],
  );

  useEffect(() => {
    if (blocked || typeof window === "undefined") return;

    function onMessage(event: MessageEvent) {
      const result = validateMicroappMessage({
        event,
        frameWindow: iframeRef.current?.contentWindow,
        expectedOrigin: window.location.origin,
        expectedSource: microapp.expectedSource,
        allowedActions: microapp.allowedActions,
      });

      if (!result.ok) {
        if (import.meta.env.DEV) console.debug("[MicroappHost] mensagem ignorada", result.reason);
        return;
      }

      handleEvent(result.event);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [blocked, handleEvent, microapp.allowedActions, microapp.expectedSource]);

  const reload = useCallback(() => {
    setFrameKey((key) => key + 1);
    setState(blocked ? "blocked" : "loading");
    setTimedOut(false);
  }, [blocked]);

  const hostStatus =
    state === "loaded"
      ? "Pronta"
      : state === "loading"
        ? "Abrindo"
        : state === "blocked"
          ? "Indisponível"
          : "Falha ao abrir";
  const shellStatus = microapp.app?.status === "mock" ? "Mock visual" : microapp.app?.status;
  const isFrameHidden = state === "error" || blocked;

  return (
    <section
      className={cn(
        "microapp-host flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground",
        className,
      )}
      style={{ minHeight }}
    >
      <div className="sr-only" aria-live="polite">
        {state === "loading" ? (loadingLabel ?? `Abrindo ${microapp.title}...`) : hostStatus}
      </div>

      {showHeader ? (
        <header className="microapp-host__header flex items-center justify-between gap-3 border-b border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground sm:px-4">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{microapp.title}</p>
            <p className="truncate">Estado: {hostStatus}</p>
          </div>
          {shellStatus ? (
            <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[0.65rem] uppercase tracking-[0.16em]">
              {shellStatus}
            </span>
          ) : null}
        </header>
      ) : null}

      {isLegacy ? (
        <div className="bg-amber-500/10 px-4 py-1.5 text-center text-xs font-medium text-amber-500">
          Esta superfície usa uma rota legada e pode não funcionar perfeitamente.
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {state === "loading" ? (
          <div className="microapp-host__loading absolute inset-0 z-10 grid place-items-center bg-background/90 px-6 text-center backdrop-blur-sm">
            <div>
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
              <p className="font-medium">{loadingLabel ?? `Abrindo ${microapp.title}...`}</p>
              {timedOut ? (
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Está demorando mais que o normal. Você pode aguardar, recarregar ou voltar para a
                  Home.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {blocked || state === "error" ? (
          <div
            className="microapp-host__error grid h-full min-h-[420px] place-items-center px-6"
            role="alert"
          >
            <div className="max-w-md rounded-2xl border border-border bg-card/80 p-6 text-center shadow-lg">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-400" aria-hidden />
              <h2 className="serif text-xl text-foreground">
                {timedOut
                  ? `Tempo limite esgotado: ${microapp.title}`
                  : statusMessage(microapp.app?.status, microapp.title)}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {timedOut
                  ? "O microapp demorou muito para iniciar e responder com o handshake de prontidão."
                  : "Tente recarregar ou voltar para a Home. O shell não executa ação sensível quando a superfície falha."}
              </p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={reload}
                  aria-label={`Recarregar ${microapp.title}`}
                >
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                  Recarregar
                </Button>
                <Button asChild>
                  <Link to="/home" aria-label="Voltar para Home">
                    <Home className="mr-2 h-4 w-4" aria-hidden />
                    Voltar para Home
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {!blocked && frameSrc ? (
          <iframe
            key={frameKey}
            ref={iframeRef}
            src={frameSrc}
            title={microapp.title}
            className={cn(
              "microapp-host__frame h-full min-h-[calc(100dvh-7.5rem)] w-full flex-1 border-0 bg-transparent",
              isFrameHidden && "hidden",
              iframeClassName,
            )}
            sandbox={sandbox}
            allow={allow}
            loading="eager"
            onLoad={() => {
              if (import.meta.env.DEV) {
                console.debug("[MicroappHost] iframe document loaded");
              }
            }}
            onError={() => setState("error")}
          />
        ) : null}
      </div>
    </section>
  );
}
