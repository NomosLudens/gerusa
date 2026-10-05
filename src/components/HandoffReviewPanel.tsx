import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listHandoffCandidates,
  reviewHandoffCandidate,
} from "@/lib/kline-handoff-review.functions";
import type {
  HandoffCandidate,
  HandoffTargetApp,
  HandoffReason,
} from "@/lib/kline-handoff-review.functions";

// ─── Label helpers ─────────────────────────────────────────────────────────────

function labelTargetApp(app: HandoffTargetApp | null): string {
  if (app === "klio-coder") return "Klio Coder";
  if (app === "kuan-yin") return "Kuan-Yin";
  return app ?? "—";
}

function labelReason(reason: HandoffReason | null): string {
  if (reason === "coding_scope") return "Escopo técnico/código";
  if (reason === "commercial_scope") return "Escopo comercial";
  if (reason === "legacy_klio_scope") return "Escopo técnico legado";
  return reason ?? "—";
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Card ──────────────────────────────────────────────────────────────────────

type CardProps = {
  candidate: HandoffCandidate;
  onAction: (id: string, status: "approved" | "rejected" | "archived") => Promise<void>;
  loading: boolean;
};

function HandoffCandidateCard({ candidate, onAction, loading }: CardProps) {
  const text = candidate.clippedText ?? candidate.body ?? "";
  const date = candidate.occurredAt ?? candidate.createdAt;

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3 text-sm">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {candidate.targetApp && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {labelTargetApp(candidate.targetApp)}
            </span>
          )}
          {candidate.reason && (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {labelReason(candidate.reason)}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(date)}</span>
      </div>

      {/* Body text */}
      {text && <p className="text-foreground leading-relaxed line-clamp-4 break-words">{text}</p>}

      {/* Thread ID */}
      {candidate.threadId && (
        <p className="text-xs text-muted-foreground font-mono truncate">
          thread: {candidate.threadId}
        </p>
      )}

      {/* Status badge (non-pending) */}
      {candidate.status !== "pending" && (
        <span className="self-start inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground capitalize">
          {candidate.status}
        </span>
      )}

      {/* Actions */}
      {candidate.status === "pending" && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={() => onAction(candidate.id, "approved")}
            className="flex-1 min-w-[80px] rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Aprovar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onAction(candidate.id, "rejected")}
            className="flex-1 min-w-[80px] rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Rejeitar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onAction(candidate.id, "archived")}
            className="flex-1 min-w-[80px] rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Arquivar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Panel ─────────────────────────────────────────────────────────────────────

type PanelState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; candidates: HandoffCandidate[] };

export function HandoffReviewPanel() {
  const listFn = useServerFn(listHandoffCandidates);
  const reviewFn = useServerFn(reviewHandoffCandidate);

  const [state, setState] = useState<PanelState>({ phase: "idle" });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setState({ phase: "loading" });
    listFn({ data: { status: "pending", limit: 100 } })
      .then((candidates) => {
        if (active) {
          setState({ phase: "ready", candidates });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const message = err instanceof Error ? err.message : "Erro ao carregar handoffs.";
          setState({ phase: "error", message });
        }
      });

    return () => {
      active = false;
    };
  }, [listFn]);

  async function handleAction(id: string, status: "approved" | "rejected" | "archived") {
    setActionLoading(true);
    try {
      await reviewFn({ data: { id, status } });
      // Refresh list after action
      const fresh = await listFn({ data: { status: "pending", limit: 100 } });
      setState({ phase: "ready", candidates: fresh });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao registrar revisão.";
      setState({ phase: "error", message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefresh() {
    setState({ phase: "loading" });
    try {
      const candidates = await listFn({ data: { status: "pending", limit: 100 } });
      setState({ phase: "ready", candidates });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar handoffs.";
      setState({ phase: "error", message });
    }
  }

  return (
    <section className="flex flex-col gap-4 p-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Handoffs pendentes</h2>
        {state.phase === "ready" && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={actionLoading}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Atualizar
          </button>
        )}
      </div>

      {/* Loading */}
      {state.phase === "loading" && (
        <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
      )}

      {/* Error */}
      {state.phase === "error" && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <p>{state.message}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-2 text-xs underline underline-offset-2 hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Empty */}
      {state.phase === "ready" && state.candidates.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum handoff pendente.</p>
      )}

      {/* List */}
      {state.phase === "ready" && state.candidates.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.candidates.map((c) => (
            <li key={c.id}>
              <HandoffCandidateCard candidate={c} onAction={handleAction} loading={actionLoading} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
