import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import {
  presenceLabel,
  threadForPlayer,
  type MasterPresenceRow,
  type MasterThreadSummary,
} from "@/lib/presence-ui";
import { usePolling } from "@/lib/use-polling";

type Message = { id: string; sender_user_id: string; body: string; created_at: string };

export function MasterOperationalRail({ mesaId }: { mesaId: string | null }) {
  const [players, setPlayers] = useState<MasterPresenceRow[]>([]);
  const [threads, setThreads] = useState<MasterThreadSummary[]>([]);
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criticalChange, setCriticalChange] = useState(false);
  const previousRegimes = useRef<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!mesaId) {
      setPlayers([]);
      setThreads([]);
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const [presenceResponse, threadsResponse] = await Promise.all([
        fetch("/api/master/presence?mesa_id=" + encodeURIComponent(mesaId), {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch("/api/master/private-messages", { credentials: "same-origin", cache: "no-store" }),
      ]);
      const presenceData = (await presenceResponse.json().catch(() => ({}))) as {
        players?: MasterPresenceRow[];
        error?: string;
      };
      const threadData = (await threadsResponse.json().catch(() => ({}))) as {
        threads?: MasterThreadSummary[];
        error?: string;
      };
      if (!presenceResponse.ok) throw new Error(presenceData.error || "master_presence_failed");
      if (!threadsResponse.ok) throw new Error(threadData.error || "master_threads_failed");
      const nextPlayers = presenceData.players ?? [],
        nextThreads = threadData.threads ?? [];
      const old = previousRegimes.current;
      if (
        activePlayer &&
        nextPlayers.some(
          (player) =>
            player.player_user_id === activePlayer &&
            old[activePlayer] &&
            old[activePlayer] !== player.regime,
        )
      )
        setCriticalChange(true);
      previousRegimes.current = Object.fromEntries(
        nextPlayers.map((player) => [player.player_user_id, player.regime]),
      );
      setPlayers(nextPlayers);
      setThreads(nextThreads);
      setError(null);
      if (activePlayer) {
        const detailResponse = await fetch(
          "/api/master/private-messages?player_user_id=" + encodeURIComponent(activePlayer),
          { credentials: "same-origin", cache: "no-store" },
        );
        if (detailResponse.ok) {
          const detail = (await detailResponse.json()) as { messages?: Message[] };
          setMessages(detail.messages ?? []);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "master_rail_failed");
    } finally {
      setLoading(false);
    }
  }, [activePlayer, mesaId]);
  usePolling(refresh, Boolean(mesaId), 4000);
  useEffect(() => {
    setActivePlayer(null);
    setMessages([]);
    setCriticalChange(false);
    previousRegimes.current = {};
  }, [mesaId]);
  const activeRow = useMemo(
    () => players.find((player) => player.player_user_id === activePlayer) ?? null,
    [activePlayer, players],
  );
  const activeThread = activePlayer ? threadForPlayer(threads, activePlayer) : null;
  useEffect(() => {
    if (!activePlayer || !activeThread) return;
    void fetch("/api/master/private-messages", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_user_id: activePlayer }),
    })
      .then(() =>
        setThreads((current) =>
          current.map((thread) =>
            thread.player_user_id === activePlayer ? { ...thread, unread_count: 0 } : thread,
          ),
        ),
      )
      .catch(() => undefined);
  }, [activePlayer, activeThread]);
  const openThread = (player: MasterPresenceRow) => {
    setActivePlayer(player.player_user_id);
    setCriticalChange(false);
  };
  const send = async () => {
    const trimmed = body.trim();
    if (!activePlayer || !trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/master/private-messages", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_user_id: activePlayer, body: trimmed }),
      });
      if (!response.ok) throw new Error("master_message_send_failed");
      setBody("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "master_message_send_failed");
    } finally {
      setSending(false);
    }
  };
  return (
    <aside
      id="master-operational-rail"
      aria-label="Rail operacional do Mestre"
      className="w-full min-w-0 rounded-xl border border-white/10 bg-[#0C0B12]/90 p-4 text-[#F3EBDD] shadow-xl lg:sticky lg:top-20 lg:w-[320px] lg:shrink-0 xl:w-[360px]"
    >
      {activePlayer && activeRow ? (
        <>
          <button
            type="button"
            className="min-h-11 inline-flex items-center gap-2 text-xs text-[color:var(--gold)]"
            onClick={() => {
              setActivePlayer(null);
              setMessages([]);
              setCriticalChange(false);
            }}
          >
            {" "}
            <ArrowLeft className="h-4 w-4" /> Semáforo da Mesa
          </button>
          <div className="mt-3 border-b border-white/10 pb-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#F3EBDD]/45">
              Conversa privada
            </p>
            <h2 className="mt-1 text-lg">{activeRow.player_name || "Jogador"}</h2>
            <p className="text-xs text-[#F3EBDD]/55">{presenceLabel(activeRow.regime)}</p>
          </div>
          <div className="mt-3 max-h-[45dvh] space-y-2 overflow-y-auto" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                <p className="whitespace-pre-wrap break-words text-[#F3EBDD]/80">{message.body}</p>
                <time className="mt-1 block text-[10px] text-[#F3EBDD]/35">
                  {new Date(message.created_at).toLocaleString("pt-BR")}
                </time>
              </div>
            ))}
            {!messages.length ? (
              <p className="text-xs text-[#F3EBDD]/45">Nenhuma mensagem privada ainda.</p>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 2000))}
              placeholder="Responder..."
              rows={2}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
            />
            <button
              type="button"
              aria-label="Enviar resposta"
              className="min-h-11 min-w-11 self-end rounded-lg border border-[color:var(--gold)]/40 px-3 text-[color:var(--gold)] disabled:opacity-40"
              disabled={!body.trim() || sending}
              onClick={() => void send()}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#F3EBDD]/45">
                Semáforo da Mesa
              </p>
              <h2 className="mt-1 text-lg">Visão operacional</h2>
            </div>
            <MessageCircle className="h-4 w-4 text-[color:var(--gold)]" />
          </div>
          {criticalChange ? (
            <button
              type="button"
              className="mt-3 min-h-11 w-full rounded-lg border border-rose-400/30 bg-rose-400/5 px-3 text-left text-xs text-rose-200"
              onClick={() => setCriticalChange(false)}
            >
              Mudança de presença detectada enquanto você lia um canal.
            </button>
          ) : null}
          {!mesaId ? (
            <p className="mt-4 rounded-lg border border-white/10 p-3 text-xs text-[#F3EBDD]/50">
              Selecione uma Mesa na Central do Mestre.
            </p>
          ) : null}
          {mesaId ? (
            <div className="mt-4 space-y-2">
              {!players.length && !loading ? (
                <p className="text-xs text-[#F3EBDD]/45">Nenhum jogador ativo nesta Mesa.</p>
              ) : null}
              {players.map((player) => {
                const thread = threadForPlayer(threads, player.player_user_id);
                return (
                  <button
                    key={player.player_user_id}
                    type="button"
                    onClick={() => openThread(player)}
                    className="min-h-11 w-full rounded-lg border border-white/10 px-3 py-2 text-left disabled:cursor-default disabled:opacity-80"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm">
                        {player.player_name || "Jogador"}
                      </span>
                      <span className="shrink-0 text-xs">{presenceLabel(player.regime)}</span>
                    </span>
                    <span className="mt-1 flex items-center justify-between text-[10px] text-[#F3EBDD]/40">
                      Abrir canal privado
                      {thread && thread.unread_count > 0 ? (
                        <strong className="rounded-full bg-[color:var(--gold)]/20 px-2 py-1 text-[#F3EBDD]">
                          {thread.unread_count}
                        </strong>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-xs text-rose-200">
          Não foi possível atualizar o painel operacional.
        </p>
      ) : null}
    </aside>
  );
}
