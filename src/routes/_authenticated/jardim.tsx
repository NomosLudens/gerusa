import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Archive, Flower2 } from "lucide-react";
import { archiveMemoria, createMemoria, listMemorias } from "@/lib/jardim.functions";

import {
  CardListSkeleton,
  RouteErrorBoundary,
  RouteNotFoundBoundary,
} from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/jardim")({
  component: JardimPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

function JardimPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMemorias);
  const create = useServerFn(createMemoria);
  const archive = useServerFn(archiveMemoria);

  const [showArchived, setShowArchived] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["jardim", showArchived],
    queryFn: () => list({ data: { archived: showArchived, limit: 200 } }),
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [importance, setImportance] = useState<1 | 2 | 3>(2);

  async function submit() {
    if (!title.trim() || !body.trim()) return;
    await create({ data: { title: title.trim(), body: body.trim(), importance } });
    setTitle("");
    setBody("");
    setImportance(2);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["jardim"] });
    qc.invalidateQueries({ queryKey: ["home-due"] });
  }

  async function toggleArchive(id: string, currentlyArchived: boolean) {
    await archive({ data: { id, archive: !currentlyArchived } });
    qc.invalidateQueries({ queryKey: ["jardim"] });
    qc.invalidateQueries({ queryKey: ["home-due"] });
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#08080E] text-[#F3EBDD]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 space-y-6">
        <header className="flex items-center gap-3 flex-wrap">
          <Flower2 className="w-5 h-5 text-[color:var(--gold)] shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--gold)]">
              Jardim
            </p>
            <h1 className="serif text-2xl sm:text-3xl">Memórias que voltam</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-[11px] uppercase tracking-[0.22em] text-[#F3EBDD]/60 hover:text-[color:var(--gold)] px-2 h-8 rounded-md border border-white/10"
            >
              {showArchived ? "ativas" : "arquivadas"}
            </button>
            <button
              onClick={() => setOpen(true)}
              className="text-sm px-3 h-8 rounded-md bg-[color:var(--gold)] text-[#08080E] hover:bg-[color:var(--gold)]"
            >
              + plantar
            </button>
          </div>
        </header>

        {open && (
          <section className="rounded-2xl border border-[color:var(--gold)]/30 bg-[#111016] p-4 sm:p-5 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da memória"
              className="w-full bg-[#0B0A10] border border-white/10 rounded-md px-3 h-10 text-sm outline-none focus:border-[color:var(--gold)]"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="O que você quer que volte pra você?"
              className="w-full bg-[#0B0A10] border border-white/10 rounded-md p-3 text-sm outline-none focus:border-[color:var(--gold)] resize-y"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/45">
                Importância
              </span>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setImportance(n as 1 | 2 | 3)}
                  className={
                    "px-3 h-7 rounded-full border text-[11px] " +
                    (importance === n
                      ? "border-[color:var(--gold)] text-[color:var(--gold)] bg-[color:var(--gold)]/10"
                      : "border-white/10 text-[#F3EBDD]/55")
                  }
                >
                  {n}
                </button>
              ))}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="text-sm px-3 h-8 rounded-md border border-white/10"
                >
                  cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={!title.trim() || !body.trim()}
                  className="text-sm px-3 h-8 rounded-md bg-[color:var(--gold)] text-[#08080E] hover:bg-[color:var(--gold)] disabled:opacity-40"
                >
                  plantar
                </button>
              </div>
            </div>
          </section>
        )}

        {isLoading && (
          <div className="mt-2">
            <CardListSkeleton rows={4} />
          </div>
        )}
        <section className="grid sm:grid-cols-2 gap-3 sm:gap-4 fade-up">
          {data && data.length === 0 && (
            <p className="text-sm italic text-[#F3EBDD]/45 col-span-full">
              {showArchived
                ? "Nenhuma memória arquivada."
                : "Jardim vazio. Plante a primeira memória."}
            </p>
          )}
          {(data ?? []).map((m) => {
            const due = new Date(m.next_review_at) <= new Date();
            return (
              <article key={m.id} className="rounded-xl border border-white/5 bg-[#111016] p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[color:var(--gold)]/80 mb-1">
                  <span>{m.category}</span>
                  <span className="text-[#F3EBDD]/45">imp {m.importance}</span>
                  {due && !m.archived_at && <span className="text-[#16A34A]">· vence agora</span>}
                </div>
                <p className="serif text-base text-[#F3EBDD]">{m.title}</p>
                <p className="text-sm text-[#F3EBDD]/70 mt-1 line-clamp-3">{m.body}</p>
                <div className="flex items-center gap-2 text-[10px] text-[#F3EBDD]/45 mt-3">
                  <span>revisões {m.review_count}</span>
                  <span>· intervalo {m.interval_days}d</span>
                  <span className="ml-auto">
                    {new Date(m.next_review_at).toLocaleDateString("pt-BR")}
                  </span>
                  <button
                    onClick={() => toggleArchive(m.id, !!m.archived_at)}
                    className="text-[#F3EBDD]/40 hover:text-[color:var(--gold)] p-1"
                    aria-label={m.archived_at ? "Reativar" : "Arquivar"}
                    title={m.archived_at ? "Reativar" : "Arquivar"}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
