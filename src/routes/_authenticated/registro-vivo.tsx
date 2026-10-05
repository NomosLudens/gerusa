import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Feather, Trash2 } from "lucide-react";
import { createRegistro, listRegistros, deleteRegistro } from "@/lib/registro-vivo.functions";
import { SemaforoPresence } from "@/components/SemaforoPresence";

import {
  CardListSkeleton,
  RouteErrorBoundary,
  RouteNotFoundBoundary,
} from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/registro-vivo")({
  component: RegistroVivoPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

const KINDS = [
  { v: "nota", label: "nota" },
  { v: "evento", label: "evento" },
  { v: "sentimento", label: "sentimento" },
  { v: "ideia", label: "ideia" },
  { v: "dor", label: "dor" },
  { v: "ganho", label: "ganho" },
  { v: "sonho", label: "sonho" },
  { v: "pergunta", label: "pergunta" },
] as const;

function RegistroVivoPage() {
  const qc = useQueryClient();
  const list = useServerFn(listRegistros);
  const create = useServerFn(createRegistro);
  const remove = useServerFn(deleteRegistro);

  const { data, isLoading } = useQuery({
    queryKey: ["registros"],
    queryFn: () => list({ data: { limit: 100 } }),
  });

  const [kind, setKind] = useState<(typeof KINDS)[number]["v"]>("nota");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!body.trim() || saving) return;
    setSaving(true);
    try {
      await create({
        data: {
          kind,
          body: body.trim(),
          mood,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      setBody("");
      setTags("");
      setMood(null);
      qc.invalidateQueries({ queryKey: ["registros"] });
      qc.invalidateQueries({ queryKey: ["home-registros"] });
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!window.confirm("Remover este registro?")) return;
    await remove({ data: { id } });
    qc.invalidateQueries({ queryKey: ["registros"] });
    qc.invalidateQueries({ queryKey: ["home-registros"] });
  }

  return (
    <div className="min-h-full overflow-x-hidden bg-[#08080E] text-[#F3EBDD]">
      <div className="mx-auto max-w-3xl space-y-6 px-3 py-5 pb-24 sm:px-6 sm:py-10">
        <header className="flex items-center gap-3">
          <Feather className="w-5 h-5 text-[color:var(--gold)]" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--gold)]">
              Registro Vivo
            </p>
            <h1 className="serif text-2xl sm:text-3xl">Captura densa do dia</h1>
          </div>
        </header>

        <div className="mb-6">
          <SemaforoPresence />
        </div>

        <section className="max-w-full rounded-2xl border border-white/5 bg-[#111016] p-3 sm:p-5">
          <div className="mb-3 flex max-w-full flex-wrap gap-1">
            {KINDS.map((k) => (
              <button
                key={k.v}
                onClick={() => setKind(k.v)}
                className={
                  "h-7 rounded-full border px-2.5 text-[10px] uppercase tracking-[0.14em] transition sm:text-[11px] sm:tracking-[0.2em] " +
                  (kind === k.v
                    ? "border-[color:var(--gold)] text-[color:var(--gold)] bg-[color:var(--gold)]/10"
                    : "border-white/10 text-[#F3EBDD]/60 hover:border-[color:var(--gold)]/50")
                }
              >
                {k.label}
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="O que está vivo agora? Escreva sem filtro — depois você decide o que plantar."
            rows={4}
            className="w-full bg-[#0B0A10] border border-white/10 rounded-md p-3 text-sm outline-none focus:border-[color:var(--gold)] resize-y"
          />
          <div className="mt-3 flex max-w-full flex-wrap items-center gap-3">
            <div className="max-w-full overflow-x-auto pb-1">
              <div className="flex w-max items-center gap-1.5 pr-1">
                <span className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/45">
                  Humor
                </span>
                {[-3, -2, -1, 0, 1, 2, 3].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(mood === m ? null : m)}
                    className={
                      "w-7 h-7 rounded-md text-xs tabular-nums border transition " +
                      (mood === m
                        ? "border-[color:var(--gold)] text-[color:var(--gold)] bg-[color:var(--gold)]/10"
                        : "border-white/10 text-[#F3EBDD]/55 hover:border-[color:var(--gold)]/50")
                    }
                  >
                    {m > 0 ? `+${m}` : m}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tags separadas por vírgula"
              className="h-9 min-w-0 flex-[1_1_180px] rounded-md border border-white/10 bg-[#0B0A10] px-3 text-sm outline-none focus:border-[color:var(--gold)]"
            />
            <button
              onClick={submit}
              disabled={!body.trim() || saving}
              className="px-4 h-9 rounded-md bg-[color:var(--gold)] text-[#08080E] text-sm font-medium hover:bg-[color:var(--gold)] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {saving ? "registrando…" : "Registrar"}
            </button>
          </div>
        </section>

        <section className="space-y-2">
          {isLoading && <CardListSkeleton rows={5} />}
          {data && data.length === 0 && (
            <p className="text-sm italic text-[#F3EBDD]/45">
              Nada capturado hoje ainda. O que está vivo agora?
            </p>
          )}
          <div className="space-y-2 fade-up">
            {(data ?? []).map((r) => (
              <article
                key={r.id}
                className="max-w-full overflow-hidden rounded-xl border border-white/5 bg-[#111016] p-3 sm:p-4"
              >
                <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[color:var(--gold)]/80 sm:tracking-[0.22em]">
                  <span>{r.kind}</span>
                  {typeof r.mood === "number" && (
                    <span className="text-[#F3EBDD]/55">
                      humor {r.mood > 0 ? `+${r.mood}` : r.mood}
                    </span>
                  )}
                  <span className="ml-auto text-[#F3EBDD]/40 normal-case tracking-normal">
                    {new Date(r.occurred_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm text-[#F3EBDD]/90 whitespace-pre-wrap">{r.body}</p>
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 h-5 inline-flex items-center rounded-full bg-white/5 text-[#F3EBDD]/55"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => del(r.id)}
                    aria-label="Remover registro"
                    className="ml-auto text-[#F3EBDD]/40 hover:text-[#BE123C] p-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
