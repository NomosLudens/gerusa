import { useEffect, useState, type FormEvent } from "react";
import { Check, ChevronDown, Clock3, Flag, Plus, Radio, Square } from "lucide-react";

const eventTypes = ["NPC", "LOCAL", "OBJETO", "PISTA", "EVENTO", "DIARIO", "IMAGEM"] as const;
type EventType = (typeof eventTypes)[number];
type Mesa = { id: string; slug: string; name: string };
type Event = {
  id: string;
  sessionId: string;
  title: string | null;
  eventType: EventType;
  publicContent: string;
  privateNotes: string | null;
  promotedEntryId: string | null;
  revealedAt: string | null;
  mediaAssetId: string | null;
  createdAt: string;
};
type Session = {
  id: string;
  mesaId: string;
  title: string;
  status: "live" | "closed";
  startedAt: string;
  endedAt: string | null;
  summary: string | null;
  events: Event[];
};
type Payload = {
  mesa?: Mesa;
  liveSession?: Session | null;
  recentSessions?: Session[];
  canPromote?: boolean;
  error?: string;
};
type ReviewDraft = {
  eventType: EventType;
  title: string;
  publicContent: string;
  privateNotes: string;
  reveal: boolean;
};

const fieldClass =
  "mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-[#F3EBDD]";
const buttonClass =
  "min-h-11 rounded-lg border border-[color:var(--gold)]/50 px-3 text-xs uppercase tracking-[0.12em] text-[color:var(--gold)] disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string | null) {
  if (!value) return "agora";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

function formatElapsed(startedAt: string, now: number) {
  const totalSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours ? `${hours}h ${String(minutes).padStart(2, "0")}min` : `${minutes}min`;
}

function mediaUrl(assetId: string | null) {
  return assetId ? "/api/gallery/file?path=" + encodeURIComponent(assetId) : null;
}

async function readResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as Payload & {
    event?: Event;
    liveSession?: Session;
    session?: Session;
    entry?: { id: string };
  };
  if (!response.ok) throw new Error(payload.error || "mesa_live_session_failed");
  return payload;
}

export function MesaLiveSessionPanel({ mesaId }: { mesaId?: string }) {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [eventType, setEventType] = useState<EventType>("EVENTO");
  const [eventTitle, setEventTitle] = useState("");
  const [publicContent, setPublicContent] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [eventMediaAssetId, setEventMediaAssetId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [startTitle, setStartTitle] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [now, setNow] = useState(() => Date.now());

  const liveSession = payload.liveSession ?? null;
  const recentSessions = payload.recentSessions ?? [];

  useEffect(() => {
    if (!mesaId || mesaId === "all") {
      setPayload({});
      setReviewOpen(false);
      setStartOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setMessage("");
    setReviewOpen(false);
    setStartOpen(false);
    setDrafts({});
    void fetch("/api/master/live-session?mesaId=" + encodeURIComponent(mesaId), {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(readResponse)
      .then((next) => {
        if (!cancelled) setPayload(next);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setMessage(error instanceof Error ? error.message : "Falha ao carregar Sessão Viva.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mesaId]);

  useEffect(() => {
    setSummary(liveSession?.summary ?? "");
  }, [liveSession?.id, liveSession?.summary]);

  useEffect(() => {
    if (!liveSession || liveSession.status !== "live") return;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [liveSession]);

  function draftFor(event: Event): ReviewDraft {
    return (
      drafts[event.id] ?? {
        eventType: event.eventType,
        title: event.title ?? "",
        publicContent: event.publicContent,
        privateNotes: event.privateNotes ?? "",
        reveal: true,
      }
    );
  }
  function updateDraft(event: Event, update: Partial<ReviewDraft>) {
    setDrafts((current) => ({ ...current, [event.id]: { ...draftFor(event), ...update } }));
  }
  async function request(body: Record<string, unknown>) {
    return readResponse(
      await fetch("/api/master/live-session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaId, ...body }),
      }),
    );
  }
  async function reload() {
    if (!mesaId || mesaId === "all") return;
    setPayload(
      await readResponse(
        await fetch("/api/master/live-session?mesaId=" + encodeURIComponent(mesaId), {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ),
    );
  }

  function openStart() {
    setStartTitle("");
    setStartOpen(true);
    setMessage("");
  }
  async function start() {
    const title = startTitle.trim();
    if (!title) return;
    setBusy(true);
    setMessage("");
    try {
      await request({ action: "start", title: title.trim() });
      await reload();
      setStartOpen(false);
      setMessage("Sessão iniciada e persistida no PostgreSQL.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível iniciar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  async function recordEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!liveSession || !publicContent.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await request({
        action: "add_event",
        sessionId: liveSession.id,
        eventType,
        title: eventTitle,
        publicContent,
        privateNotes,
        mediaAssetId: eventMediaAssetId,
      });
      setEventTitle("");
      setPublicContent("");
      setPrivateNotes("");
      setEventMediaAssetId(null);
      await reload();
      setMessage("Acontecimento registrado.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível registrar o acontecimento.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadEventMedia(file: File) {
    if (!mesaId || mesaId === "all") {
      setMessage("Escolha uma Mesa antes do upload.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("mesaId", mesaId);
      form.set("file", file);
      const response = await fetch("/api/campaign-continuity", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const uploaded = (await response.json().catch(() => ({}))) as {
        mediaAssetId?: string;
        error?: string;
      };
      if (!response.ok || !uploaded.mediaAssetId)
        throw new Error(uploaded.error || "upload_without_reference");
      setEventMediaAssetId(uploaded.mediaAssetId);
      setMessage("Imagem recebida; ela será associada ao próximo acontecimento registrado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível subir a imagem.");
    } finally {
      setBusy(false);
    }
  }

  async function reveal(event: Event) {
    if (!mesaId || !liveSession || event.revealedAt) return;
    setBusy(true);
    setMessage("");
    try {
      await request({ action: "reveal", sessionId: liveSession.id, eventId: event.id });
      await reload();
      setMessage("Acontecimento revelado aos jogadores desta Mesa.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível revelar o acontecimento.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSummary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!liveSession) return;
    setBusy(true);
    setMessage("");
    try {
      await request({
        action: "update_summary",
        sessionId: liveSession.id,
        summary: summary.trim(),
      });
      await reload();
      setMessage("Resumo salvo no painel da sessão.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar o resumo da sessão.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function promote(event: Event) {
    if (!mesaId || !liveSession || !payload.canPromote || event.promotedEntryId) return;
    const draft = draftFor(event);
    if (!draft.title.trim() || !draft.publicContent.trim()) {
      setMessage("A promoção exige título e conteúdo.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const created = await readResponse(
        await fetch("/api/campaign-continuity", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            type: draft.eventType,
            title: draft.title.trim(),
            canonicalStatus: "PLAYED_CONFIRMED",
            editorialStatus: "READY",
            publicContent: draft.publicContent,
            privateNotes: draft.privateNotes,
            mediaAssetId: null,
          }),
        }),
      );
      if (!created.entry?.id) throw new Error("continuity_entry_not_created");
      await readResponse(
        await fetch("/api/campaign-continuity", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: draft.reveal ? "publish" : "hide",
            entryId: created.entry.id,
            mesaIds: [mesaId],
          }),
        }),
      );
      await request({
        action: "mark_promoted",
        sessionId: liveSession.id,
        eventId: event.id,
        entryId: created.entry.id,
      });
      await reload();
      setMessage(
        draft.reveal
          ? "Enviado para continuidade e revelado nesta Mesa."
          : "Enviado para continuidade, mantido oculto nesta Mesa.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível promover o acontecimento.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    if (!liveSession) return;
    setBusy(true);
    setMessage("");
    try {
      await request({ action: "close", sessionId: liveSession.id, summary });
      setSummary("");
      setReviewOpen(false);
      await reload();
      setMessage("Sessão encerrada; revisão preservada no histórico.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível encerrar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mb-6 rounded-xl border border-[color:var(--gold)]/30 bg-[#0C0B12]/95 p-5 text-[#F3EBDD]"
      aria-label="Sessão Viva"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)]">
            Mesa Hub
          </p>
          <h2 className="mt-1 text-xl font-semibold">Sessão Viva</h2>
          <p className="mt-1 text-xs text-[#F3EBDD]/55">
            {payload.mesa?.name ?? "Selecione uma Mesa para operar a sessão."}
          </p>
        </div>
        {liveSession?.status === "live" ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-emerald-200">
            <Radio className="h-3 w-3" /> Em andamento
          </span>
        ) : null}
      </header>
      {!mesaId || mesaId === "all" ? (
        <p className="mt-4 text-sm text-[#F3EBDD]/55">
          Escolha uma Mesa no seletor acima para iniciar ou consultar uma Sessão Viva.
        </p>
      ) : null}
      {loading ? (
        <p className="mt-4 text-sm text-[#F3EBDD]/55">Consultando a sessão persistida…</p>
      ) : null}
      {mesaId && mesaId !== "all" && !loading && !liveSession ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/15 p-4">
          <div>
            <p className="text-sm font-medium">Nenhuma sessão em andamento.</p>
            <p className="mt-1 text-xs text-[#F3EBDD]/50">
              O ledger começa quando o Mestre iniciar uma sessão real.
            </p>
          </div>
          <button type="button" className={buttonClass} disabled={busy} onClick={openStart}>
            <Plus className="mr-2 inline h-4 w-4" />
            Iniciar sessão
          </button>
          {startOpen ? (
            <div
              role="dialog"
              aria-label="Iniciar sessão"
              className="basis-full rounded-lg border border-[color:var(--gold)]/35 bg-black/25 p-4"
            >
              <label className="block text-xs text-[#F3EBDD]/65">
                Título / identificação
                <input
                  autoFocus
                  value={startTitle}
                  onChange={(event) => setStartTitle(event.target.value)}
                  className={fieldClass}
                  placeholder="Ex.: Sessão 02 — Casa do Chapéu"
                  maxLength={160}
                />
              </label>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-lg border border-white/15 px-3 text-xs uppercase tracking-[0.12em] text-[#F3EBDD]/65"
                  disabled={busy}
                  onClick={() => setStartOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy || !startTitle.trim()}
                  onClick={() => void start()}
                >
                  Iniciar sessão
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {liveSession?.status === "live" ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-950/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/75">
                  ● Sessão em andamento
                </p>
                <h3 className="mt-1 text-lg">{liveSession.title}</h3>
                <p className="mt-1 text-xs text-[#F3EBDD]/50">
                  Começou em {formatDate(liveSession.startedAt)} ·{" "}
                  {formatElapsed(liveSession.startedAt, now)}
                </p>
              </div>
              <button
                type="button"
                className="min-h-11 rounded-lg border border-red-300/35 px-3 text-xs uppercase tracking-[0.12em] text-red-200"
                disabled={busy}
                onClick={() => setReviewOpen((value) => !value)}
              >
                <Square className="mr-2 inline h-3 w-3" />
                {reviewOpen ? "Voltar à sessão" : "Encerrar sessão"}
              </button>
            </div>
          </div>
          <form
            onSubmit={(event) => void saveSummary(event)}
            className="rounded-lg border border-[color:var(--gold)]/25 bg-[color:var(--gold)]/5 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--gold)]">
                  Registro vivo
                </p>
                <h3 className="mt-1 text-sm font-medium">Resumo da sessão</h3>
                <p className="mt-1 text-xs text-[#F3EBDD]/55">
                  Escreva ao longo da mesa; este texto ficará no painel da sessão encerrada.
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#F3EBDD]/45">
                {summary.trim() ? "Salvo no PostgreSQL" : "Ainda vazio"}
              </span>
            </div>
            <label className="mt-3 block text-xs text-[#F3EBDD]/65">
              Resumo em andamento
              <textarea
                aria-label="Resumo em andamento"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className={fieldClass + " min-h-28"}
                maxLength={30000}
                placeholder="Registre aqui os fios principais da sessão enquanto ela acontece."
              />
            </label>
            <button type="submit" className={buttonClass + " mt-3"} disabled={busy}>
              Salvar resumo
            </button>
          </form>
          <form
            onSubmit={(event) => void recordEvent(event)}
            className="rounded-lg border border-[color:var(--gold)]/25 bg-[color:var(--gold)]/5 p-4"
          >
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-[color:var(--gold)]" />
              <h3 className="text-sm font-medium">Registrar acontecimento</h3>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-[#F3EBDD]/65">
                Tipo
                <select
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value as EventType)}
                  className={fieldClass}
                >
                  {eventTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[#F3EBDD]/65">
                Título opcional
                <input
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  className={fieldClass}
                  maxLength={160}
                  placeholder="Ex.: A porta se abriu"
                />
              </label>
            </div>
            <label className="mt-3 block text-xs text-[#F3EBDD]/65">
              O que aconteceu?
              <textarea
                required
                value={publicContent}
                onChange={(event) => setPublicContent(event.target.value)}
                className={fieldClass + " min-h-24"}
                maxLength={30000}
                placeholder="Registre o fato observado pela Mesa."
              />
            </label>
            <label className="mt-3 block text-xs text-[#F3EBDD]/65">
              Nota privada opcional
              <textarea
                value={privateNotes}
                onChange={(event) => setPrivateNotes(event.target.value)}
                className={fieldClass + " min-h-20 border-red-300/20 bg-red-950/10"}
                maxLength={30000}
                placeholder="Fica no registro do Mestre."
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-white/10 px-3 text-xs">
                <span>Subir imagem real (opcional)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={busy}
                  onChange={(input) => {
                    const file = input.target.files?.[0];
                    if (file) void uploadEventMedia(file);
                    input.currentTarget.value = "";
                  }}
                />
              </label>
              {eventMediaAssetId ? (
                <span className="text-xs text-[#F3EBDD]/55">
                  Imagem pronta para este acontecimento.
                </span>
              ) : null}
            </div>
            <button
              type="submit"
              className={buttonClass + " mt-3"}
              disabled={busy || !publicContent.trim()}
            >
              <Check className="mr-2 inline h-4 w-4" />
              Registrar
            </button>
          </form>
          <div className="rounded-lg border border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Acontecimentos desta sessão</h3>
              <span className="text-xs text-[#F3EBDD]/45">
                {liveSession.events.length} registrado{liveSession.events.length === 1 ? "" : "s"}
              </span>
            </div>
            {liveSession.events.length ? (
              <div className="mt-3 space-y-2">
                {liveSession.events.map((event) => (
                  <article key={event.id} className="rounded border border-white/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--gold)]">
                        {event.eventType}
                        {event.title ? " · " + event.title : ""}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#F3EBDD]/40">
                        <span>{formatDate(event.createdAt)}</span>
                        {event.revealedAt ? (
                          <span className="text-emerald-200">
                            Revelado às {formatDate(event.revealedAt)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="min-h-9 rounded border border-[color:var(--gold)]/55 px-2 text-[color:var(--gold)]"
                            disabled={busy}
                            onClick={() => void reveal(event)}
                          >
                            Revelar agora
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[#F3EBDD]/75">
                      {event.publicContent}
                    </p>
                    {mediaUrl(event.mediaAssetId) ? (
                      <img
                        src={mediaUrl(event.mediaAssetId)!}
                        alt={event.title || "Imagem do acontecimento"}
                        className="mt-3 max-h-40 rounded-lg object-contain"
                      />
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-[#F3EBDD]/45">
                Nenhum acontecimento registrado ainda.
              </p>
            )}
          </div>
          {reviewOpen ? (
            <div className="rounded-lg border border-red-300/25 bg-red-950/10 p-4">
              <div className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 text-red-200" />
                <div>
                  <h3 className="text-sm font-medium">Revisão final</h3>
                  <p className="mt-1 text-xs text-[#F3EBDD]/60">
                    Revise antes de encerrar. Registrar não altera a continuidade automaticamente.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                {liveSession.events.map((event) => {
                  const draft = draftFor(event);
                  return (
                    <article
                      key={event.id}
                      className="rounded-lg border border-white/10 bg-black/20 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-[#F3EBDD]/45">
                          {event.eventType}
                        </span>
                        {event.promotedEntryId ? (
                          <span className="text-xs text-emerald-200">
                            Enviado para continuidade
                          </span>
                        ) : null}
                      </div>
                      {event.promotedEntryId ? (
                        <p className="mt-2 text-sm text-[#F3EBDD]/65">
                          {event.title || "Acontecimento registrado"} foi promovido e não pode ser
                          promovido novamente.
                        </p>
                      ) : (
                        <>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="text-xs text-[#F3EBDD]/65">
                              Tipo
                              <select
                                value={draft.eventType}
                                onChange={(input) =>
                                  updateDraft(event, { eventType: input.target.value as EventType })
                                }
                                className={fieldClass}
                              >
                                {eventTypes.map((type) => (
                                  <option key={type}>{type}</option>
                                ))}
                              </select>
                            </label>
                            <label className="text-xs text-[#F3EBDD]/65">
                              Título
                              <input
                                value={draft.title}
                                onChange={(input) =>
                                  updateDraft(event, { title: input.target.value })
                                }
                                className={fieldClass}
                                maxLength={160}
                              />
                            </label>
                          </div>
                          <label className="mt-3 block text-xs text-[#F3EBDD]/65">
                            Conteúdo público
                            <textarea
                              value={draft.publicContent}
                              onChange={(input) =>
                                updateDraft(event, { publicContent: input.target.value })
                              }
                              className={fieldClass + " min-h-24"}
                              maxLength={30000}
                            />
                          </label>
                          <label className="mt-3 block text-xs text-[#F3EBDD]/65">
                            Notas privadas
                            <textarea
                              value={draft.privateNotes}
                              onChange={(input) =>
                                updateDraft(event, { privateNotes: input.target.value })
                              }
                              className={fieldClass + " min-h-20 border-red-300/20 bg-red-950/10"}
                              maxLength={30000}
                            />
                          </label>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <label className="inline-flex min-h-11 items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={draft.reveal}
                                onChange={(input) =>
                                  updateDraft(event, { reveal: input.target.checked })
                                }
                              />
                              Revelar para {payload.mesa?.name ?? "esta Mesa"}
                            </label>
                            {payload.canPromote ? (
                              <button
                                type="button"
                                className={buttonClass}
                                disabled={busy}
                                onClick={() => void promote(event)}
                              >
                                Promover para continuidade
                              </button>
                            ) : (
                              <span className="text-xs text-amber-200/80">
                                Pendente de confirmação na continuidade
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
              <label className="mt-4 block text-xs text-[#F3EBDD]/65">
                Resumo da sessão
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  className={fieldClass + " min-h-20"}
                  maxLength={30000}
                  placeholder="Opcional; escrito pelo Mestre."
                />
              </label>
              <button
                type="button"
                className="mt-3 min-h-11 rounded-lg bg-red-200 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-red-950"
                disabled={busy}
                onClick={() => void close()}
              >
                Encerrar e guardar revisão
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {recentSessions.length ? (
        <section className="mt-5 border-t border-white/10 pt-4">
          <h3 className="text-sm font-medium">Sessões recentes</h3>
          <div className="mt-3 space-y-2">
            {recentSessions.map((session) => (
              <details
                key={session.id}
                className="rounded-lg border border-white/10 bg-black/15 p-3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
                  <span>{session.title}</span>
                  <span className="text-xs text-[#F3EBDD]/45">{formatDate(session.endedAt)}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#F3EBDD]/45" />
                </summary>
                {session.summary ? (
                  <div className="mt-3 rounded-lg border border-[color:var(--gold)]/25 bg-[color:var(--gold)]/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--gold)]">
                      Resumo da sessão
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[#F3EBDD]/80">
                      {session.summary}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[#F3EBDD]/55">Sem resumo escrito.</p>
                )}
                <p className="mt-2 text-xs text-[#F3EBDD]/55">
                  {session.events.length} acontecimento
                  {session.events.length === 1 ? "" : "s"}
                </p>
                <div className="mt-3 space-y-2">
                  {session.events.map((event) => (
                    <div key={event.id} className="rounded border border-white/10 p-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--gold)]">
                        {event.eventType}
                        {event.title ? " · " + event.title : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-[#F3EBDD]/70">
                        {event.publicContent}
                      </p>
                      {event.privateNotes ? (
                        <div className="mt-2 rounded border border-red-300/15 bg-red-950/10 p-2">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-red-200/75">
                            Notas privadas do Mestre
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-xs text-[#F3EBDD]/70">
                            {event.privateNotes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
      {message ? (
        <p role="status" className="mt-4 text-xs text-[#F3EBDD]/65">
          {message}
        </p>
      ) : null}
    </section>
  );
}
