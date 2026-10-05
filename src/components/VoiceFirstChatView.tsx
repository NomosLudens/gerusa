import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useVoiceInteraction } from "@/lib/voice/use-voice-interaction";
import { voiceStateLabel, type VoiceInteractionState } from "@/lib/voice/voice-interaction";
import { MessageSquareText, Mic, RotateCcw, Send, Square, VolumeX } from "lucide-react";

export type VoiceFirstChatViewProps = {
  mode: "klio" | "kallistis-presente";
  facet: "kharis" | "kallistis";
  threadId: string;
  avatarUrl: string;
  label: string;
  theme: {
    accent: string;
    accentSoft: string;
    background?: string;
  };
  autoSpeak?: boolean;
};

const SECONDARY_TEXT: Record<VoiceInteractionState, string> = {
  idle: "Toque para falar quando estiver pronto.",
  listening: "Vou pedir o microfone agora.",
  recording: "Fale com calma. Toque para parar.",
  transcribing: "Estou transformando sua fala em texto.",
  thinking: "Estou preparando uma resposta curta.",
  speaking: "Estou lendo a resposta em voz alta.",
  paused: "A fala foi pausada.",
  error: "Voce pode tentar de novo ou digitar.",
  blocked: "Permita o microfone no navegador para falar.",
};

export function VoiceFirstChatView({
  mode,
  facet,
  threadId,
  avatarUrl,
  label,
  theme,
  autoSpeak = true,
}: VoiceFirstChatViewProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceInteraction({
    domain: facet,
    surface: mode === "klio" ? "klio" : "kallistis",
    mode: mode === "klio" ? "pedagogical" : "default",
    threadId,
    autoSpeak,
  });

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [voice.messages, chatOpen]);

  async function handlePrimaryAction() {
    if (voice.state === "recording") {
      await voice.stop();
      return;
    }
    if (voice.state === "speaking") {
      voice.cancelSpeech();
      return;
    }
    if (["idle", "paused", "error", "blocked"].includes(voice.state)) {
      await voice.start();
    }
  }

  async function submitText() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    await voice.sendText(text);
  }

  const bg = theme.background ?? "#08080e";
  const title = mode === "klio" ? "Modo Fala Klio" : "Kallistis Presente";
  const context =
    mode === "klio"
      ? "Dentro de Kharis, para fala e aprendizagem."
      : "Presenca por voz da Kallistis.";
  const isWorking = ["listening", "recording", "transcribing", "thinking", "speaking"].includes(
    voice.state,
  );
  const canPressPrimary = !["listening", "transcribing", "thinking"].includes(voice.state);
  const primaryLabel =
    voice.state === "recording"
      ? "Parar gravacao"
      : voice.state === "speaking"
        ? "Parar fala"
        : mode === "klio"
          ? "Falar com Klio"
          : "Falar com Kallistis";
  const PrimaryIcon =
    voice.state === "recording" ? Square : voice.state === "speaking" ? VolumeX : Mic;

  return (
    <div
      className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden"
      style={{ background: bg, color: "#F3EBDD" }}
    >
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-7 px-4 py-8 pb-28 text-center sm:px-6">
        <header className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/45">{context}</p>
          <h1 className="serif text-3xl text-[#F3EBDD] sm:text-4xl">{title}</h1>
        </header>

        <section aria-live="polite" className="flex w-full max-w-md flex-col items-center gap-4">
          <div className="relative h-40 w-40 sm:h-48 sm:w-48">
            <div
              className={cn(
                "absolute inset-0 rounded-full border transition",
                isWorking ? "animate-pulse" : "",
              )}
              style={{
                borderColor: isWorking ? theme.accent : "rgba(255,255,255,0.12)",
                boxShadow: isWorking ? `0 0 36px ${theme.accent}55` : "none",
              }}
            />
            <img
              src={avatarUrl}
              alt={label}
              className="absolute inset-4 h-32 w-32 rounded-full object-cover sm:h-40 sm:w-40"
            />
          </div>

          <div className="min-h-[4.5rem] space-y-1">
            <p className="text-xl font-medium text-[#F3EBDD]">{voiceStateLabel(voice.state)}</p>
            <p className="mx-auto max-w-xs text-sm leading-6 text-[#F3EBDD]/60">
              {voice.error || SECONDARY_TEXT[voice.state]}
            </p>
          </div>

          <Button
            type="button"
            disabled={!canPressPrimary}
            onClick={handlePrimaryAction}
            className="h-16 min-w-56 rounded-full px-7 text-base font-medium"
            style={{ background: theme.accent, color: "#fff" }}
            aria-label={primaryLabel}
          >
            <PrimaryIcon className="mr-2 h-5 w-5" />
            {primaryLabel}
          </Button>

          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full border-white/15 bg-transparent px-4 text-[#F3EBDD]"
              onClick={() => setChatOpen(true)}
            >
              <MessageSquareText className="mr-2 h-4 w-4" />
              Digitar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full border-white/15 bg-transparent px-4 text-[#F3EBDD]"
              onClick={voice.reset}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Tentar de novo
            </Button>
          </div>
        </section>

        {(voice.transcript || voice.responseText) && (
          <section className="grid w-full gap-3 text-left sm:grid-cols-2" aria-label="Ultima troca">
            <SpeechPanel title="Sua fala" text={voice.transcript || "Ainda sem transcricao."} />
            <SpeechPanel title="Resposta" text={voice.responseText || "Ainda sem resposta."} />
          </section>
        )}
      </main>

      <Drawer open={chatOpen} onOpenChange={setChatOpen}>
        <DrawerContent
          className="max-h-[76dvh]"
          style={{ background: bg, borderTop: `1px solid ${theme.accent}33` }}
        >
          <DrawerHeader className="px-4 pb-0 pt-4">
            <DrawerTitle className="text-center text-sm text-[#F3EBDD]/65">
              Texto de apoio
            </DrawerTitle>
            <DrawerClose className="absolute right-4 top-4 text-[#F3EBDD]/70" />
          </DrawerHeader>

          <div
            ref={chatScrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            style={{ maxHeight: "50dvh" }}
          >
            {voice.messages.length === 0 && (
              <p className="py-8 text-center text-sm text-[#F3EBDD]/40">Nenhuma mensagem ainda.</p>
            )}
            {voice.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  data-testid={
                    msg.role === "user" ? "voice-message-user" : "voice-message-assistant"
                  }
                  className="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-6"
                  style={{
                    background: msg.role === "user" ? `${theme.accent}22` : `${theme.accent}11`,
                    border: `1px solid ${theme.accent}33`,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {voice.state === "thinking" && (
              <div className="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm text-[#F3EBDD]/50">
                Pensando...
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitText();
            }}
            className="flex items-center gap-2 border-t px-4 py-3"
            style={{ borderColor: `${theme.accent}22` }}
          >
            <input
              aria-label="Mensagem"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Digite uma mensagem curta"
              className="h-12 flex-1 rounded-lg border bg-background/60 px-4 text-sm outline-none"
              style={{ borderColor: `${theme.accent}33` }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-full"
              disabled={!chatInput.trim() || voice.isBusy}
              style={{ background: theme.accent, color: "#fff" }}
              aria-label="Enviar mensagem"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function SpeechPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/45">{title}</p>
      <p className="line-clamp-5 text-sm leading-6 text-[#F3EBDD]/80">{text}</p>
    </div>
  );
}
