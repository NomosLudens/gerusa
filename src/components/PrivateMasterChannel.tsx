import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import { usePolling } from "@/lib/use-polling";

type Message = { id: string; sender_user_id: string; body: string; created_at: string };
type Payload = {
  messages?: Message[];
  unread_count?: number;
  master_user_id?: string;
  error?: string;
};

export function PrivateMasterChannel({ mesaId }: { mesaId: string | null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [masterId, setMasterId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!mesaId) return;
    setLoading(true);
    try {
      const suffix = open ? "" : "&summary=1";
      const response = await fetch(
        "/api/private-messages?mesa_id=" + encodeURIComponent(mesaId) + suffix,
        { credentials: "same-origin", cache: "no-store" },
      );
      const data = (await response.json().catch(() => ({}))) as Payload;
      if (!response.ok) throw new Error(data.error || "private_messages_failed");
      setUnread(Number(data.unread_count ?? 0));
      setMasterId(data.master_user_id ?? null);
      if (open) setMessages(data.messages ?? []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "private_messages_failed");
    } finally {
      setLoading(false);
    }
  }, [mesaId, open]);
  useEffect(() => {
    if (!open || !mesaId || !messages.length) return;
    void fetch("/api/private-messages", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesa_id: mesaId }),
    })
      .then(() => setUnread(0))
      .catch(() => undefined);
  }, [mesaId, open, messages.length]);
  usePolling(load, Boolean(mesaId), 4000);
  const send = async () => {
    const trimmed = body.trim();
    if (!mesaId || !trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/private-messages", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesa_id: mesaId, body: trimmed }),
      });
      if (!response.ok) throw new Error("private_message_send_failed");
      setBody("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "private_message_send_failed");
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="rounded-xl border border-white/5 bg-[#0C0B12]/80 backdrop-blur">
      <button
        type="button"
        className="min-h-11 w-full flex items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/55">
          Falar com o Mestre
        </span>
        {unread > 0 ? (
          <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--gold)]/20 px-1.5 text-[10px] text-[#F3EBDD]">
            {unread}
          </span>
        ) : null}
        <span className="ml-auto text-[#F3EBDD]/40">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {open ? (
        <div className="space-y-3 px-3 pb-3">
          {!mesaId ? (
            <p className="text-xs text-[#F3EBDD]/50">
              Escolha uma Mesa no Semáforo para abrir o canal privado.
            </p>
          ) : null}
          {mesaId ? (
            <>
              <div
                className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/15 p-2"
                aria-live="polite"
              >
                {!messages.length && !loading ? (
                  <p className="p-2 text-xs text-[#F3EBDD]/45">Nenhuma mensagem privada ainda.</p>
                ) : null}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-lg border border-white/5 px-3 py-2 text-sm"
                  >
                    <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[#F3EBDD]/40">
                      {message.sender_user_id === masterId ? "Mestre" : "Você"}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-[#F3EBDD]/80">
                      {message.body}
                    </p>
                    <time className="mt-1 block text-[10px] text-[#F3EBDD]/35">
                      {new Date(message.created_at).toLocaleString("pt-BR")}
                    </time>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value.slice(0, 2000))}
                  placeholder="Escreva uma mensagem privada..."
                  rows={2}
                  className="min-h-11 min-w-0 flex-1 resize-y rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-[#F3EBDD]/85 placeholder:text-[#F3EBDD]/30"
                />
                <button
                  type="button"
                  aria-label="Enviar mensagem ao Mestre"
                  className="min-h-11 min-w-11 self-end rounded-lg border border-[color:var(--gold)]/40 px-3 text-[color:var(--gold)] disabled:opacity-40"
                  disabled={!body.trim() || sending}
                  onClick={() => void send()}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs text-rose-200">
              Não foi possível carregar o canal privado.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
