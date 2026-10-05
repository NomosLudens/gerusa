import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type DespairReturn = {
  characterIds: string[];
  notes: string;
  recordedAt: string;
};

type RefugioState = {
  unlocked: boolean;
  name: string;
  description: string;
  customization: string;
  anchorPedralma: string;
  foundationQuest: string;
  activeSequence: boolean;
  lastDespairReturn: DespairReturn | null;
};

type Refugio = {
  mesaId: string;
  mesaName: string;
  canManage: boolean;
  state: RefugioState;
  updatedAt: string | null;
};

const emptyState: RefugioState = {
  unlocked: false,
  name: "",
  description: "",
  customization: "",
  anchorPedralma: "",
  foundationQuest: "",
  activeSequence: false,
  lastDespairReturn: null,
};

export function RefugioView() {
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<RefugioState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => refugios.find((refugio) => refugio.mesaId === selectedId) ?? null,
    [refugios, selectedId],
  );

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/refugio", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json()) as { refugios?: Refugio[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "refugio_load_failed");
      const next = payload.refugios ?? [];
      setRefugios(next);
      const nextSelectedId = selectedId || next[0]?.mesaId || "";
      setSelectedId(nextSelectedId);
      const nextSelected = next.find((refugio) => refugio.mesaId === nextSelectedId);
      if (nextSelected) setDraft(nextSelected.state);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir os Refúgios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selected) setDraft(selected.state);
  }, [selected]);

  async function mutate(action: "save" | "unlock" | "lock") {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch("/api/refugio", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mesaId: selected.mesaId, action, state: draft }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "refugio_save_failed");
      toast.success(action === "unlock" ? "Refúgio desbloqueado." : "Refúgio atualizado.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o Refúgio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl p-5 text-white">
      <p className="text-xs uppercase tracking-[0.24em] text-white/50">Espaço coletivo</p>
      <h1 className="mt-1 text-3xl font-semibold">Refúgio</h1>
      <p className="mt-2 max-w-3xl text-sm text-white/65">
        Um Refúgio por grupo, ancorado na Pedr’alma. Ele não concede bônus de combate, cura
        automática, teleporte, inventário ou progressão.
      </p>

      {loading ? <p className="mt-6 text-sm text-white/60">Abrindo Refúgios das Mesas…</p> : null}
      {!loading && !refugios.length ? (
        <p className="mt-6 rounded-xl border border-white/10 p-4 text-sm text-white/60">
          Você ainda não pertence a uma Mesa com Refúgio registrado.
        </p>
      ) : null}

      {refugios.length ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
          <div className="space-y-3">
            {refugios.map((refugio) => (
              <button
                key={refugio.mesaId}
                type="button"
                onClick={() => setSelectedId(refugio.mesaId)}
                className={
                  selectedId === refugio.mesaId
                    ? "w-full rounded-xl border border-[color:var(--gold)]/70 bg-[color:var(--gold)]/15 p-4 text-left"
                    : "w-full rounded-xl border border-white/10 bg-black/15 p-4 text-left"
                }
              >
                <span className="font-semibold">{refugio.mesaName}</span>
                <span className="mt-1 block text-xs text-white/55">
                  {refugio.state.unlocked ? "Desbloqueado" : "Bloqueado"}
                  {refugio.canManage ? " · Mestre" : ""}
                </span>
              </button>
            ))}
          </div>

          {selected ? (
            <article className="rounded-xl border border-[color:var(--gold)]/20 bg-black/15 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold)]/70">
                    Grupo
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">{selected.mesaName}</h2>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs">
                  {draft.unlocked ? "Desbloqueado" : "Bloqueado"}
                </span>
              </div>

              <p className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                {draft.activeSequence
                  ? "Acesso bloqueado durante a sequência ativa da campanha."
                  : draft.unlocked
                    ? "Acesso normal fora da sequência ativa da campanha."
                    : "Bloqueado até o Mestre registrar a Quest de Fundação."}
              </p>

              {selected.canManage ? (
                <div className="mt-5 space-y-4">
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50">
                      Nome
                    </span>
                    <input
                      className="w-full rounded border border-white/15 bg-black/30 px-3 py-2"
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50">
                      Quest de Fundação registrada
                    </span>
                    <textarea
                      className="min-h-20 w-full rounded border border-white/15 bg-black/30 px-3 py-2"
                      value={draft.foundationQuest}
                      onChange={(event) =>
                        setDraft({ ...draft, foundationQuest: event.target.value })
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50">
                      Descrição
                    </span>
                    <textarea
                      className="min-h-24 w-full rounded border border-white/15 bg-black/30 px-3 py-2"
                      value={draft.description}
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50">
                      Customização coletiva
                    </span>
                    <textarea
                      className="min-h-24 w-full rounded border border-white/15 bg-black/30 px-3 py-2"
                      value={draft.customization}
                      onChange={(event) =>
                        setDraft({ ...draft, customization: event.target.value })
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50">
                      Âncora na Pedr’alma
                    </span>
                    <input
                      className="w-full rounded border border-white/15 bg-black/30 px-3 py-2"
                      value={draft.anchorPedralma}
                      onChange={(event) =>
                        setDraft({ ...draft, anchorPedralma: event.target.value })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.activeSequence}
                      onChange={(event) =>
                        setDraft({ ...draft, activeSequence: event.target.checked })
                      }
                    />
                    Sequência ativa: bloquear acesso normal ao Refúgio
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => void mutate("save")}
                    >
                      Salvar Refúgio
                    </Button>
                    {draft.unlocked ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        onClick={() => void mutate("lock")}
                      >
                        Bloquear Refúgio
                      </Button>
                    ) : (
                      <Button type="button" disabled={saving} onClick={() => void mutate("unlock")}>
                        Desbloquear após a Quest
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-white/50">
                    Retorno de Desespero é decisão exclusiva do Mestre. Este painel não restaura
                    Vitalidade, Lucidez, Fluxo, itens, objetivos ou vitória automaticamente.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3 text-sm text-white/70">
                  <p>
                    <strong>{draft.name || "Refúgio do grupo"}</strong>
                  </p>
                  <p className="whitespace-pre-wrap">
                    {draft.description || "O Mestre ainda não registrou uma descrição."}
                  </p>
                  {draft.customization ? (
                    <p className="whitespace-pre-wrap">{draft.customization}</p>
                  ) : null}
                  {draft.anchorPedralma ? (
                    <p className="text-xs text-white/50">Pedr’alma: {draft.anchorPedralma}</p>
                  ) : null}
                  <p className="rounded border border-white/10 p-3 text-xs text-white/55">
                    Pet, Montaria e Refúgio são elementos narrativos. Nenhum deles cria estatísticas
                    ou ações de combate.
                  </p>
                </div>
              )}
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
