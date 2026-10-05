import { useEffect, useState } from "react";
import { BookOpen, Image as ImageIcon, MapPin, ScrollText, Sparkles, Users } from "lucide-react";
type Mesa = { id: string; slug: string; name: string };
type Entry = {
  id: string;
  type: string;
  title: string;
  publicContent: string;
  mediaUrl: string | null;
  publishedAt: string;
};
type Payload = { mesa?: Mesa; vttAvailable?: boolean; entries?: Entry[]; error?: string };
const icons: Record<string, typeof Users> = {
  NPC: Users,
  LOCAL: MapPin,
  OBJETO: ScrollText,
  PISTA: Sparkles,
  EVENTO: BookOpen,
  DIARIO: ScrollText,
  IMAGEM: ImageIcon,
};
export function CampaignPageShell({ mesaSlug }: { mesaSlug: string }) {
  const [payload, setPayload] = useState<Payload>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  async function openVtt() {
    setBusy(true);
    try {
      const response = await fetch("/api/vtt/handoff", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mesaId: payload.mesa?.id }),
      });
      const next = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !next.url) throw new Error(next.error ?? "vtt_handoff_failed");
      window.location.assign(next.url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível abrir o VTT.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetch("/api/campaign-continuity?mesaSlug=" + encodeURIComponent(mesaSlug), {
        credentials: "same-origin",
        cache: "no-store",
      })
        .then(async (response) => {
          const next = (await response.json().catch(() => ({}))) as Payload;
          if (!response.ok) throw new Error(next.error ?? "campaign_unavailable");
          if (!cancelled) {
            setPayload(next);
            setState("ready");
          }
        })
        .catch(() => {
          if (!cancelled) setState("error");
        });
    };
    load();
    const interval = window.setInterval(load, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [mesaSlug]);
  const entries = payload.entries ?? [];
  return (
    <main className="min-h-full overflow-y-auto bg-[#08080E] px-4 py-8 text-[#F3EBDD] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-white/10 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)]">
                <Sparkles className="h-4 w-4" /> Dossiê vivo · campanha
              </p>
              <h1 className="mt-3 font-serif text-4xl sm:text-5xl">
                {payload.mesa?.name ?? mesaSlug}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#F3EBDD]/60">
                A continuidade revelada para esta Mesa. O conteúdo é atualizado automaticamente
                quando o Mestre publica uma nova entrada.
              </p>
            </div>
            {payload.vttAvailable ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void openVtt()}
                className="rounded-lg border border-[color:var(--gold)]/50 px-4 py-2 text-xs uppercase tracking-[0.16em] text-[color:var(--gold)] disabled:opacity-50"
              >
                {busy ? "Abrindo…" : "Abrir VTT"}
              </button>
            ) : null}
          </div>
        </header>
        {state === "loading" ? (
          <p className="py-12 text-center text-sm text-[#F3EBDD]/55">Carregando o dossiê…</p>
        ) : null}
        {state === "error" ? (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-300/20 bg-red-950/20 p-5 text-sm"
          >
            Não foi possível carregar esta campanha.
          </p>
        ) : null}
        {state === "ready" && !entries.length ? (
          <p className="mt-6 rounded-xl border border-white/10 p-5 text-sm text-[#F3EBDD]/55">
            Nenhuma revelação para esta Mesa ainda.
          </p>
        ) : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => {
            const Icon = icons[entry.type] ?? ScrollText;
            return (
              <article
                key={entry.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]"
              >
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                  <Icon className="h-4 w-4 text-[color:var(--gold)]" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#F3EBDD]/50">
                    {entry.type}
                  </span>
                </div>
                {entry.mediaUrl ? (
                  <img
                    src={entry.mediaUrl}
                    alt={entry.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : null}
                <div className="p-4">
                  <h2 className="font-serif text-2xl">{entry.title}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#F3EBDD]/75">
                    {entry.publicContent}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
