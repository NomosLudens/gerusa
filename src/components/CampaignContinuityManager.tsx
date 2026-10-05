import { useEffect, useMemo, useState } from "react";
type Mesa = { id: string; slug: string; name: string };
type Entry = {
  id: string;
  type: string;
  title: string;
  canonicalStatus: string;
  editorialStatus: string;
  publicContent: string;
  privateNotes: string;
  mediaAssetId: string | null;
  mediaUrl: string | null;
  publicationMesaIds: string[];
};
type Payload = { mesas?: Mesa[]; entries?: Entry[]; error?: string };
const emptyDraft = {
  type: "NPC",
  title: "",
  canonicalStatus: "PLANNED",
  editorialStatus: "READY",
  publicContent: "",
  privateNotes: "",
  mediaAssetId: null as string | null,
};
async function readPayload(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as Payload;
  if (!response.ok)
    throw new Error(
      payload.error === "public_content_required"
        ? "Preencha o conteúdo público antes de revelar a entrada."
        : (payload.error ?? "campaign_continuity_failed"),
    );
  return payload;
}
export function CampaignContinuityManager({ selectedMesa }: { selectedMesa?: string }) {
  const [payload, setPayload] = useState<Payload>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => {
    try {
      setPayload(
        await readPayload(
          await fetch("/api/campaign-continuity?view=master", {
            credentials: "same-origin",
            cache: "no-store",
          }),
        ),
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível carregar a continuidade.",
      );
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (selectedMesa && selectedMesa !== "all" && !targetIds.length) setTargetIds([selectedMesa]);
  }, [selectedMesa, targetIds.length]);
  const entries = payload.entries ?? [];
  const mesas = payload.mesas ?? [];
  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId],
  );
  function choose(entry: Entry) {
    setSelectedId(entry.id);
    setDraft({
      type: entry.type,
      title: entry.title,
      canonicalStatus: entry.canonicalStatus,
      editorialStatus: entry.editorialStatus,
      publicContent: entry.publicContent,
      privateNotes: entry.privateNotes,
      mediaAssetId: entry.mediaAssetId,
    });
    setTargetIds(entry.publicationMesaIds);
    setMessage("");
  }
  function newEntry() {
    setSelectedId(null);
    setDraft(emptyDraft);
    setTargetIds(selectedMesa && selectedMesa !== "all" ? [selectedMesa] : []);
    setMessage("");
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/campaign-continuity", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedId ? "update" : "create",
          entryId: selectedId,
          ...draft,
        }),
      });
      const next = (await readPayload(response)) as Payload & { entry?: Entry };
      if (next.entry) {
        setSelectedId(next.entry.id);
        choose(next.entry);
      }
      await load();
      setMessage("Estado persistido no PostgreSQL.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    if (!selectedMesa || selectedMesa === "all") {
      setMessage("Escolha uma Mesa antes do upload.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("mesaId", selectedMesa);
      form.set("file", file);
      const next = (await readPayload(
        await fetch("/api/campaign-continuity", {
          method: "POST",
          credentials: "same-origin",
          body: form,
        }),
      )) as Payload & { mediaAssetId?: string };
      if (!next.mediaAssetId) throw new Error("upload_without_reference");
      setDraft((value) => ({ ...value, mediaAssetId: next.mediaAssetId! }));
      setMessage("Imagem recebida; salve a entrada para associá-la.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }
  async function publish(action: "publish" | "hide") {
    if (!selectedId || !targetIds.length) {
      setMessage("Selecione a entrada e pelo menos uma Mesa.");
      return;
    }
    if (action === "publish" && !draft.publicContent.trim()) {
      setMessage("Preencha o conteúdo público antes de revelar a entrada.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await readPayload(
        await fetch("/api/campaign-continuity", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, entryId: selectedId, mesaIds: targetIds }),
        }),
      );
      await load();
      setMessage(
        action === "publish"
          ? "Revelação publicada na Mesa escolhida."
          : "Revelação ocultada sem apagar o conteúdo.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha na publicação.");
    } finally {
      setBusy(false);
    }
  }
  async function archive() {
    if (!selectedId || !window.confirm("Arquivar esta entrada operacional?")) return;
    setBusy(true);
    try {
      await readPayload(
        await fetch("/api/campaign-continuity", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "archive", entryId: selectedId }),
        }),
      );
      newEntry();
      await load();
      setMessage("Entrada arquivada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao arquivar.");
    } finally {
      setBusy(false);
    }
  }
  const change = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <section
      className="mb-6 rounded-xl border border-white/10 bg-[#0C0B12]/90 p-5 text-[#F3EBDD]"
      aria-label="Continuidade viva das campanhas"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)]">
            Dossiê vivo
          </p>
          <h2 className="mt-1 text-xl font-semibold">Continuidade das campanhas</h2>
          <p className="mt-1 text-xs text-[#F3EBDD]/55">
            Uma entrada, publicação seletiva por Mesa e notas do Mestre fora do payload do jogador.
          </p>
        </div>
        <button
          type="button"
          onClick={newEntry}
          className="min-h-11 rounded-lg border border-[color:var(--gold)]/50 px-3 text-xs uppercase tracking-[0.12em] text-[color:var(--gold)]"
        >
          Nova entrada
        </button>
      </header>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(13rem,0.7fr)_minmax(0,1.3fr)]">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#F3EBDD]/45">
            Entradas persistidas
          </p>
          {entries.length ? (
            entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => choose(entry)}
                className={`min-h-11 w-full rounded-lg border px-3 py-2 text-left ${selectedId === entry.id ? "border-[color:var(--gold)]/70 bg-[color:var(--gold)]/10" : "border-white/10 bg-white/[0.02]"}`}
              >
                <span className="block truncate text-sm">{entry.title}</span>
                <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-[#F3EBDD]/45">
                  {entry.type} · {entry.editorialStatus} · {entry.publicationMesaIds.length} Mesa(s)
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-lg border border-white/10 p-3 text-xs text-[#F3EBDD]/50">
              Nenhuma entrada criada.
            </p>
          )}
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[#F3EBDD]/65">
              Tipo
              <select
                value={draft.type}
                onChange={(event) => change("type", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-[#F3EBDD]"
              >
                <option>NPC</option>
                <option>LOCAL</option>
                <option>OBJETO</option>
                <option>PISTA</option>
                <option>EVENTO</option>
                <option>DIARIO</option>
                <option>IMAGEM</option>
              </select>
            </label>
            <label className="text-xs text-[#F3EBDD]/65">
              Status canônico
              <select
                value={draft.canonicalStatus}
                onChange={(event) => change("canonicalStatus", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-[#F3EBDD]"
              >
                <option>PLANNED</option>
                <option>OPEN</option>
                <option>PLAYED_CONFIRMED</option>
                <option>RECOVERED_SESSION_NOTE</option>
                <option>CAMPAIGN_CANON</option>
                <option>CAMPAIGN_LOCK</option>
              </select>
            </label>
          </div>
          <label className="block text-xs text-[#F3EBDD]/65">
            Nome / título
            <input
              value={draft.title}
              onChange={(event) => change("title", event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-[#F3EBDD]"
              placeholder="Ex.: Berta"
            />
          </label>
          <label className="block text-xs text-[#F3EBDD]/65">
            Conteúdo público
            <textarea
              value={draft.publicContent}
              onChange={(event) => change("publicContent", event.target.value)}
              className="mt-1 min-h-24 w-full rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-[#F3EBDD]"
              placeholder="O que jogadores podem ler quando a entrada for revelada."
            />
          </label>
          <label className="block text-xs text-[#F3EBDD]/65">
            Notas privadas do Mestre
            <textarea
              value={draft.privateNotes}
              onChange={(event) => change("privateNotes", event.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border border-red-300/20 bg-red-950/10 p-3 text-sm text-[#F3EBDD]"
              placeholder="Nunca é incluído no payload do jogador."
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-white/10 px-3 text-xs">
              <span>Subir imagem real</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {draft.mediaAssetId ? (
              <span className="text-xs text-[#F3EBDD]/55">
                Referência de mídia: {draft.mediaAssetId.split("/").pop()}
              </span>
            ) : null}
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#F3EBDD]/45">
              Publicar por Mesa
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {mesas.map((mesa) => (
                <label key={mesa.id} className="inline-flex min-h-11 items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={targetIds.includes(mesa.id)}
                    onChange={(event) =>
                      setTargetIds((ids) =>
                        event.target.checked
                          ? [...new Set([...ids, mesa.id])]
                          : ids.filter((id) => id !== mesa.id),
                      )
                    }
                  />
                  {mesa.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !draft.title.trim()}
              onClick={() => void save()}
              className="min-h-11 rounded-lg bg-[color:var(--gold)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-black disabled:opacity-50"
            >
              Salvar estado
            </button>
            <button
              type="button"
              disabled={busy || !selectedId || !targetIds.length || !draft.publicContent.trim()}
              onClick={() => void publish("publish")}
              className="min-h-11 rounded-lg border border-emerald-300/40 px-4 text-xs uppercase tracking-[0.12em] text-emerald-200 disabled:opacity-50"
            >
              Revelar selecionadas
            </button>
            <button
              type="button"
              disabled={busy || !selectedId || !targetIds.length}
              onClick={() => void publish("hide")}
              className="min-h-11 rounded-lg border border-amber-300/30 px-4 text-xs uppercase tracking-[0.12em] text-amber-100 disabled:opacity-50"
            >
              Ocultar selecionadas
            </button>
            {selectedId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void archive()}
                className="min-h-11 rounded-lg border border-red-300/30 px-4 text-xs uppercase tracking-[0.12em] text-red-200 disabled:opacity-50"
              >
                Arquivar
              </button>
            ) : null}
          </div>
          {message ? (
            <p role="status" className="text-xs text-[#F3EBDD]/65">
              {message}
            </p>
          ) : null}
          {selected?.mediaUrl ? (
            <img
              src={selected.mediaUrl}
              alt={selected.title}
              className="max-h-48 rounded-lg border border-white/10 object-contain"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
