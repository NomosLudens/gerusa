import { useEffect, useMemo, useState } from "react";
import { Eye, X } from "lucide-react";

type Discovery = {
  id: string;
  type: string;
  title: string | null;
  content: string;
  mediaUrl: string | null;
  revealedAt: string;
};
type PulseSession = {
  id: string;
  mesaId: string;
  mesaName: string;
  title: string;
  status: "live";
  discoveries: Discovery[];
};
type PulsePayload = { sessions?: PulseSession[] };
type ActiveDiscovery = Discovery & { sessionId: string; mesaName: string; sessionTitle: string };

const seenKey = (sessionId: string) => `kallistis:scene-pulse:${sessionId}:seen`;

function seenIds(sessionId: string): Set<string> {
  try {
    const value = JSON.parse(localStorage.getItem(seenKey(sessionId)) ?? "[]");
    return new Set(
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [],
    );
  } catch {
    return new Set();
  }
}

function firstUnseen(sessions: PulseSession[]): ActiveDiscovery | null {
  const discoveries = sessions
    .flatMap((session) =>
      session.discoveries.map((discovery) => ({
        ...discovery,
        sessionId: session.id,
        mesaName: session.mesaName,
        sessionTitle: session.title,
      })),
    )
    .sort(
      (left, right) =>
        left.revealedAt.localeCompare(right.revealedAt) || left.id.localeCompare(right.id),
    );
  return discoveries.find((discovery) => !seenIds(discovery.sessionId).has(discovery.id)) ?? null;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(value));
}

export function ScenePulseReceiver() {
  const [sessions, setSessions] = useState<PulseSession[]>([]);
  const [active, setActive] = useState<ActiveDiscovery | null>(null);
  const [discoveriesOpen, setDiscoveriesOpen] = useState(false);

  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;

    const poll = async () => {
      let nextDelay = 25000;
      try {
        const response = await fetch("/api/session-pulse", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as PulsePayload;
        const nextSessions = Array.isArray(payload.sessions) ? payload.sessions : [];
        if (disposed) return;
        setSessions(nextSessions);
        setActive((current) => current ?? firstUnseen(nextSessions));
        if (nextSessions.length) nextDelay = document.hidden ? 15000 : 3000;
      } catch {
        nextDelay = 25000;
      } finally {
        if (!disposed) timer = window.setTimeout(() => void poll(), nextDelay);
      }
    };

    void poll();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const discoveryCount = useMemo(
    () => sessions.reduce((total, session) => total + session.discoveries.length, 0),
    [sessions],
  );

  function acknowledge() {
    if (!active) return;
    const nextSeen = [...seenIds(active.sessionId), active.id];
    localStorage.setItem(seenKey(active.sessionId), JSON.stringify([...new Set(nextSeen)]));
    setActive(null);
  }

  return (
    <>
      {active ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Pulso de Cena"
            className="w-full max-w-md rounded-2xl border border-[color:var(--gold)]/45 bg-[#0C0B12] p-6 text-[#F3EBDD] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)]">
                  Pulso de Cena · {active.mesaName}
                </p>
                <p className="mt-2 text-xs text-[#F3EBDD]/45">{active.sessionTitle}</p>
              </div>
              <Eye className="h-5 w-5 shrink-0 text-[color:var(--gold)]" aria-hidden />
            </div>
            <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-[#F3EBDD]/45">
              {active.type}
            </p>
            <h2 className="serif mt-2 text-3xl">{active.title || "Acontecimento"}</h2>
            {active.mediaUrl ? (
              <img
                src={active.mediaUrl}
                alt={active.title || "Imagem da cena"}
                className="mt-5 max-h-64 w-full rounded-xl border border-white/10 object-contain"
              />
            ) : null}
            <p className="mt-5 whitespace-pre-wrap text-base leading-relaxed text-[#F3EBDD]/80">
              {active.content}
            </p>
            <button
              type="button"
              onClick={acknowledge}
              className="mt-7 min-h-12 w-full rounded-lg bg-[color:var(--gold)] px-4 text-xs font-semibold uppercase tracking-[0.16em] text-black"
            >
              Entendi
            </button>
          </section>
        </div>
      ) : null}
      {discoveryCount ? (
        <div className="fixed bottom-4 right-4 z-[70] w-[min(22rem,calc(100vw-2rem))]">
          {discoveriesOpen ? (
            <section
              aria-label="Descobertas"
              className="mb-2 max-h-[min(70vh,38rem)] overflow-auto rounded-2xl border border-white/15 bg-[#0C0B12]/[.98] p-4 text-[#F3EBDD] shadow-2xl"
            >
              <header className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--gold)]">
                    Registro da Mesa
                  </p>
                  <h2 className="serif mt-1 text-2xl">Descobertas · {discoveryCount}</h2>
                </div>
                <button
                  type="button"
                  aria-label="Fechar Descobertas"
                  onClick={() => setDiscoveriesOpen(false)}
                  className="rounded-lg p-2 text-[#F3EBDD]/60 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="mt-4 space-y-3">
                {sessions.map((session) =>
                  session.discoveries.map((discovery) => (
                    <article
                      key={`${session.id}:${discovery.id}`}
                      className="rounded-xl border border-white/10 p-3"
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--gold)]">
                        {discovery.type} · {session.mesaName}
                      </p>
                      <h3 className="serif mt-1 text-xl">{discovery.title || "Acontecimento"}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#F3EBDD]/75">
                        {discovery.content}
                      </p>
                      <time
                        className="mt-2 block text-[10px] text-[#F3EBDD]/40"
                        dateTime={discovery.revealedAt}
                      >
                        Revelado às {formatTime(discovery.revealedAt)}
                      </time>
                      {discovery.mediaUrl ? (
                        <img
                          src={discovery.mediaUrl}
                          alt={discovery.title || "Imagem da descoberta"}
                          className="mt-3 max-h-40 w-full rounded-lg object-contain"
                        />
                      ) : null}
                    </article>
                  )),
                )}
              </div>
            </section>
          ) : null}
          <button
            type="button"
            aria-expanded={discoveriesOpen}
            onClick={() => setDiscoveriesOpen((value) => !value)}
            className="ml-auto flex min-h-11 rounded-lg border border-[color:var(--gold)]/55 bg-[#0C0B12] px-4 text-xs uppercase tracking-[0.14em] text-[color:var(--gold)] shadow-lg"
          >
            Descobertas · {discoveryCount}
          </button>
        </div>
      ) : null}
    </>
  );
}
