import { kallistisAvatar } from "@/lib/brand-assets";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { MAX_CLIENT_CHAT_MESSAGES } from "@/lib/chat-request-contract";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LazyMarkdown } from "@/components/LazyMarkdown";
import { getLocalSession } from "@/lib/local-auth-client";
import { Button } from "@/components/ui/button";
import {
  Camera,
  FileText,
  ImageIcon,
  Send,
  Square,
  Mic,
  Loader2,
  Volume2,
  Paperclip,
  X,
  GitBranch,
  Play,
  Plus,
} from "lucide-react";
import { KittScanner, type KittState } from "@/components/KittScanner";
import { setKittPulse, useKittPulse } from "@/lib/kitt-pulse";
import { toast } from "sonner";
import { useTTS } from "@/lib/use-tts";
import { isSTTModel, STT_FALLBACK_MODEL_KEY, STT_MODEL_KEY } from "@/lib/stt-models";
import { sanitizeAssistantOutput } from "@/lib/sanitize-assistant-output";
import { extractDocxTextServer } from "@/lib/docx.functions";
import { MAX_ATTACHMENTS, validateAttachmentTotal } from "@/lib/attachment-limits";
import { replaceFilePartsWithMarkers } from "@/lib/chat-message-files";
import { discardUnpersistedAssistant } from "@/lib/chat-persistence-client";
import type { ChatScope } from "@/server/local-core/data-contracts";

if (typeof window !== "undefined") {
  console.info("kallistis_e2e:chat_view_module_evaluated");
}

// MAX_CLIENT_CHAT_MESSAGES é importado de chat-request-contract para manter
// o limite sincronizado com o schema do servidor (ChatEnvelope.strict).

function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type EngineFacet = "kallistis";
type VisualFacet = EngineFacet;

type Attachment = {
  name: string;
  kind: "text" | "image" | "pdf";
  content: string;
  size: number;
  mediaType?: string;
};

type CampaignOption = {
  id: string;
  name: string;
  mesaId: string;
  mesaName: string;
  status: "active" | "archived";
};

type CampaignMesaOption = {
  id: string;
  slug: string;
  name: string;
  memberRole: "mestre" | "jogador";
};

type ChatCharacterOption = {
  id: string;
  name: string;
  status: string;
  mesas: Array<{ id: string; name: string }>;
};

function buildOutgoingText(baseText: string, list: Attachment[]) {
  const text = baseText.trim();
  const textBlocks = list
    .filter((file) => file.kind === "text")
    .map((file) => `[Anexo de texto: ${file.name}]\n${file.content}`);
  return [text, ...textBlocks].filter(Boolean).join("\n\n");
}

function buildFileParts(list: Attachment[]): FileUIPart[] {
  return list
    .filter((file) => file.kind === "image" || file.kind === "pdf")
    .map((file) => ({
      type: "file" as const,
      mediaType: file.mediaType ?? (file.kind === "pdf" ? "application/pdf" : "image/png"),
      filename: file.name,
      url: file.content,
    }));
}

type FacetTheme = {
  label: string;
  avatar: string;
  subtitle: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  chipActiveBg: string;
  chipActiveText: string;
  chipBorder: string;
  headerGlow: string;
  assistantBorder: string;
  assistantBg: string;
  userBorder: string;
  userBg: string;
  userAvatarBg: string;
  composerFocus: string;
  composerRing: string;
  sendClass: string;
  micReadyClass: string;
  micRecordingClass: string;
  thinkingLabel: string;
  emptyState: string;
};

const FACET_THEMES: Record<VisualFacet, FacetTheme> = {
  kallistis: {
    label: "Kallistis",
    avatar: kallistisAvatar.url,
    subtitle: "presença geral",
    accent: "var(--kallistis)",
    accentSoft: "color-mix(in oklab, var(--kallistis) 16%, transparent)",
    accentText: "var(--kallistis)",
    chipActiveBg: "color-mix(in oklab, var(--kallistis) 18%, transparent)",
    chipActiveText: "var(--ivory)",
    chipBorder: "color-mix(in oklab, var(--kallistis) 28%, transparent)",
    headerGlow: "0 0 24px color-mix(in oklab, var(--kallistis) 18%, transparent)",
    assistantBorder: "color-mix(in oklab, var(--kallistis) 22%, transparent)",
    assistantBg:
      "linear-gradient(180deg, color-mix(in oklab, var(--kallistis) 6%, transparent), transparent)",
    userBorder: "color-mix(in oklab, var(--kallistis) 34%, transparent)",
    userBg: "color-mix(in oklab, var(--kallistis) 12%, transparent)",
    userAvatarBg: "color-mix(in oklab, var(--kallistis) 18%, transparent)",
    composerFocus: "var(--kallistis)",
    composerRing: "0 0 0 1px color-mix(in oklab, var(--kallistis) 40%, transparent)",
    sendClass:
      "border border-[color:var(--kallistis)]/35 bg-[color:var(--kallistis)] text-[color:var(--obsidian)] hover:bg-[color:var(--kallistis)]/90",
    micReadyClass:
      "bg-[color:var(--kallistis)] text-[color:var(--obsidian)] hover:bg-[color:var(--kallistis)]/90",
    micRecordingClass:
      "bg-[color:var(--kallistis)]/22 text-[color:var(--ivory)] border-[color:var(--kallistis)]/35 animate-pulse",
    thinkingLabel: "Kallistis está pensando...",
    emptyState: "Fala comigo. Aqui é conversa, não sala de aula.",
  },
};

const MessageBubble = memo(function MessageBubble({
  role,
  text,
  facetLabel,
  facetAvatarUrl,
  theme,
  userAvatarUrl,
  userInitial,
  userLabel,
  onSpeak,
  isSpeaking,
}: {
  role: "user" | "assistant";
  text: string;
  facetLabel: string;
  facetAvatarUrl: string;
  theme: FacetTheme;
  userAvatarUrl: string | null;
  userInitial: string;
  userLabel: string;
  onSpeak?: () => void;
  isSpeaking?: boolean;
}) {
  const mine = role === "user";

  if (mine) {
    return (
      <div className="flex justify-end items-start gap-2" data-testid="chat-message-user">
        <div className="flex max-w-[86%] flex-col items-end sm:max-w-[72%]">
          <div className="mb-1 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[color:var(--ivory-dim)]">
            <span>{userLabel}</span>
          </div>
          <div
            className="rounded-2xl px-3.5 py-2.5 text-[color:var(--ivory)] sm:px-4 sm:py-3"
            style={{
              background: theme.userBg,
              border: `1px solid ${theme.userBorder}`,
              boxShadow: `inset 0 1px 0 ${theme.accentSoft}`,
            }}
          >
            <div className="prose prose-sm prose-invert max-w-none break-words text-[0.98rem] leading-[1.5] sm:text-[1.04rem]">
              <LazyMarkdown>{text}</LazyMarkdown>
            </div>
          </div>
        </div>
        {userAvatarUrl ? (
          <img
            src={userAvatarUrl}
            alt=""
            className="mt-5 h-9 w-9 shrink-0 rounded-full border object-cover sm:h-[38px] sm:w-[38px]"
            style={{ borderColor: theme.userBorder }}
          />
        ) : (
          <div
            className="mt-5 grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs text-[color:var(--ivory)] sm:h-[38px] sm:w-[38px]"
            style={{
              background: theme.userAvatarBg,
              borderColor: theme.userBorder,
            }}
          >
            {userInitial}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-start items-start gap-2" data-testid="chat-message-assistant">
      <img
        src={facetAvatarUrl}
        alt=""
        className="mt-5 h-10 w-10 shrink-0 rounded-full object-cover"
        style={{ border: `1px solid ${theme.chipBorder}` }}
      />
      <div className="flex max-w-[86%] flex-col items-start sm:max-w-[78%]">
        <div
          className="mb-1 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase serif"
          style={{ color: theme.accentText }}
        >
          <span>{facetLabel}</span>
          {onSpeak && (
            <AudioMessageAction isSpeaking={Boolean(isSpeaking)} onSpeak={onSpeak} theme={theme} />
          )}
        </div>
        <div
          className="rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3"
          style={{
            background: theme.assistantBg,
            border: `1px solid ${theme.assistantBorder}`,
          }}
        >
          <div className="prose prose-sm prose-invert max-w-none break-words text-[0.98rem] leading-[1.5] sm:text-[1.04rem]">
            <LazyMarkdown>{text}</LazyMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
});

function AudioMessageAction({
  isSpeaking,
  onSpeak,
  theme,
}: {
  isSpeaking: boolean;
  onSpeak: () => void;
  theme: FacetTheme;
}) {
  return (
    <button
      type="button"
      onClick={onSpeak}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] normal-case tracking-normal transition"
      style={{
        color: isSpeaking ? theme.accentText : "var(--ivory-dim)",
        borderColor: isSpeaking
          ? theme.chipBorder
          : "color-mix(in oklab, var(--ivory) 12%, transparent)",
        background: isSpeaking
          ? theme.accentSoft
          : "color-mix(in oklab, var(--ivory) 5%, transparent)",
      }}
      aria-label={isSpeaking ? "Parar leitura" : "Ouvir mensagem"}
      title={isSpeaking ? "Parar leitura" : "Ouvir"}
    >
      <span
        className="grid h-5 w-5 place-items-center rounded-full"
        style={{ background: theme.accentSoft }}
      >
        {isSpeaking ? (
          <Square className="h-2.5 w-2.5" />
        ) : (
          <Play className="h-2.5 w-2.5 fill-current" />
        )}
      </span>
      <span className="flex h-4 items-center gap-0.5" aria-hidden>
        {[35, 60, 45, 75, 50].map((height, index) => (
          <span
            key={index}
            className="w-0.5 rounded-full bg-current opacity-70"
            style={{ height: `${height}%` }}
          />
        ))}
      </span>
      <Volume2 className="h-3 w-3 opacity-70" aria-hidden />
    </button>
  );
}

function TypingDots({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2 text-xs"
      style={{ color: "var(--ivory-dim)" }}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex gap-1" aria-hidden>
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:-200ms]"
          style={{ color }}
        />
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:-100ms]"
          style={{ color }}
        />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" style={{ color }} />
      </span>
      <span className="italic">{label}</span>
    </div>
  );
}

function HistorySkeleton({ theme }: { theme: FacetTheme }) {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="flex justify-end">
        <div
          className="h-10 w-2/3 rounded-2xl"
          style={{ background: theme.userBg, border: `1px solid ${theme.userBorder}` }}
        />
      </div>
      <div className="flex justify-start">
        <div
          className="h-16 w-3/4 rounded-2xl"
          style={{ background: theme.assistantBg, border: `1px solid ${theme.assistantBorder}` }}
        />
      </div>
      <div className="flex justify-end">
        <div
          className="h-8 w-1/2 rounded-2xl"
          style={{ background: theme.userBg, border: `1px solid ${theme.userBorder}` }}
        />
      </div>
    </div>
  );
}

export interface ChatViewProps {
  threadId: string;
}

export function ChatView({ threadId }: ChatViewProps) {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const seed = typeof search.seed === "string" ? search.seed : undefined;
  const chatScope: ChatScope =
    search.scope === "master"
      ? "master"
      : search.mode === "character_creation" || search.experience === "CHARACTER_CREATION"
        ? "character_creation"
        : "general";

  const extractDocxText = useServerFn(extractDocxTextServer);

  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [facet, setFacet] = useState<EngineFacet>("kallistis");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const cameraAttachmentRef = useRef<HTMLInputElement>(null);
  const imageAttachmentRef = useRef<HTMLInputElement>(null);
  const fileAttachmentRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [masterMesas, setMasterMesas] = useState<CampaignMesaOption[]>([]);
  const [threadCampaignId, setThreadCampaignId] = useState<string | null>(null);
  const [threadCampaignName, setThreadCampaignName] = useState<string | null>(null);
  const [threadMesaId, setThreadMesaId] = useState<string | null>(null);
  const [campaignCreateOpen, setCampaignCreateOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignMesaId, setCampaignMesaId] = useState("");
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [chatCharacters, setChatCharacters] = useState<ChatCharacterOption[]>([]);
  const [characterBusy, setCharacterBusy] = useState(false);
  const manualCharacterSelectionRef = useRef(false);
  const [isMaster, setIsMaster] = useState(false);
  const [mutationStates, setMutationStates] = useState<Record<string, "confirmed" | "cancelled">>(
    {},
  );
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const seededRef = useRef<string | null>(null);
  const tts = useTTS();
  const assistantMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    setInitialMessages(null);
    seededRef.current = null;
    stickToBottomRef.current = true;
    assistantMessageIdRef.current = null; // Reseta na troca de thread
    setThreadCampaignId(null);
    setThreadCampaignName(null);
    setThreadMesaId(null);
    setActiveCharacterId(null);
    setChatCharacters([]);
    manualCharacterSelectionRef.current = false;
    setIsMaster(false);
    setMutationStates({});

    let active = true;
    void (async () => {
      try {
        const u = await getLocalSession();
        if (!u?.user) throw new Error("Sessão local ausente");

        const profileResponse = await fetch("/api/profile", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const profilePayload = (
          profileResponse.ok ? await profileResponse.json().catch(() => null) : null
        ) as { is_master?: boolean } | null;
        const response = await fetch(`/api/chat/thread?threadId=${encodeURIComponent(threadId)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Thread não encontrada");
        const payload = (await response.json()) as {
          thread?: {
            facet?: string;
            surface?: string;
            campaignId?: string | null;
            campaignName?: string | null;
            scope?: ChatScope;
            activeCharacterId?: string | null;
            mesaId?: string | null;
          };
          messages?: Array<{ id: string; role: "user" | "assistant"; content: string }>;
          pendingMutations?: Array<{
            id: string;
            output: {
              status?: string;
              operation?: string;
              confirmationId?: string;
              beforeBiography?: string | null;
              nextBiography?: string | null;
              name?: string;
              povo?: string;
              oficio?: string;
              biografia?: string;
            };
          }>;
        };
        if (
          payload.thread?.facet !== "kallistis" ||
          payload.thread.surface !== "kallistis" ||
          !Array.isArray(payload.messages)
        ) {
          throw new Error("Thread inválida, alheia ou legada");
        }

        if (!active) return;
        setFacet("kallistis");
        setIsMaster(Boolean(profilePayload?.is_master));
        setThreadCampaignId(payload.thread?.campaignId ?? null);
        setThreadCampaignName(payload.thread?.campaignName ?? null);
        setThreadMesaId(payload.thread?.mesaId ?? null);
        const characterResponse = await fetch("/api/characters?includeArchived=false", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const characterPayload = (
          characterResponse.ok ? await characterResponse.json().catch(() => null) : null
        ) as { characters?: ChatCharacterOption[] } | null;
        const characterListAvailable =
          characterResponse.ok && Array.isArray(characterPayload?.characters);
        const availableCharacters = Array.isArray(characterPayload?.characters)
          ? characterPayload.characters.filter((character) => character.status !== "archived")
          : [];
        const selectedCharacterId = payload.thread.activeCharacterId ?? null;
        const selectedExists =
          !characterListAvailable ||
          availableCharacters.some((character) => character.id === selectedCharacterId);
        const mesaMatches = payload.thread.mesaId
          ? availableCharacters.filter((character) =>
              character.mesas.some((mesa) => mesa.id === payload.thread?.mesaId),
            )
          : [];
        const autoSelected =
          chatScope === "master"
            ? selectedCharacterId
            : selectedExists
              ? selectedCharacterId
              : mesaMatches.length === 1
                ? mesaMatches[0]!.id
                : !payload.thread.mesaId && availableCharacters.length === 1
                  ? availableCharacters[0]!.id
                  : null;
        setChatCharacters(availableCharacters);
        setActiveCharacterId(autoSelected);
        if (characterListAvailable && autoSelected !== selectedCharacterId) {
          const selectionResponse = await fetch("/api/chat/thread", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ threadId, activeCharacterId: autoSelected }),
          });
          if (!selectionResponse.ok) {
            setActiveCharacterId(selectedCharacterId);
            console.warn("kallistis_chat_character_autoselect_failed");
          }
        }
        const msgs: UIMessage[] = payload.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          parts: [
            {
              type: "text",
              text: m.role === "assistant" ? sanitizeAssistantOutput(m.content) : m.content,
            },
          ],
        }));
        const lastAssistant = [...msgs].reverse().find((message) => message.role === "assistant");
        if (lastAssistant && Array.isArray(payload.pendingMutations)) {
          lastAssistant.parts = [
            ...lastAssistant.parts,
            ...payload.pendingMutations.map(
              (pending) =>
                ({
                  type:
                    pending.output.operation === "character_create"
                      ? "tool-propose_character_create"
                      : "tool-propose_character_biography_update",
                  state: "output-available",
                  toolCallId: `persisted-${pending.id}`,
                  output: pending.output,
                }) as unknown as UIMessage["parts"][number],
            ),
          ];
        }
        setInitialMessages(msgs);
      } catch (err) {
        if (!active) return;
        console.error("Erro ao carregar thread ou mensagens:", err);
        toast.error("Não foi possível carregar a conversa.");
        setInitialMessages(null);
      }
    })();
    return () => {
      active = false;
      assistantMessageIdRef.current = null; // Reseta no unmount
      console.info("kallistis_e2e:component_unmounted");
    };
  }, [threadId, chatScope]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(`/api/chat/campaigns?scope=${encodeURIComponent(chatScope)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Campanhas indisponíveis");
        const payload = (await response.json()) as {
          campaigns?: CampaignOption[];
          mesas?: CampaignMesaOption[];
        };
        if (!active) return;
        setCampaigns(Array.isArray(payload.campaigns) ? payload.campaigns : []);
        setMasterMesas(Array.isArray(payload.mesas) ? payload.mesas : []);
      } catch {
        if (!active) return;
        setCampaigns([]);
        setMasterMesas([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [chatScope, threadId]);

  useEffect(() => {
    if (initialMessages === null || chatScope === "master") return;
    let active = true;
    const refreshAssignedCharacters = async () => {
      try {
        const response = await fetch("/api/characters?includeArchived=false", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json().catch(() => null)) as {
          characters?: ChatCharacterOption[];
        } | null;
        if (!Array.isArray(payload?.characters) || !active) return;
        const available = payload.characters.filter((character) => character.status !== "archived");
        setChatCharacters(available);
        if (manualCharacterSelectionRef.current) return;
        const mesaMatches = threadMesaId
          ? available.filter((character) =>
              character.mesas.some((mesa) => mesa.id === threadMesaId),
            )
          : [];
        const activeCharacterBelongsToMesa = activeCharacterId
          ? available
              .find((character) => character.id === activeCharacterId)
              ?.mesas.some((mesa) => mesa.id === threadMesaId)
          : false;
        if (activeCharacterId && (activeCharacterBelongsToMesa || mesaMatches.length !== 1)) return;
        const selectedCharacterId =
          mesaMatches.length === 1
            ? mesaMatches[0]!.id
            : !threadMesaId && available.length === 1
              ? available[0]!.id
              : null;
        if (!selectedCharacterId) return;
        const saved = await fetch("/api/chat/thread", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ threadId, activeCharacterId: selectedCharacterId }),
        });
        if (!saved.ok || !active) return;
        setActiveCharacterId(selectedCharacterId);
      } catch {
        // A temporary refresh failure should not interrupt chat.
      }
    };
    void refreshAssignedCharacters();
    const interval = window.setInterval(() => void refreshAssignedCharacters(), 20_000);
    window.addEventListener("focus", refreshAssignedCharacters);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshAssignedCharacters);
    };
  }, [activeCharacterId, chatScope, initialMessages, threadId, threadMesaId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { facet: "kallistis", surface: "kallistis", threadId },
        // prepareSendMessagesRequest garante que apenas os campos do ChatEnvelope
        // estrito sejam enviados. Sem isso, o SDK inclui automaticamente `id` e
        // `trigger`, que são rejeitados pelo .strict() do servidor.
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...body,
            messages: messages.slice(-MAX_CLIENT_CHAT_MESSAGES),
          },
        }),
        fetch: async (input, init) => {
          const headers = new Headers(init?.headers);

          let body = init?.body;
          if (typeof body === "string") {
            try {
              const parsed = JSON.parse(body) as Record<string, unknown>;
              if (assistantMessageIdRef.current) {
                parsed.assistantMessageId = assistantMessageIdRef.current;
              }
              if (Array.isArray(parsed.messages)) {
                parsed.messages = parsed.messages.slice(-MAX_CLIENT_CHAT_MESSAGES);
              }
              body = JSON.stringify(parsed);
              headers.set("content-type", "application/json");
            } catch {
              // segue sem modificações extras
            }
          }

          const hasFiles = typeof body === "string" && body.includes('"type":"file"');
          // A primeira resposta do provedor pode levar mais de dois minutos
          // antes de o stream começar. O servidor aplica o limite próprio;
          // o cliente não pode abortar a requisição antes dele.
          const timeoutMs = hasFiles ? 180_000 : 180_000;
          const controller = new AbortController();
          const onAbort = () => controller.abort();
          init?.signal?.addEventListener("abort", onAbort);
          const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

          try {
            const res = await fetch(input, {
              ...init,
              credentials: "same-origin",
              headers,
              body,
              signal: controller.signal,
            });
            if (!res.ok) {
              const detail = await res.text().catch(() => "");
              throw new Error(detail || `Falha ao enviar (HTTP ${res.status})`);
            }
            return res;
          } catch (error) {
            if (controller.signal.aborted && !init?.signal?.aborted) {
              throw new Error(
                "Não consegui concluir o processamento a tempo. O chat foi liberado para você tentar novamente.",
              );
            }
            throw error;
          } finally {
            window.clearTimeout(timeout);
            init?.signal?.removeEventListener("abort", onAbort);
          }
        },
      }),
    [threadId],
  );

  const { messages, setMessages, sendMessage, status, stop } = useChat({
    id: `${threadId}:${facet}`,
    messages: initialMessages ?? [],
    transport,
    onError: (err) => {
      setMessages((current) => discardUnpersistedAssistant(current, assistantMessageIdRef.current));
      assistantMessageIdRef.current = null;
      toast.error(err.message || "Falha ao enviar mensagem. Tente novamente.");
    },
    onFinish: () => {
      pruneHistoricalFileParts();
    },
  });

  function pruneHistoricalFileParts() {
    setMessages((current) => replaceFilePartsWithMarkers(current));
  }

  // O useChat só usa `messages` para construir a instância Chat na 1ª vez que o
  // id aparece; como o histórico chega assíncrono (depois do null inicial),
  // empurramos manualmente assim que carrega — senão a conversa fica vazia.
  useEffect(() => {
    if (initialMessages !== null) setMessages(initialMessages);
  }, [initialMessages, setMessages]);

  const isLoading = status === "submitted" || status === "streaming";
  const theme = FACET_THEMES.kallistis;
  const activeCharacter = chatCharacters.find((character) => character.id === activeCharacterId);

  // Salvaguarda: se ficar "pensando/respondendo" por muito tempo, oferece
  // destravar o chat sem precisar recarregar a página.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setStuck(false);
      return;
    }
    const timer = window.setTimeout(() => setStuck(true), 35_000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  function destravarChat() {
    stop();
    assistantMessageIdRef.current = null;
    setStuck(false);
    toast.message("Chat liberado. Você pode tentar novamente.");
  }

  // Propaga a cor da faceta ativa para o fundo ambiente da página (ver --facet-accent
  // em styles.css). Reseta ao desmontar para não "vazar" a cor ao navegar para fora do chat.
  useEffect(() => {
    document.body.style.setProperty("--facet-accent", theme.accent);
    return () => {
      document.body.style.removeProperty("--facet-accent");
    };
  }, [theme.accent]);

  // ── Auto-scroll helpers ────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 80;
  }, []);

  // Scroll ao montar chat inicial
  useEffect(() => {
    if (initialMessages !== null) {
      scrollToBottom("auto");
    }
  }, [initialMessages, scrollToBottom]);

  // Scroll ao trocar de thread
  useEffect(() => {
    if (initialMessages === null) return;
    scrollToBottom("auto");
  }, [threadId, initialMessages, scrollToBottom]);

  // Scroll ao mudar número de mensagens (durante streaming)
  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollToBottom(isLoading ? "auto" : "smooth");
  }, [isLoading, messages, scrollToBottom]);

  // Scroll forçado ao enviar mensagem (mesmo que usuário estivesse acima)
  useEffect(() => {
    if (status === "submitted") {
      stickToBottomRef.current = true;
      scrollToBottom("smooth");
    }
  }, [status, scrollToBottom]);

  useEffect(() => {
    composerRef.current?.focus();
  }, [initialMessages, threadId]);

  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const maxHeight = window.matchMedia("(max-width: 640px)").matches ? 128 : 200;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [input]);

  const userLabel = "Você";
  const userInitial = (userLabel[0] ?? "K").toUpperCase();
  // Envia texto + anexos numa tacada (usado pelo botão Enviar e pelo microfone).
  const enviar = useCallback(
    (baseText: string, list: Attachment[]) => {
      const text = buildOutgoingText(baseText, list);
      const fileParts = buildFileParts(list);
      if (
        (!text && fileParts.length === 0) ||
        isLoading ||
        initialMessages === null ||
        facet !== "kallistis"
      )
        return;
      stickToBottomRef.current = true;
      assistantMessageIdRef.current = crypto.randomUUID();
      const id = crypto.randomUUID();
      const parts: UIMessage["parts"] = [
        ...(text ? [{ type: "text" as const, text }] : []),
        ...fileParts,
      ];
      void sendMessage({
        id,
        role: "user",
        parts,
      });
      setInput("");
      setAttachments([]);
      requestAnimationFrame(() => composerRef.current?.focus());
    },
    [facet, initialMessages, isLoading, sendMessage],
  );

  useEffect(() => {
    if (!seed || seededRef.current === seed || initialMessages === null) return;
    seededRef.current = seed;
    if (initialMessages.length > 0) {
      setInput(seed);
      composerRef.current?.focus();
      toast.message("Mensagem preenchida no chat.");
      return;
    }
    enviar(seed, []);
  }, [enviar, initialMessages, seed]);

  function submitMessage() {
    enviar(input, attachments);
  }

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function onPickAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const existingSizes = attachments.map((file) => ({ size: file.size }));
    const selected = files.slice(0, Math.max(0, MAX_ATTACHMENTS - attachments.length));
    const validation = validateAttachmentTotal([...existingSizes, ...selected]);
    if (!validation.ok) {
      toast.error(validation.reason);
      e.target.value = "";
      return;
    }
    if (files.length + attachments.length > MAX_ATTACHMENTS) {
      toast.error(`Envie no máximo ${MAX_ATTACHMENTS} anexos por mensagem.`);
    }
    const next: Attachment[] = [];
    for (const file of selected) {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const isDocx = /\.docx$/i.test(file.name);
      try {
        if (["image/gif", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          next.push({
            name: file.name,
            kind: "image",
            content: await readAsDataUrl(file),
            size: file.size,
            mediaType: file.type || "image/png",
          });
        } else if (isPdf) {
          next.push({
            name: file.name,
            kind: "pdf",
            content: await readAsDataUrl(file),
            size: file.size,
            mediaType: "application/pdf",
          });
        } else if (isDocx) {
          const base64 = await fileToBase64(file);
          const res = await extractDocxText({ data: { base64, filename: file.name } });
          next.push({ name: file.name, kind: "text", content: res.text, size: file.size });
        } else if (file.type === "text/plain" || /\.(txt|md)$/i.test(file.name)) {
          next.push({ name: file.name, kind: "text", content: await file.text(), size: file.size });
        } else {
          // .csv/.json e outros texto-crus são recusados: anexo cru injetado no
          // prompt amplia a superfície de prompt injection. Aceitos: imagem, PDF,
          // Word, .txt e .md. Para o resto, o usuário cola o conteúdo no chat.
          toast.error(`${file.name}: formato não aceito (use imagem, PDF, Word, .txt ou .md).`);
        }
      } catch {
        toast.error(`Falha ao ler ${file.name}.`);
      }
    }
    setAttachments((prev) => [...prev, ...next].slice(0, MAX_ATTACHMENTS));
    for (const ref of [cameraAttachmentRef, imageAttachmentRef, fileAttachmentRef]) {
      if (ref.current) ref.current.value = "";
    }
    setAttachmentMenuOpen(false);
  }

  useEffect(() => {
    if (status === "submitted") setKittPulse("chat", "thinking");
    else if (status === "streaming") setKittPulse("chat", "speaking");
    else setKittPulse("chat", null);
    return () => setKittPulse("chat", null);
  }, [status]);

  useEffect(() => {
    if (tts.error) toast.error(tts.error);
  }, [tts.error]);

  const kittState: KittState = useKittPulse("idle");

  const [micState, setMicState] = useState<"idle" | "recording" | "busy">("idle");
  const trimmedInput = input.trim();
  const composerReady = initialMessages !== null && facet === "kallistis";
  const canSend = composerReady && (trimmedInput.length > 0 || attachments.length > 0);
  const isTranscribing = micState === "busy";
  const isProcessing = status === "submitted" || isTranscribing;
  // Espelha os anexos para leitura sempre atual dentro do callback do gravador.
  const attachmentsRef = useRef<Attachment[]>([]);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);

  function quickReview(raw: string): string {
    let next = raw.trim().replace(/\s+/g, " ");
    if (!next) return next;
    next = next.charAt(0).toUpperCase() + next.slice(1);
    if (!/[.!?…]$/.test(next)) next += ".";
    return next;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        toast.error("Navegador não suporta gravação em formato compatível.");
        return;
      }

      const rec = new MediaRecorder(stream, { mimeType });
      recChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recChunksRef.current, { type: rec.mimeType });
        if (blob.size < 1024) {
          setMicState("idle");
          setKittPulse("voice", null);
          toast.error("Gravação muito curta — tente de novo.");
          return;
        }

        setMicState("busy");
        setKittPulse("voice", "transcribing");

        try {
          const fd = new FormData();
          const ext =
            ({ "audio/webm": "webm", "audio/mp4": "mp4" } as Record<string, string>)[
              rec.mimeType.split(";")[0]
            ] ?? "webm";
          fd.append("file", blob, `recording.${ext}`);
          fd.append("revise", "1"); // pede revisão por LLM no servidor (só no chat)
          // Respeita a escolha de STT do Guardião (mesmo padrão do modo fala).
          const sttModel =
            typeof localStorage === "undefined" ? null : localStorage.getItem(STT_MODEL_KEY);
          if (isSTTModel(sttModel)) fd.append("sttModel", sttModel);
          const sttFallbackModel =
            typeof localStorage === "undefined"
              ? null
              : localStorage.getItem(STT_FALLBACK_MODEL_KEY);
          if (isSTTModel(sttFallbackModel)) fd.append("sttFallbackModel", sttFallbackModel);
          const res = await fetch("/api/transcribe", {
            method: "POST",
            credentials: "same-origin",
            body: fd,
          });
          if (!res.ok) throw new Error(await res.text());
          const parsed = (await res.json()) as { text?: string };
          const text = (parsed.text ?? "").trim();
          setMicState("idle");
          if (text) {
            // Envia direto: combina o que já estava digitado com a transcrição.
            const digitado = (composerRef.current?.value ?? "").trim();
            const combinado = quickReview(digitado ? `${digitado} ${text}` : text);
            enviar(combinado, attachmentsRef.current);
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Falha na transcrição.");
          setMicState("idle");
        } finally {
          setKittPulse("voice", null);
        }
      };

      recorderRef.current = rec;
      rec.start();
      setMicState("recording");
      setKittPulse("voice", "listening");
    } catch {
      toast.error("Acesso ao microfone negado.");
    }
  }

  function stopRecording() {
    const current = recorderRef.current;
    if (current && current.state !== "inactive") current.stop();
  }

  function micClick() {
    if (isLoading || !composerReady) return;
    if (micState === "idle") return void startRecording();
    if (micState === "recording") return stopRecording();
  }

  async function navigateToCampaign(nextCampaignId: string | null) {
    if (campaignBusy || isLoading || initialMessages === null) return;
    setCampaignBusy(true);
    try {
      const { createNewThread } = await import("@/lib/ensure-thread");
      const id = await createNewThread(chatScope, nextCampaignId ?? undefined);
      await navigate({
        to: "/chat/$threadId",
        params: { threadId: id },
        search: chatScope === "general" ? {} : { scope: chatScope },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível mudar a campanha.");
    } finally {
      setCampaignBusy(false);
    }
  }

  async function handleMutation(
    action: "confirm" | "cancel",
    confirmationId: string,
    messageId: string,
  ) {
    try {
      const response = await fetch("/api/chat/mutations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, confirmationId }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        operation?: string;
        character?: { id?: string; name?: string; status?: string };
      } | null;
      if (!response.ok)
        throw new Error(payload?.error ?? `Falha na operação (HTTP ${response.status})`);
      if (
        action === "confirm" &&
        payload?.operation === "character_create" &&
        payload.character?.id
      ) {
        const createdCharacter = payload.character;
        setActiveCharacterId(createdCharacter.id!);
      }
      setMutationStates((current) => ({
        ...current,
        [messageId]: action === "confirm" ? "confirmed" : "cancelled",
      }));
      toast.success(action === "confirm" ? "Alteração confirmada." : "Preview cancelado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
    }
  }

  async function submitCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = campaignName.trim();
    const mesaId = campaignMesaId || (masterMesas.length === 1 ? masterMesas[0]?.id : "");
    if (!name || !mesaId || campaignBusy || isLoading || initialMessages === null) return;
    setCampaignBusy(true);
    try {
      const response = await fetch("/api/chat/campaigns", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mesaId, name }),
      });
      const payload = (await response.json().catch(() => null)) as {
        campaign?: CampaignOption;
        error?: string;
      } | null;
      if (!response.ok || !payload?.campaign) {
        throw new Error(payload?.error ?? `Falha ao criar campanha (HTTP ${response.status})`);
      }
      setCampaigns((current) => [...current, payload.campaign!]);
      setCampaignName("");
      setCampaignCreateOpen(false);
      const { createNewThread } = await import("@/lib/ensure-thread");
      const id = await createNewThread(chatScope, payload.campaign.id);
      await navigate({
        to: "/chat/$threadId",
        params: { threadId: id },
        search: chatScope === "general" ? {} : { scope: chatScope },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a campanha.");
    } finally {
      setCampaignBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <nav
        aria-label="Navegação do chat"
        data-testid="chat-primary-actions"
        className="shrink-0 border-b px-3 py-2 sm:px-4"
        style={{ borderColor: theme.chipBorder }}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void navigate({ to: "/chat", search: { scope: "general" } })}
            className="rounded-xl border px-3 py-1.5 text-sm text-[color:var(--ivory)]"
            style={{ borderColor: theme.chipBorder }}
          >
            Chat Geral
          </button>
          {chatCharacters.length > 0 && chatScope !== "master" && (
            <label
              className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm text-[color:var(--ivory-dim)]"
              style={{ borderColor: theme.chipBorder }}
            >
              <span>Personagem</span>
              <select
                aria-label="Personagem ativa no chat"
                value={activeCharacterId ?? ""}
                disabled={isLoading || characterBusy}
                onChange={async (event) => {
                  const nextCharacterId = event.currentTarget.value || null;
                  manualCharacterSelectionRef.current = true;
                  setCharacterBusy(true);
                  try {
                    const response = await fetch("/api/chat/thread", {
                      method: "PATCH",
                      credentials: "same-origin",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ threadId, activeCharacterId: nextCharacterId }),
                    });
                    if (!response.ok)
                      throw new Error("Não foi possível trocar a personagem ativa.");
                    setActiveCharacterId(nextCharacterId);
                    toast.success(
                      nextCharacterId
                        ? "KALLISTIS está com a ficha desta personagem."
                        : "Chat sem personagem ativa.",
                    );
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Falha ao selecionar personagem.",
                    );
                  } finally {
                    setCharacterBusy(false);
                  }
                }}
                className="min-w-48 max-w-[min(24rem,60vw)] rounded-md border border-white/15 bg-[#17131f] px-2 py-1.5 text-sm text-[#F3EBDD] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{ colorScheme: "dark" }}
              >
                <option value="" style={{ backgroundColor: "#17131f", color: "#F3EBDD" }}>
                  Sem personagem ativa
                </option>
                {chatCharacters.map((character) => (
                  <option
                    key={character.id}
                    value={character.id}
                    style={{ backgroundColor: "#17131f", color: "#F3EBDD" }}
                  >
                    {character.name || "Personagem sem nome"}
                    {character.status !== "approved" ? " · ficha em andamento" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            aria-pressed={chatScope === "character_creation"}
            disabled={isLoading || initialMessages === null}
            onClick={() => void navigate({ to: "/chat", search: { scope: "character_creation" } })}
            className="rounded-xl border px-3 py-1.5 text-sm text-[color:var(--ivory)] disabled:opacity-50"
            style={{ borderColor: theme.chipBorder }}
          >
            Criar personagem
          </button>
          {isMaster && (
            <button
              type="button"
              aria-pressed={chatScope === "master"}
              onClick={() => void navigate({ to: "/chat", search: { scope: "master" } })}
              className="rounded-xl border px-3 py-1.5 text-sm text-[color:var(--ivory)]"
              style={{ borderColor: theme.chipBorder }}
            >
              Chat do Mestre
            </button>
          )}
        </div>
        {activeCharacter && chatScope !== "master" && (
          <p
            role="status"
            aria-live="polite"
            className="mx-auto mt-2 max-w-3xl text-xs text-[color:var(--ivory-dim)]"
          >
            Ficha ativa:{" "}
            <strong className="text-[color:var(--gold)]">{activeCharacter.name}</strong>. KALLISTIS
            usa esta ficha e as regras canônicas para responder dúvidas e opções de ação.
          </p>
        )}
      </nav>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-3 py-3 pb-6 sm:px-4 sm:py-5"
      >
        <div className="mx-auto max-w-3xl space-y-3 sm:space-y-5">
          {initialMessages === null && <HistorySkeleton theme={theme} />}

          {initialMessages !== null && messages.length === 0 && !isLoading && (
            <p className="mt-16 px-4 text-center text-sm text-[color:var(--ivory-dim)] sm:mt-20">
              {activeCharacter
                ? `Pergunte à KALLISTIS sobre ${activeCharacter.name}, suas capacidades, regras e ações possíveis.`
                : theme.emptyState}
            </p>
          )}

          {initialMessages !== null &&
            messages.map((m) => {
              const rawText = m.parts
                .map((p) => {
                  if (p.type === "text") return p.text;
                  if (p.type === "file" && p.mediaType?.startsWith("image/")) {
                    return `[Imagem enviada para interpretação: ${p.filename ?? "imagem"}]`;
                  }
                  return "";
                })
                .filter(Boolean)
                .join("\n\n");
              const isAssistant = m.role === "assistant";
              const safeText = isAssistant
                ? sanitizeAssistantOutput(rawText, { isLoading, status })
                : rawText;
              const clean = safeText;
              const mutationPart = m.parts.find((part) => {
                const type = (part as { type?: string }).type;
                return (
                  type === "tool-propose_character_biography_update" ||
                  type === "tool-propose_character_create"
                );
              }) as
                | {
                    state?: string;
                    output?: {
                      status?: string;
                      operation?: string;
                      confirmationId?: string;
                      beforeBiography?: string;
                      nextBiography?: string;
                      name?: string;
                      povo?: string;
                      oficio?: string;
                      biografia?: string;
                    };
                  }
                | undefined;
              const mutationOutput = mutationPart?.output;

              return (
                <div key={m.id}>
                  <MessageBubble
                    role={m.role as "user" | "assistant"}
                    text={clean}
                    facetLabel={theme.label}
                    facetAvatarUrl={theme.avatar}
                    theme={theme}
                    userAvatarUrl={null}
                    userInitial={userInitial}
                    userLabel={userLabel}
                    onSpeak={isAssistant && clean ? () => tts.speak(m.id, clean) : undefined}
                    isSpeaking={isAssistant && tts.speakingId === m.id}
                  />
                  {isAssistant &&
                    mutationPart?.state === "output-available" &&
                    mutationOutput?.status === "requires_confirmation" &&
                    mutationOutput.confirmationId &&
                    !mutationStates[m.id] && (
                      <div
                        className="ml-12 mt-2 max-w-[78%] rounded-2xl border p-3 text-sm"
                        style={{ borderColor: theme.chipBorder }}
                      >
                        <p className="mb-2 font-medium text-[color:var(--ivory)]">
                          {mutationOutput.operation === "character_create"
                            ? "Preview de criação"
                            : "Preview de alteração"}
                        </p>
                        {mutationOutput.operation === "character_create" ? (
                          <div className="space-y-1 text-xs text-[color:var(--ivory-dim)]">
                            <p>Nome: {mutationOutput.name || "—"}</p>
                            <p>Povo: {mutationOutput.povo || "—"}</p>
                            <p>Ofício: {mutationOutput.oficio || "—"}</p>
                            {mutationOutput.biografia && (
                              <p>Biografia: {mutationOutput.biografia}</p>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-[color:var(--ivory-dim)]">
                              Antes: {mutationOutput.beforeBiography || "—"}
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
                              Depois: {mutationOutput.nextBiography || "—"}
                            </p>
                          </>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            className="rounded-xl border px-3 py-1.5 text-xs"
                            style={{ borderColor: theme.chipBorder }}
                            onClick={() =>
                              void handleMutation("confirm", mutationOutput.confirmationId!, m.id)
                            }
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border px-3 py-1.5 text-xs text-[color:var(--ivory-dim)]"
                            style={{ borderColor: theme.chipBorder }}
                            onClick={() =>
                              void handleMutation("cancel", mutationOutput.confirmationId!, m.id)
                            }
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                  {mutationStates[m.id] && (
                    <p className="ml-12 mt-2 text-xs text-[color:var(--ivory-dim)]">
                      {mutationStates[m.id] === "confirmed"
                        ? "Alteração confirmada."
                        : "Preview cancelado."}
                    </p>
                  )}
                </div>
              );
            })}

          {status === "submitted" && (
            <TypingDots label={theme.thinkingLabel} color={theme.accent} />
          )}
          <div ref={bottomRef} aria-hidden className="h-1" />
        </div>
      </div>

      <div
        className="shrink-0 border-t bg-background/90 p-2.5 backdrop-blur sm:p-4"
        style={{
          borderColor: theme.chipBorder,
          paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="flex items-center gap-2 px-1">
            {(campaigns.length > 0 || masterMesas.length > 0) && (
              <div
                className="w-full rounded-2xl border bg-card/60 px-3 py-2"
                data-testid="chat-campaign-control"
                style={{ borderColor: theme.chipBorder }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ivory-dim)]"
                    htmlFor="chat-campaign-select"
                  >
                    Campanha
                  </label>
                  <select
                    id="chat-campaign-select"
                    aria-label="Campanha ativa"
                    value={threadCampaignId ?? ""}
                    disabled={campaignBusy || isLoading || initialMessages === null}
                    onChange={(event) => {
                      const nextId = event.currentTarget.value || null;
                      if (nextId !== threadCampaignId) void navigateToCampaign(nextId);
                    }}
                    className="min-w-0 flex-1 rounded-xl border bg-background px-2 py-1 text-sm text-[color:var(--ivory)]"
                    style={{ borderColor: theme.chipBorder }}
                  >
                    <option value="">Sem campanha nesta conversa</option>
                    {threadCampaignId &&
                      !campaigns.some((campaign) => campaign.id === threadCampaignId) && (
                        <option value={threadCampaignId}>
                          {threadCampaignName ?? "Campanha atual"}
                        </option>
                      )}
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name} — {campaign.mesaName}
                      </option>
                    ))}
                  </select>
                  {masterMesas.length > 0 && (
                    <button
                      type="button"
                      aria-label="Criar campanha"
                      disabled={campaignBusy || isLoading || initialMessages === null}
                      onClick={() => setCampaignCreateOpen((open) => !open)}
                      className="rounded-xl border px-2.5 py-1 text-xs text-[color:var(--ivory-dim)] hover:text-[color:var(--ivory)]"
                      style={{ borderColor: theme.chipBorder }}
                    >
                      Criar campanha
                    </button>
                  )}
                </div>
                {campaignCreateOpen && masterMesas.length > 0 && (
                  <form onSubmit={submitCampaign} className="mt-2 flex flex-wrap gap-2">
                    <input
                      aria-label="Nome da campanha"
                      value={campaignName}
                      onChange={(event) => setCampaignName(event.currentTarget.value)}
                      placeholder="Nome da campanha"
                      maxLength={120}
                      required
                      className="min-w-[12rem] flex-1 rounded-xl border bg-background px-2 py-1.5 text-sm text-[color:var(--ivory)]"
                      style={{ borderColor: theme.chipBorder }}
                    />
                    <select
                      aria-label="Mesa da campanha"
                      value={
                        campaignMesaId ||
                        (masterMesas.length === 1 ? (masterMesas[0]?.id ?? "") : "")
                      }
                      onChange={(event) => setCampaignMesaId(event.currentTarget.value)}
                      className="rounded-xl border bg-background px-2 py-1.5 text-sm text-[color:var(--ivory)]"
                      style={{ borderColor: theme.chipBorder }}
                      required
                    >
                      <option value="">Escolha a Mesa</option>
                      {masterMesas.map((mesa) => (
                        <option key={mesa.id} value={mesa.id}>
                          {mesa.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={campaignBusy || !campaignName.trim()}
                      className="rounded-xl border px-3 py-1.5 text-xs text-[color:var(--ivory)] disabled:opacity-50"
                      style={{ borderColor: theme.chipBorder }}
                    >
                      Salvar
                    </button>
                  </form>
                )}
              </div>
            )}
            <KittScanner state={kittState} variant="ruby" height={18} />
            {stuck && (
              <button
                type="button"
                onClick={destravarChat}
                className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide text-[color:var(--ivory-dim)] hover:text-[color:var(--ivory)]"
                style={{ borderColor: theme.chipBorder }}
              >
                Destravar chat
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Nova conversa"
            title="Nova conversa"
            disabled={isLoading || initialMessages === null}
            onClick={async () => {
              try {
                const { createNewThread } = await import("@/lib/ensure-thread");
                const id = await createNewThread(chatScope);
                await navigate({
                  to: "/chat/$threadId",
                  params: { threadId: id },
                  search: chatScope === "general" ? {} : { scope: chatScope },
                });
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Não foi possível criar a conversa.",
                );
              }
            }}
          >
            <Plus className="h-5 w-5" />
          </Button>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {attachments.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  className="inline-flex max-w-full items-center gap-2 rounded-2xl border bg-card/85 px-2 py-1.5 text-xs text-[color:var(--ivory-dim)]"
                  style={{ borderColor: theme.chipBorder }}
                >
                  {file.kind === "image" && (
                    <img src={file.content} alt="" className="h-8 w-8 rounded-xl object-cover" />
                  )}
                  {file.kind === "image"
                    ? "Imagem para interpretar"
                    : file.kind === "pdf"
                      ? "PDF para leitura"
                      : "Texto"}
                  : {file.name}
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`Remover ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={cameraAttachmentRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              capture="environment"
              hidden
              onChange={onPickAttachment}
            />
            <input
              ref={imageAttachmentRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={onPickAttachment}
            />
            <input
              ref={fileAttachmentRef}
              type="file"
              accept=".txt,.md,.pdf,image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              hidden
              onChange={onPickAttachment}
            />
            <div className="relative">
              <Button
                type="button"
                onClick={() => setAttachmentMenuOpen((open) => !open)}
                disabled={isLoading || !composerReady}
                variant="ghost"
                size="icon"
                className="mb-0.5 h-11 w-11 shrink-0 rounded-full border bg-card/70"
                style={{ borderColor: theme.chipBorder, color: theme.accentText }}
                aria-label="Abrir opções de anexo"
                title="Anexar"
                aria-expanded={attachmentMenuOpen}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              {attachmentMenuOpen && (
                <div
                  className="absolute bottom-14 left-0 z-20 w-56 rounded-3xl border bg-background/95 p-2 shadow-2xl backdrop-blur"
                  style={{ borderColor: theme.chipBorder, boxShadow: theme.headerGlow }}
                >
                  {[
                    {
                      label: "Tirar foto",
                      icon: Camera,
                      action: () => cameraAttachmentRef.current?.click(),
                    },
                    {
                      label: "Escolher imagem",
                      icon: ImageIcon,
                      action: () => imageAttachmentRef.current?.click(),
                    },
                    {
                      label: "Escolher arquivo",
                      icon: FileText,
                      action: () => fileAttachmentRef.current?.click(),
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-[color:var(--ivory)] hover:bg-[color:var(--ivory)]/[0.06]"
                    >
                      <item.icon className="h-4 w-4" style={{ color: theme.accentText }} />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              className="flex min-w-0 flex-1 items-end rounded-[1.6rem] bg-card/90 py-1 pl-3 pr-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.28)]"
              style={{
                border: `1px solid ${theme.chipBorder}`,
                boxShadow: `${theme.composerRing}, 0 18px 55px rgba(0,0,0,0.28)`,
              }}
            >
              <textarea
                ref={composerRef}
                aria-label="Mensagem"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submitMessage();
                  }
                }}
                rows={1}
                placeholder={
                  micState === "recording"
                    ? "Gravando…"
                    : micState === "busy"
                      ? "Transcrevendo…"
                      : "Mensagem"
                }
                title="Shift+Enter quebra linha"
                inputMode="text"
                enterKeyHint="send"
                autoComplete="off"
                className="max-h-32 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2.5 text-base leading-snug outline-none placeholder:text-[color:var(--ivory-dim)]/55 sm:max-h-[200px]"
              />
              <Button
                type="button"
                asChild
                variant="ghost"
                size="icon"
                className="mb-0.5 h-9 w-9 shrink-0 rounded-full text-[color:var(--ivory-dim)] hover:text-[color:var(--ivory)]"
                aria-label="Trilha de sedimentação"
                title="Trilha de sedimentação"
              >
                <Link to="/trilha/$threadId" params={{ threadId }}>
                  <GitBranch className="h-4 w-4" />
                </Link>
              </Button>
              <span className="hidden pb-2 pr-1 text-[11px] text-[color:var(--ivory-dim)] lg:inline">
                Shift+Enter
              </span>
            </div>

            {isProcessing ? (
              <Button
                type="button"
                disabled
                size="icon"
                className={`mb-0.5 h-11 w-11 shrink-0 rounded-full opacity-80 ${theme.sendClass}`}
                aria-label="Processando"
                title="Processando"
              >
                <Loader2 className="h-5 w-5 animate-spin" />
              </Button>
            ) : canSend ? (
              <Button
                type="button"
                onClick={submitMessage}
                size="icon"
                className={`mb-0.5 h-11 w-11 shrink-0 rounded-full ${theme.sendClass}`}
                aria-label="Enviar mensagem"
                title="Enviar mensagem"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={micClick}
                size="icon"
                className={`mb-0.5 h-11 w-11 shrink-0 rounded-full ${theme.sendClass} ${
                  micState === "recording" ? theme.micRecordingClass : ""
                }`}
                aria-label={micState === "recording" ? "Parar gravação" : "Gravar áudio"}
                title={micState === "recording" ? "Parar gravação" : "Gravar áudio"}
              >
                {micState === "recording" ? (
                  <Square className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
