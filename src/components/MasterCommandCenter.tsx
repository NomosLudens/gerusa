import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  CircleUserRound,
  Clock3,
  FileText,
  Gamepad2,
  Images,
  Map,
  MessageCircle,
  Music2,
  Radio,
  ScrollText,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

type Mesa = { id: string; name: string; slug?: string };
type Campaign = { id: string; mesaId: string; mesaName: string; name: string };
type Player = { id: string; name: string | null; mesaId: string; mesaName: string };
type Character = {
  id: string;
  ownerUserId: string;
  name: string;
  playerName: string;
  mesas: Mesa[];
};
type SummaryPayload = {
  mesas?: Mesa[];
  campaigns?: Campaign[];
  players?: Player[];
  characters?: Character[];
  error?: string;
};
type Card = {
  title: string;
  detail: string;
  action: string;
  icon: typeof Users;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
};

const SURFACE =
  "border-white/10 bg-[#111016] hover:border-[color:var(--gold)]/45 hover:bg-[#14121A]";

function focusElement(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openPlaylist() {
  window.dispatchEvent(new Event("kallistis:open-ost-library"));
}

export function MasterCommandCenter({
  selectedMesa,
  onSelectedMesaChange,
}: {
  selectedMesa?: string;
  onSelectedMesaChange: (mesaId: string) => void;
}) {
  const [payload, setPayload] = useState<SummaryPayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [presence, setPresence] = useState<Record<string, number>>({
    green: 0,
    yellow: 0,
    blue: 0,
    red: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/master/characters", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const next = (await response.json().catch(() => ({}))) as SummaryPayload;
        if (!response.ok) throw new Error(next.error || "master_command_center_failed");
        if (!cancelled) {
          setPayload(next);
          if (!selectedMesa && next.mesas?.[0]) onSelectedMesaChange(next.mesas[0].id);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "master_command_center_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onSelectedMesaChange, selectedMesa]);

  const mesas = payload.mesas ?? [];
  const players = payload.players ?? [];
  const characters = payload.characters ?? [];
  const campaigns = payload.campaigns ?? [];
  const contextMesa =
    selectedMesa && selectedMesa !== "all" ? mesas.find((mesa) => mesa.id === selectedMesa) : null;
  const hasGuardIntentionMaterial = contextMesa?.name === "Geek Wizards";
  const contextPlayers = useMemo(
    () => (contextMesa ? players.filter((player) => player.mesaId === contextMesa.id) : players),
    [contextMesa, players],
  );
  const contextCharacters = useMemo(
    () =>
      contextMesa
        ? characters.filter((character) =>
            character.mesas.some((mesa) => mesa.id === contextMesa.id),
          )
        : characters,
    [contextMesa, characters],
  );
  const contextCampaigns = useMemo(
    () =>
      contextMesa ? campaigns.filter((campaign) => campaign.mesaId === contextMesa.id) : campaigns,
    [campaigns, contextMesa],
  );
  const playerIds = new Set(contextPlayers.map((player) => player.id));
  const unassigned = contextCharacters.filter(
    (character) =>
      !character.mesas.length ||
      !character.mesas.some((mesa) => playerIds.has(character.ownerUserId)),
  ).length;

  useEffect(() => {
    if (!selectedMesa || selectedMesa === "all") return;
    let cancelled = false;
    void Promise.all([
      fetch("/api/master/presence?mesa_id=" + encodeURIComponent(selectedMesa), {
        credentials: "same-origin",
        cache: "no-store",
      }).then((response) => response.json().catch(() => ({}))),
      fetch("/api/master/private-messages", { credentials: "same-origin", cache: "no-store" }).then(
        (response) => response.json().catch(() => ({})),
      ),
    ])
      .then(([presenceData, threadData]) => {
        if (cancelled) return;
        const counts = { green: 0, yellow: 0, blue: 0, red: 0 };
        for (const player of (presenceData.players ?? []) as Array<{ regime?: string }>)
          if (player.regime && player.regime in counts)
            counts[player.regime as keyof typeof counts] += 1;
        setPresence(counts);
        setUnread(
          ((threadData.threads ?? []) as Array<{ unread_count?: number }>).reduce(
            (sum, thread) => sum + Number(thread.unread_count ?? 0),
            0,
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedMesa]);

  const surfaceHref = (surface: string, fragment = "") => {
    const query =
      selectedMesa && selectedMesa !== "all" ? `?mesaId=${encodeURIComponent(selectedMesa)}` : "";
    return `/api/master/surface/${surface}${query}${fragment}`;
  };
  const cards: Card[] = [
    {
      title: "Jogadores",
      detail: `${contextPlayers.length} na Mesa`,
      action: "Abrir lista",
      icon: Users,
      onClick: () => focusElement("master-players-panel"),
    },
    {
      title: "Personagens",
      detail: `${contextCharacters.length} fichas · ${unassigned} sem vínculo`,
      action: "Abrir personagens",
      icon: CircleUserRound,
      onClick: () => focusElement("master-sheets-panel"),
    },
    {
      title: "Mesa",
      detail: contextMesa?.name ?? `${mesas.length} Mesas disponíveis`,
      action: "Trocar contexto",
      icon: Shield,
      onClick: () => focusElement("master-mesa-context"),
    },
    {
      title: "Campanha",
      detail: contextCampaigns[0]?.name ?? "Nenhuma campanha ativa",
      action: "Abrir campanha",
      icon: BookOpen,
      href: contextMesa?.slug ? "/campanha/" + encodeURIComponent(contextMesa.slug) : undefined,
      disabled: !contextMesa,
    },
    {
      title: "Material",
      detail: hasGuardIntentionMaterial
        ? "A Intenção da Guarda · Geek Wizards"
        : "Material específico da Mesa ainda não disponível",
      action: "Abrir material",
      icon: FileText,
      href: surfaceHref("intencao-da-guarda"),
      disabled: !hasGuardIntentionMaterial,
    },
    {
      title: "Playlist",
      detail: "Player OST integrado",
      action: "Abrir biblioteca",
      icon: Music2,
      onClick: openPlaylist,
    },
    {
      title: "Mapas",
      detail: "Roteador cartográfico",
      action: "Abrir mapas",
      icon: Map,
      href: "/mapas",
    },
    {
      title: "Calendário",
      detail: "Agenda real",
      action: "Abrir calendário",
      icon: CalendarDays,
      href: "/agenda",
    },
    {
      title: "Semáforo",
      detail: `${presence.green} Verde · ${presence.yellow} Amarelo · ${presence.blue} Azul · ${presence.red} Vermelho`,
      action: "Focar rail",
      icon: Radio,
      onClick: () => focusElement("master-operational-rail"),
    },
    {
      title: "Mensagens privadas",
      detail: unread ? `${unread} não lida${unread === 1 ? "" : "s"}` : "Nenhuma não lida",
      action: "Focar rail",
      icon: MessageCircle,
      onClick: () => focusElement("master-operational-rail"),
    },
    {
      title: "Chat",
      detail: "Conversa geral real",
      action: "Abrir chat",
      icon: Sparkles,
      href: "/chat",
    },
    {
      title: "Galeria",
      detail: "Imagens reais disponíveis",
      action: "Abrir galeria",
      icon: Images,
      href: "/galeria",
    },
    {
      title: "Canon",
      detail: "Canon Explorer",
      action: "Abrir cânone",
      icon: ScrollText,
      href: "/microapp?app=canon-explorer",
    },
    {
      title: "Velarim",
      detail: "Dicionário e tradutor",
      action: "Abrir Velarim",
      icon: Gamepad2,
      href: "/microapp?app=velarim",
    },
    {
      title: "Ferramentas de sessão",
      detail: "Sessão Zero e preparação",
      action: "Abrir ferramentas",
      icon: Clock3,
      href: surfaceHref("sessao-zero"),
    },
    {
      title: "Checklist / controle",
      detail: "Checklist real da Sessão Zero",
      action: "Abrir checklist",
      icon: CheckSquare,
      href: surfaceHref("sessao-zero", "#resultado"),
    },
  ];

  return (
    <section
      className="mb-6 rounded-xl border border-white/10 bg-[#0C0B12]/90 p-5 text-[#F3EBDD]"
      aria-label="Painel do Mestre"
    >
      <header className="border-b border-white/10 pb-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)]">
          Central operacional
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Mesa Hub</h1>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label
            id="master-mesa-context"
            className="min-w-56 text-[10px] uppercase tracking-[0.2em] text-[#F3EBDD]/45"
          >
            Mesa
            <select
              value={selectedMesa ?? ""}
              onChange={(event) => onSelectedMesaChange(event.target.value)}
              disabled={loading || !mesas.length}
              className="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-sm normal-case tracking-normal text-[#F3EBDD]"
              aria-label="Mesa do Painel do Mestre"
            >
              <option value="all">Todas as Mesas</option>
              {mesas.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  {mesa.name}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm text-[#F3EBDD]/65">
            <p>
              Mesa: <span className="text-[#F3EBDD]">{contextMesa?.name ?? "Todas as Mesas"}</span>
            </p>
            <p>
              Campanha:{" "}
              <span className="text-[#F3EBDD]">
                {contextCampaigns[0]?.name ?? "não relacionada"}
              </span>
            </p>
          </div>
        </div>
      </header>
      {error ? (
        <p role="alert" className="mt-4 rounded border border-red-400/30 p-3 text-sm text-red-200">
          Não foi possível carregar o contexto do Mestre.
        </p>
      ) : null}
      <div
        className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Roteador 4 por 4"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          const className = `group flex min-h-[92px] flex-col justify-between rounded-lg border p-3 text-left transition ${SURFACE} ${card.disabled ? "cursor-not-allowed opacity-55 hover:border-white/10 hover:bg-[#111016]" : ""}`;
          const content = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em]">
                  {card.title}
                </span>
                <Icon className="h-4 w-4 shrink-0 text-[color:var(--gold)]" aria-hidden />
              </span>
              <span className="mt-2 block truncate text-xs text-[#F3EBDD]/55">{card.detail}</span>
              <span className="mt-3 block text-[10px] uppercase tracking-[0.16em] text-[color:var(--gold)]">
                {card.action}
              </span>
            </>
          );
          if (card.href && !card.disabled)
            return (
              <a key={card.title} href={card.href} className={className}>
                {content}
              </a>
            );
          return (
            <button
              key={card.title}
              type="button"
              disabled={card.disabled}
              onClick={card.onClick}
              className={className}
            >
              {content}
            </button>
          );
        })}
      </div>
      <section
        id="master-players-panel"
        className="mt-5 border-t border-white/10 pt-5"
        aria-label="Jogadores e personagens da Mesa"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/45">
              Relação operacional
            </p>
            <h2 className="mt-1 text-lg">Jogadores e personagens</h2>
          </div>
          <span className="text-xs text-[#F3EBDD]/45">
            {contextPlayers.length} jogadores · {contextCharacters.length} personagens
          </span>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-[#F3EBDD]/55">Consultando dados reais…</p>
        ) : null}
        {!loading && !contextPlayers.length ? (
          <p className="mt-4 text-sm text-[#F3EBDD]/55">Nenhum jogador nesta Mesa.</p>
        ) : null}
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {contextPlayers.map((player) => {
            const playerCharacters = contextCharacters.filter(
              (character) => character.ownerUserId === player.id,
            );
            return (
              <article
                key={`${player.id}-${player.mesaId}`}
                className="rounded-lg border border-white/10 bg-black/15 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium">
                      {player.name || "Jogador sem nome"}
                    </h3>
                    <p className="mt-1 text-xs text-[#F3EBDD]/45">{player.mesaName}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#F3EBDD]/40">
                    {playerCharacters.length} ficha{playerCharacters.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {playerCharacters.length ? (
                    playerCharacters.map((character) => (
                      <div
                        key={character.id}
                        className="flex items-center justify-between gap-2 rounded border border-white/10 px-2 py-2"
                      >
                        <span className="min-w-0 truncate text-xs text-[#F3EBDD]/75">
                          {character.name || "Personagem sem nome"}
                        </span>
                        <a
                          href={`/microapp?app=character-forge&mode=tal&characterId=${encodeURIComponent(character.id)}`}
                          className="shrink-0 rounded border border-[color:var(--gold)]/35 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--gold)]"
                        >
                          Ficha
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#F3EBDD]/45">Nenhum personagem vinculado.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {contextCharacters.some(
          (character) => !contextPlayers.some((player) => player.id === character.ownerUserId),
        ) ? (
          <p className="mt-3 text-xs text-[#F3EBDD]/50">
            Há personagens sem jogador vinculado nesta seleção; elas permanecem visíveis em
            Personagens / Fichas.
          </p>
        ) : null}
      </section>
    </section>
  );
}
