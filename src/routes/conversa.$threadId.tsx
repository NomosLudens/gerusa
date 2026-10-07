import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type GerusaMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; message: GerusaMessage }
  | { type: "error"; message: string };

export const Route = createFileRoute("/conversa/$threadId")({ component: GerusaConversation });

function GerusaConversation() {
  const { threadId } = Route.useParams();
  const [messages, setMessages] = useState<GerusaMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHistoryError("");
    void fetch(`/api/gerusa/thread?threadId=${encodeURIComponent(threadId)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("history_unavailable");
        const data = (await response.json()) as { messages: GerusaMessage[] };
        setMessages(data.messages);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryError("Não consegui abrir esta conversa agora.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [threadId]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText, loading]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sendingRef.current || historyError || loading) return;

    sendingRef.current = true;
    setSending(true);
    setError("");
    setDraft("");
    setStreamingText("");
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() },
    ]);

    try {
      const response = await fetch("/api/gerusa/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, content }),
      });
      if (!response.ok) {
        setStreamingText(null);
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(
          payload?.message || "Gerusa não conseguiu responder agora. Tente novamente.",
        );
      }
      if (!response.body) throw new Error("Gerusa não conseguiu responder agora. Tente novamente.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      let completed = false;

      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const message = JSON.parse(trimmed) as StreamEvent;
        if (message.type === "delta") {
          answer += message.text;
          setStreamingText(answer);
        } else if (message.type === "done") {
          completed = true;
          setMessages((current) => [...current, message.message]);
          setStreamingText(null);
        } else {
          throw new Error(message.message);
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) processLine(line);
        }
        buffer += decoder.decode();
        if (buffer) processLine(buffer);
      } finally {
        reader.releaseLock();
      }
      if (!completed) throw new Error("Gerusa não conseguiu concluir a resposta. Tente novamente.");
    } catch (sendError) {
      setStreamingText(null);
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Gerusa não conseguiu responder agora. Tente novamente.",
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <main className="gerusa-chat-page">
      <header className="gerusa-chat-header">
        <Link className="gerusa-chat-back" to="/" aria-label="Voltar para o início">
          <span aria-hidden="true">←</span> Voltar
        </Link>
        <div className="gerusa-chat-identity">
          <img src="/gerusa.png" alt="" />
          <div>
            <strong>Gerusa Poulain</strong>
            <span>{sending ? "pensando com cuidado…" : "mestra de RPG · observadora"}</span>
          </div>
        </div>
        <img className="gerusa-chat-mark" src="/gerusa-logo.png" alt="" />
      </header>

      <section className="gerusa-chat-main" aria-label="Conversa com Gerusa">
        <ol
          className="gerusa-chat-messages"
          ref={listRef}
          aria-live="polite"
          aria-relevant="additions text"
        >
          {loading && <li className="gerusa-chat-loading">Abrindo o caderno…</li>}
          {historyError && (
            <li className="gerusa-chat-error" role="alert">
              {historyError}
            </li>
          )}
          {!loading && !historyError && messages.length === 0 && (
            <li className="gerusa-chat-empty">
              <span>O caderno está aberto.</span>
              Escreva a primeira pergunta — ou escolha um detalhe por onde começar.
            </li>
          )}
          {messages.map((message) => (
            <li
              className={`gerusa-chat-message gerusa-chat-message-${message.role}`}
              key={message.id}
            >
              {message.role === "assistant" && <img src="/gerusa.png" alt="" />}
              <p>{message.content}</p>
            </li>
          ))}
          {streamingText !== null && (
            <li
              className="gerusa-chat-message gerusa-chat-message-assistant"
              data-testid="gerusa-streaming-message"
            >
              <img src="/gerusa.png" alt="" />
              <p>{streamingText || <span className="gerusa-chat-dots">···</span>}</p>
            </li>
          )}
        </ol>
        <form className="gerusa-chat-composer" onSubmit={(event) => void sendMessage(event)}>
          {error && (
            <p className="gerusa-chat-error" role="alert">
              {error}
            </p>
          )}
          <label className="sr-only" htmlFor="gerusa-message">
            Sua mensagem
          </label>
          <textarea
            id="gerusa-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={submitOnEnter}
            maxLength={4000}
            rows={1}
            placeholder="Escreva para Gerusa…"
            disabled={loading || Boolean(historyError) || sending}
          />
          <button
            type="submit"
            disabled={loading || Boolean(historyError) || sending || !draft.trim()}
          >
            {sending ? "Enviando…" : "Enviar"}
          </button>
          <span className="gerusa-chat-hint">Enter envia · Shift + Enter quebra a linha</span>
        </form>
      </section>
    </main>
  );
}
