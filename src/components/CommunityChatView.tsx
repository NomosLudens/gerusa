import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LazyMarkdown } from "@/components/LazyMarkdown";
import { PlayerAvatarPlaceholder } from "@/components/PlayerAvatarPlaceholder";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { kallistisAvatar } from "@/lib/brand-assets";
import { ensureThread } from "@/lib/ensure-thread";

type CommunityMessage = {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  isSystemMaster: boolean;
  role: "human" | "kallistis";
  publicNpcName: string | null;
  content: string;
  createdAt: string;
};

export function CommunityChatView() {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [opening, setOpening] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadMessages = useCallback(async () => {
    const response = await fetch("/api/community-chat", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Não foi possível carregar o Chat Geral.");
    const payload = (await response.json()) as { messages?: CommunityMessage[] };
    setMessages(Array.isArray(payload.messages) ? payload.messages : []);
  }, []);

  useEffect(() => {
    let active = true;
    void loadMessages()
      .catch((error) => {
        if (active)
          toast.error(error instanceof Error ? error.message : "Falha ao carregar o Chat Geral.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const timer = window.setInterval(() => {
      void loadMessages().catch(() => undefined);
    }, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    void fetch("/api/profile", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json().catch(() => null))
      .then((payload: { is_master?: boolean } | null) => setIsMaster(Boolean(payload?.is_master)))
      .catch(() => setIsMaster(false));
  }, []);

  async function openCreation() {
    if (opening) return;
    setOpening(true);
    try {
      const threadId = await ensureThread("character_creation");
      await navigate({
        to: "/chat/$threadId",
        params: { threadId },
        search: { scope: "character_creation" },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível abrir a criação por conversa.",
      );
    } finally {
      setOpening(false);
    }
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    try {
      const response = await fetch("/api/community-chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = (await response.json().catch(() => null)) as {
        messages?: CommunityMessage[];
        error?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Não foi possível enviar a mensagem.");
      if (payload?.messages?.length)
        setMessages((current) => {
          const known = new Set(current.map((message) => message.id));
          return [...current, ...payload.messages!.filter((message) => !known.has(message.id))];
        });
    } catch (error) {
      setInput(content);
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  if (opening)
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-[color:var(--ivory-dim)]">
        Abrindo o chat de criação…
      </div>
    );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header
        className="shrink-0 border-b px-4 py-4 sm:px-6"
        style={{ borderColor: "color-mix(in oklab, var(--kallistis) 28%, transparent)" }}
      >
        <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--kallistis)]">
          Comunidade
        </p>
        <h1 className="mt-1 text-xl text-[color:var(--ivory)]">Chat Geral</h1>
        <p className="mt-1 text-sm text-[color:var(--ivory-dim)]">
          Uma única sala compartilhada por todas as pessoas autenticadas.
        </p>
        <p className="mt-2 text-xs text-[color:var(--ivory-dim)]">
          KALLISTIS responde quando alguém escreve{" "}
          <span className="text-[color:var(--kallistis)]">@kallistis</span>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled variant="outline">
            Chat Geral
          </Button>
          <Button type="button" onClick={() => void openCreation()} disabled={opening}>
            {opening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Criar personagem
          </Button>
          {isMaster && (
            <Button
              type="button"
              onClick={() => void navigate({ to: "/chat", search: { scope: "master" } })}
            >
              Chat do Mestre
            </Button>
          )}
        </div>
      </header>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-3">
          {loading && (
            <p className="text-center text-sm text-[color:var(--ivory-dim)]">
              Carregando conversa…
            </p>
          )}
          {!loading && messages.length === 0 && (
            <p className="mt-16 text-center text-sm text-[color:var(--ivory-dim)]">
              A sala ainda está vazia. Diga oi.
            </p>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              className="flex justify-start"
              data-testid={`community-message-${message.role}`}
            >
              <div className="flex max-w-[88%] items-start gap-3">
                {message.role === "human" ? (
                  message.authorAvatarUrl ? (
                    <ProfileAvatar
                      source={message.authorAvatarUrl}
                      alt={`Avatar de ${message.authorName}`}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                      fallback={
                        <PlayerAvatarPlaceholder
                          identity={message.authorName}
                          isSystemMaster={message.isSystemMaster}
                          sizeClassName="h-10 w-10"
                        />
                      }
                    />
                  ) : (
                    <PlayerAvatarPlaceholder
                      identity={message.authorName}
                      isSystemMaster={message.isSystemMaster}
                      sizeClassName="h-10 w-10"
                    />
                  )
                ) : message.publicNpcName ? (
                  <PlayerAvatarPlaceholder
                    identity={message.publicNpcName}
                    isSystemMaster={false}
                    sizeClassName="h-10 w-10"
                  />
                ) : (
                  <img
                    src={kallistisAvatar.url}
                    alt="Avatar da KALLISTIS"
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                )}
                <div
                  className="rounded-2xl border bg-card px-4 py-3 shadow-sm"
                  style={{
                    borderColor:
                      message.role === "kallistis" && !message.publicNpcName
                        ? "color-mix(in oklab, var(--kallistis) 28%, transparent)"
                        : message.publicNpcName
                          ? "color-mix(in oklab, var(--gold) 35%, transparent)"
                          : "color-mix(in oklab, var(--ivory) 12%, transparent)",
                  }}
                >
                  <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ivory-dim)]">
                    {message.authorName}
                  </p>
                  <div className="prose prose-sm prose-invert max-w-none break-words leading-relaxed">
                    <LazyMarkdown>{message.content}</LazyMarkdown>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div
        className="shrink-0 border-t bg-background/90 p-3 backdrop-blur sm:p-4"
        style={{ borderColor: "color-mix(in oklab, var(--kallistis) 28%, transparent)" }}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            aria-label="Mensagem do Chat Geral"
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Escreva para a comunidade…"
            rows={1}
            disabled={sending}
            className="min-h-11 min-w-0 flex-1 resize-none rounded-2xl border bg-card px-3 py-3 text-base text-[color:var(--ivory)] outline-none"
          />
          <Button
            type="button"
            aria-label="Enviar mensagem"
            onClick={() => void sendMessage()}
            disabled={sending || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
