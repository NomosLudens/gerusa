// Página /trilha/$threadId — travessia completa de uma conversa em camadas.
// Mostra: fala bruta → hipóteses (short_term) → sínteses (níveis seguintes) → confirmadas/Jardim.
// Permite confirmar / descartar / promover.

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  loadTrilha,
  NIVEL_LABEL,
  NIVEL_SUBTITLE,
  STATUS_LABEL,
  type SedimentoRow,
  type ChatMessageRow,
} from "@/lib/trilha";
import {
  confirmarSedimento,
  descartarSedimento,
  promoverNivel,
  sedimentarThread,
} from "@/lib/sedimentar.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sprout, Trash2, ChevronUp, RefreshCw } from "lucide-react";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/trilha/$threadId")({
  component: TrilhaPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

function TrilhaPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    messages: ChatMessageRow[];
    sedimentos: SedimentoRow[];
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const sedFn = useServerFn(sedimentarThread);
  const confirmFn = useServerFn(confirmarSedimento);
  const descartarFn = useServerFn(descartarSedimento);
  const promoverFn = useServerFn(promoverNivel);
  const loadFn = useServerFn(loadTrilha);

  const reload = useCallback(async () => {
    const d = await loadFn({ data: { threadId } });
    setData(d);
  }, [loadFn, threadId]);
  useEffect(() => {
    void reload();
  }, [reload]);

  async function rodarAgora() {
    setBusy("sed");
    try {
      await sedFn({ data: { threadId } });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function onConfirmar(s: SedimentoRow) {
    const titulo = s.hipotese.slice(0, 80).trim();
    const conteudo = `${s.hipotese}\n\n${s.resumo ?? ""}`.trim();
    setBusy(s.id);
    try {
      await confirmFn({ data: { sedimentoId: s.id, titulo, conteudo } });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function onDescartar(s: SedimentoRow) {
    setBusy(s.id);
    try {
      await descartarFn({ data: { sedimentoId: s.id } });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function onPromover(nivel: string) {
    setBusy(`prom-${nivel}`);
    try {
      const r = await promoverFn({
        data: { threadId, nivel: nivel as never },
      });
      if (r.promovido === 0) {
        alert(
          r.motivo === "sem convergência"
            ? "As 5 hipóteses não convergem — nada promovido."
            : `Faltam hipóteses confirmadas neste nível.`,
        );
      }
      await reload();
    } finally {
      setBusy(null);
    }
  }

  const sedimentos = data?.sedimentos ?? [];
  const porNivel = new Map<string, SedimentoRow[]>();
  for (const s of sedimentos) {
    const list = porNivel.get(s.nivel) ?? [];
    list.push(s);
    porNivel.set(s.nivel, list);
  }

  const totalMsgs = data?.messages.length ?? 0;
  const emRevisao = sedimentos.filter((s) => s.status === "em_revisao").length;
  const confirmados = sedimentos.filter((s) => s.status === "confirmado").length;

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-background">
      <div className="border-b border-[color:var(--border)] bg-background/60 backdrop-blur">
        <div className="px-4 py-3 flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/chat" })}>
            <ArrowLeft className="w-4 h-4 mr-1" /> chat
          </Button>
          <h1 className="serif text-[color:var(--gold)] tracking-[0.2em] uppercase text-sm">
            Trilha de Sedimentação
          </h1>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={rodarAgora} disabled={busy === "sed"}>
              <RefreshCw className={`w-3 h-3 mr-1 ${busy === "sed" ? "animate-spin" : ""}`} />
              sedimentar agora
            </Button>
          </div>
        </div>
        <div className="px-4 pb-3 max-w-4xl mx-auto flex gap-4 text-[10px] tracking-[0.2em] uppercase text-[color:var(--ivory-dim)]">
          <span>{totalMsgs} mensagens</span>
          <span>·</span>
          <span>{emRevisao} em revisão</span>
          <span>·</span>
          <span>{confirmados} confirmados</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        <p className="text-xs text-[color:var(--ivory-dim)] leading-relaxed italic border-l-2 border-[color:var(--gold)]/40 pl-3">
          A conversa atravessa camadas neurocognitivas: fala bruta → traço atencional → memória de
          trabalho → projeção prospectiva → cena episódica → significado semântico → modo
          procedural. Sedimentação organiza o tempo; não toma posse da verdade. Cada hipótese
          precisa de revisão sua antes de durar.
        </p>

        {data === null && <p className="text-sm text-[color:var(--ivory-dim)]">carregando…</p>}

        {data && (
          <>
            {/* Camada de fala bruta */}
            <CamadaSection
              titulo="Fala bruta"
              subtitulo="o que foi efetivamente dito"
              count={totalMsgs}
            >
              <p className="text-xs text-[color:var(--ivory-dim)]">
                {totalMsgs > 0 ? (
                  <>
                    {totalMsgs} mensagens no fio · ver no{" "}
                    <Link
                      to="/chat/$threadId"
                      params={{ threadId }}
                      className="text-[color:var(--gold)] underline"
                    >
                      chat
                    </Link>
                  </>
                ) : (
                  "ainda sem mensagens"
                )}
              </p>
            </CamadaSection>

            {/* Para cada nível, mostra hipóteses + ação de promoção */}
            {["short_term", "working", "prospective", "episodic", "semantic", "procedural"].map(
              (nivel) => {
                const itens = porNivel.get(nivel) ?? [];
                if (itens.length === 0) return null;
                const confirmadosNivel = itens.filter(
                  (s) => s.status === "confirmado" && !s.promovido_para,
                );
                return (
                  <CamadaSection
                    key={nivel}
                    titulo={NIVEL_LABEL[nivel] ?? nivel}
                    subtitulo={subtituloNivel(nivel)}
                    count={itens.length}
                    action={
                      confirmadosNivel.length >= 5 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onPromover(nivel)}
                          disabled={busy === `prom-${nivel}`}
                        >
                          <ChevronUp className="w-3 h-3 mr-1" />
                          promover 5→1
                        </Button>
                      ) : null
                    }
                  >
                    <ul className="space-y-3">
                      {itens.map((s) => (
                        <SedimentoCard
                          key={s.id}
                          sed={s}
                          busy={busy === s.id}
                          onConfirmar={() => onConfirmar(s)}
                          onDescartar={() => onDescartar(s)}
                        />
                      ))}
                    </ul>
                  </CamadaSection>
                );
              },
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CamadaSection({
  titulo,
  subtitulo,
  count,
  children,
  action,
}: {
  titulo: string;
  subtitulo: string;
  count: number;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3 border-b border-[color:var(--border)] pb-2">
        <h2 className="serif text-[color:var(--gold)] tracking-[0.18em] uppercase text-sm">
          {titulo}
        </h2>
        <span className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--ivory-dim)]">
          {subtitulo} · {count}
        </span>
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </section>
  );
}

function SedimentoCard({
  sed,
  busy,
  onConfirmar,
  onDescartar,
}: {
  sed: SedimentoRow;
  busy: boolean;
  onConfirmar: () => void;
  onDescartar: () => void;
}) {
  const cor =
    sed.status === "confirmado"
      ? "border-[color:var(--gold)]/60 bg-[color:var(--gold)]/5"
      : sed.status === "descartado"
        ? "border-[color:var(--border)] bg-card/20 opacity-60"
        : "border-[color:var(--border)] bg-card/40";
  return (
    <li className={`rounded-lg border p-3 ${cor}`}>
      <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[color:var(--ivory-dim)] mb-2">
        <span>{STATUS_LABEL[sed.status] ?? sed.status}</span>
        <span>·</span>
        <span>confiança {sed.confianca}/3</span>
        <span>·</span>
        <span>{sed.source_ids.length} fontes</span>
        <span className="ml-auto">
          {new Date(sed.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
      </div>
      <p className="text-sm text-[color:var(--ivory)] leading-snug mb-1">{sed.hipotese}</p>
      {sed.resumo && (
        <p className="text-xs text-[color:var(--ivory-dim)] leading-snug">{sed.resumo}</p>
      )}
      {sed.status === "em_revisao" && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={onConfirmar} disabled={busy}>
            <Sprout className="w-3 h-3 mr-1" /> plantar no Jardim
          </Button>
          <Button size="sm" variant="ghost" onClick={onDescartar} disabled={busy}>
            <Trash2 className="w-3 h-3 mr-1" /> descartar
          </Button>
        </div>
      )}
      {sed.status === "confirmado" && sed.promovido_para && (
        <p className="text-[10px] text-[color:var(--gold)]/70 mt-2 italic">
          já promovido para {sed.promovido_tipo}
        </p>
      )}
    </li>
  );
}

function subtituloNivel(nivel: string) {
  return NIVEL_SUBTITLE[nivel] ?? nivel;
}
