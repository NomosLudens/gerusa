import { Link, useRouter } from "@tanstack/react-router";
import { LocalCoreTransitionError } from "@/lib/local-core-boundary";

/**
 * Skeletons fiéis — desenham a forma do conteúdo final em vez de spinner.
 * Usar `shimmer` + tamanhos coerentes com o que vai aparecer.
 */

function bar(h = "h-3", w = "w-full") {
  return <div className={`shimmer rounded ${h} ${w}`} />;
}

/** Lista de cartões (jardim, registro-vivo, juridico, livros, eventos). */
export function CardListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 stagger" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--obsidian)]/40 p-3 space-y-2"
        >
          {bar("h-3", "w-2/3")}
          {bar("h-2", "w-full")}
          {bar("h-2", "w-4/5")}
        </div>
      ))}
    </div>
  );
}

/** Lista densa (revisão, fila). */
export function InlineListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 stagger" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="shimmer h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            {bar("h-2.5", "w-3/4")}
            {bar("h-2", "w-1/2")}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Grade de veículos / cartões grandes (drive). */
export function TileGridSkeleton({ tiles = 3 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger" aria-hidden="true">
      {Array.from({ length: tiles }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--obsidian)]/40 p-4 space-y-3 min-h-[110px]"
        >
          {bar("h-4", "w-1/2")}
          {bar("h-3", "w-3/4")}
          {bar("h-3", "w-2/3")}
        </div>
      ))}
    </div>
  );
}

/** Métricas/cabeçalho do home. */
export function HomeMetaSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="rounded-xl border border-[color:var(--border)] p-3 space-y-2">
        {bar("h-3", "w-1/3")}
        {bar("h-2", "w-2/3")}
      </div>
      <div className="rounded-xl border border-[color:var(--border)] p-3 space-y-2">
        {bar("h-3", "w-1/4")}
        {bar("h-2", "w-1/2")}
      </div>
    </div>
  );
}

/**
 * Boundary visual padrão para erros de rota.
 * Usa a voz de Kallistis (sóbria, não performática).
 */
export function RouteErrorBoundary({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  const isLocalCoreTransition = error instanceof LocalCoreTransitionError;
  const message =
    error instanceof Error ? error.message : "Erro inesperado ao carregar esta superfície.";
  return (
    <div className="px-4 py-10 max-w-md mx-auto text-center fade-up">
      <h2 className="text-base font-semibold text-[color:var(--ivory)]">
        {isLocalCoreTransition ? "Migração local em andamento." : "Algo travou aqui."}
      </h2>
      <p className="mt-2 text-xs text-[color:var(--ivory-dim)] break-words">{message}</p>
      <div className="mt-5 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="press-scale inline-flex items-center justify-center rounded-md bg-[color:var(--gold)] px-4 py-2 text-sm font-medium text-[color:var(--obsidian)]"
        >
          Tentar de novo
        </button>
        <Link
          to="/home"
          className="press-scale inline-flex items-center justify-center rounded-md border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--ivory)]"
        >
          Voltar
        </Link>
      </div>
    </div>
  );
}

export function RouteNotFoundBoundary({ message }: { message?: string }) {
  return (
    <div className="px-4 py-10 max-w-md mx-auto text-center fade-up">
      <h2 className="text-base font-semibold text-[color:var(--ivory)]">Nada aqui ainda.</h2>
      <p className="mt-2 text-xs text-[color:var(--ivory-dim)]">
        {message ?? "Esta superfície ainda não tem registro."}
      </p>
      <div className="mt-5">
        <Link
          to="/home"
          className="press-scale inline-flex items-center justify-center rounded-md border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--ivory)]"
        >
          Voltar para o Home
        </Link>
      </div>
    </div>
  );
}
