import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { deriveCharacterDisplayState } from "@/lib/character-display-state";

type Mesa = { id: string; slug: string; name: string };
type Snapshot = Record<string, unknown>;
type MasterCharacter = {
  id: string;
  ownerUserId: string;
  name: string;
  playerName: string;
  ownerDisplayName?: string;
  status: string;
  snapshot: Snapshot;
  mesas: Mesa[];
  version: number;
  updatedAt: string;
};
type ExportPreview = {
  schema: string;
  schema_version: number;
  exported_at: string;
  export_mode: "manual_runtime_snapshot";
  source_state: string;
  canonical: boolean;
  mesa: { id: string; name: string } | null;
  player: { kallistis_user_id: string | null; display_name: string | null; email: string | null };
  character: {
    kallistis_character_id: string;
    name: string;
    published_version: number | null;
    snapshot: Snapshot;
  };
};

const record = (value: unknown): Snapshot =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Snapshot) : {};
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const label = (value: unknown, empty = "Não informado"): string => text(value) || empty;

function activeTrail(snapshot: Snapshot): Snapshot {
  const trails = list(snapshot.trilhas);
  const index = Number.isInteger(snapshot.trilhaAtiva) ? Number(snapshot.trilhaAtiva) : 0;
  return record(trails[index]);
}

function characterMesaLabel(character: MasterCharacter) {
  return character.mesas.length
    ? character.mesas.map((mesa) => mesa.name).join(", ")
    : "Sem mesa atribuída";
}
export function MasterSheetsPanel({
  selectedMesa: controlledMesa,
  onSelectedMesaChange,
  hideMesaSelector = false,
}: {
  selectedMesa?: string;
  onSelectedMesaChange?: (mesaId: string) => void;
  hideMesaSelector?: boolean;
}) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [characters, setCharacters] = useState<MasterCharacter[]>([]);
  const [canEditCharacters, setCanEditCharacters] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);
  const initialized = useRef(false);
  const initialControlledMesa = useRef(controlledMesa);
  const onSelectedMesaChangeRef = useRef(onSelectedMesaChange);
  onSelectedMesaChangeRef.current = onSelectedMesaChange;

  const refreshCharacters = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    try {
      const response = await fetch("/api/master/characters", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        mesas?: Mesa[];
        characters?: MasterCharacter[];
        canEditCharacters?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "master_sheets_failed");
      setMesas(payload.mesas ?? []);
      setCharacters(payload.characters ?? []);
      setCanEditCharacters(payload.canEditCharacters === true);
      if (!initialized.current) {
        const query = new URLSearchParams(window.location.search);
        const queryCharacterId = query.get("characterId");
        const queryMesaId = query.get("mesaId");
        const queryCharacter = payload.characters?.find(
          (character) => character.id === queryCharacterId,
        );
        setSelectedCharacter(queryCharacter?.id ?? null);
        if (!initialControlledMesa.current) {
          const nextMesa = queryMesaId || payload.mesas?.[0]?.id || "all";
          setSelectedMesa(nextMesa);
          onSelectedMesaChangeRef.current?.(nextMesa);
        }
        initialized.current = true;
      }
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "master_sheets_failed");
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshCharacters();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshCharacters();
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [refreshCharacters]);

  const effectiveMesa = controlledMesa ?? selectedMesa;
  const visibleCharacters = useMemo(() => {
    if (effectiveMesa === "all") return characters;
    if (effectiveMesa === "unassigned")
      return characters.filter((character) => !character.mesas.length);
    if (!effectiveMesa) return characters;
    return characters.filter((character) =>
      character.mesas.some((mesa) => mesa.id === effectiveMesa),
    );
  }, [characters, effectiveMesa]);
  const selected =
    visibleCharacters.find((character) => character.id === selectedCharacter) ?? null;

  return (
    <section
      id="master-sheets-panel"
      className="mx-auto mb-6 max-w-6xl rounded-xl border border-white/10 bg-black/20 p-5 text-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/50">Central do Mestre</p>
          <h2 className="text-xl font-semibold">Fichas reais</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/60">
            Acompanhe o estado e a última atualização das fichas. Atualização automática a cada 20
            segundos.
          </p>
          {canEditCharacters ? (
            <p className="mt-1 text-xs text-white/45">
              TAL pode abrir e editar a ficha real sem alterar o proprietário.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void refreshCharacters()}
          disabled={refreshing}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-3 text-sm text-white/75 transition-colors hover:border-white/40 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Atualizar agora
        </button>
        <div className={hideMesaSelector ? "hidden" : "min-w-56"}>
          <label
            className="text-[10px] uppercase tracking-[0.2em] text-white/45"
            htmlFor="master-sheet-mesa"
          >
            Mesa
          </label>
          <select
            id="master-sheet-mesa"
            className="mt-2 w-full rounded border border-white/15 bg-black/30 px-3 py-2 text-sm"
            value={controlledMesa ?? selectedMesa}
            onChange={(event) => {
              setSelectedMesa(event.target.value);
              onSelectedMesaChange?.(event.target.value);
              setSelectedCharacter(null);
              const mesaQuery =
                event.target.value && event.target.value !== "all"
                  ? "?mesaId=" + encodeURIComponent(event.target.value)
                  : "";
              window.history.replaceState(null, "", "/mestre" + mesaQuery);
            }}
            disabled={loading || !mesas.length}
          >
            <option value="all">Todas as Mesas</option>
            {mesas.map((mesa) => (
              <option key={mesa.id} value={mesa.id}>
                {mesa.name}
              </option>
            ))}
            {characters.some((character) => !character.mesas.length) ? (
              <option value="unassigned">Sem mesa atribuída</option>
            ) : null}
          </select>
        </div>
      </div>

      {loading ? <p className="mt-5 text-sm text-white/60">Consultando fichas reais…</p> : null}
      {error ? (
        <p className="mt-5 rounded border border-red-400/30 p-3 text-sm text-red-200">
          Erro: {error}
        </p>
      ) : null}
      {!loading && !error && !visibleCharacters.length ? (
        <p className="mt-5 rounded border border-white/10 p-4 text-sm text-white/60">
          Nenhuma ficha criada nesta mesa.
        </p>
      ) : null}

      {selected ? (
        <div className="mt-5">
          <button
            type="button"
            className="mb-4 inline-flex rounded border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/75 hover:border-[color:var(--gold)]/60 hover:text-white"
            onClick={() => {
              setSelectedCharacter(null);
              const mesaQuery =
                effectiveMesa && effectiveMesa !== "all"
                  ? "?mesaId=" + encodeURIComponent(effectiveMesa)
                  : "";
              window.history.replaceState(null, "", "/mestre" + mesaQuery);
            }}
          >
            ← Voltar para Personagens
          </button>
          <MasterCharacterSheet character={selected} />
        </div>
      ) : visibleCharacters.length ? (
        <div className="mt-5">
          <div className="space-y-3">
            {visibleCharacters.map((character) => {
              const snapshot = record(character.snapshot);
              const trail = activeTrail(snapshot);
              const player = label(
                character.playerName || character.ownerDisplayName,
                "Jogador não identificado",
              );
              return (
                <button
                  key={character.id}
                  type="button"
                  className="w-full rounded-lg border border-white/10 bg-black/15 p-4 text-left transition-colors hover:border-white/25"
                  onClick={() => {
                    setSelectedCharacter(character.id);
                    const mesaQuery =
                      effectiveMesa && effectiveMesa !== "all"
                        ? "mesaId=" + encodeURIComponent(effectiveMesa) + "&"
                        : "";
                    window.history.replaceState(
                      null,
                      "",
                      "/mestre?" + mesaQuery + "characterId=" + encodeURIComponent(character.id),
                    );
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{label(character.name, "Sem nome")}</h3>
                      <p className="mt-1 text-sm text-white/65">Jogador: {player}</p>
                    </div>
                    <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-wider text-white/55">
                      {
                        deriveCharacterDisplayState({
                          status: character.status,
                          completo: record(character.snapshot).completo === true,
                        }).masterLabel
                      }
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-white/55">
                    {[
                      text(snapshot.povo),
                      text(trail.oficio),
                      trail.marco ? "Marco " + trail.marco : "",
                      characterMesaLabel(character),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-2 text-xs text-white/45">
                    Última atualização: {formatCharacterUpdatedAt(character.updatedAt)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function formatCharacterUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "horário indisponível"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function MasterCharacterSheet({ character }: { character: MasterCharacter }) {
  const [exportPreview, setExportPreview] = useState<ExportPreview | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function prepareExport() {
    setExportLoading(true);
    setExportError(null);
    try {
      const query = new URLSearchParams({ export: "gravewright", characterId: character.id });
      const response = await fetch(`/api/master/characters?${query.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | (ExportPreview & { error?: string })
        | null;
      if (!response.ok || !payload?.schema)
        throw new Error(payload?.error || "character_export_failed");
      setExportPreview(payload);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : "character_export_failed");
    } finally {
      setExportLoading(false);
    }
  }

  function downloadExport() {
    if (!exportPreview) return;
    const json = JSON.stringify(exportPreview, null, 2) + "\n";
    const url = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kallistis-${(exportPreview.character.name || "personagem").replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase()}-${exportPreview.character.kallistis_character_id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article className="rounded-lg border border-[color:var(--gold)]/20 bg-black/15 p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--gold)]/70">
        Ficha canônica · Character Forge
      </p>
      <h3 className="mt-2 text-2xl font-semibold">{label(character.name, "Sem nome")}</h3>
      <p className="mt-1 text-sm text-white/65">
        Jogador: {label(character.playerName || character.ownerDisplayName, "Não identificado")} ·{" "}
        {characterMesaLabel(character)}
      </p>
      <p className="mt-2 text-xs text-white/50">
        Status:{" "}
        {
          deriveCharacterDisplayState({
            status: character.status,
            completo: record(character.snapshot).completo === true,
          }).masterLabel
        }{" "}
        · versão persistida {character.version}
      </p>
      <p className="mt-4 rounded border border-white/10 bg-black/20 p-3 text-sm text-white/60">
        A ficha completa é mantida em uma única superfície canônica. Abra o Character Forge para
        consultar ou editar conforme sua permissão.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          className="inline-flex rounded border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/15 px-4 py-2 text-sm text-[color:var(--ivory)] hover:border-[color:var(--gold)]"
          href={`/microapp?app=character-forge&mode=tal&characterId=${encodeURIComponent(character.id)}`}
        >
          Editar como Mestre
        </a>
        <a
          className="inline-flex rounded border border-white/20 px-4 py-2 text-sm text-white/80 hover:border-white/45 hover:text-white"
          href={`/personagem/${encodeURIComponent(character.id)}/ficha`}
        >
          Ver ficha
        </a>
        <button
          type="button"
          onClick={() => void prepareExport()}
          disabled={exportLoading}
          className="inline-flex rounded border border-[color:var(--gold)]/40 px-4 py-2 text-sm text-[color:var(--gold)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportLoading ? "Preparando exportação…" : "Exportar ficha para Gravewright"}
        </button>
      </div>
      {exportError ? (
        <p role="alert" className="mt-3 rounded border border-red-400/30 p-3 text-sm text-red-200">
          Não foi possível preparar a exportação: {exportError}
        </p>
      ) : null}
      {exportPreview ? (
        <div className="mt-4 rounded border border-[color:var(--gold)]/25 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)]">
            Preview da exportação
          </p>
          <dl className="mt-3 grid gap-2 text-sm text-white/75 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-white/45">Mesa</dt>
              <dd>{exportPreview.mesa?.name || "Não atribuída"}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">Jogador</dt>
              <dd>{exportPreview.player.display_name || "Não identificado"}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">ID KALLISTIS</dt>
              <dd className="break-all font-mono text-xs">
                {exportPreview.character.kallistis_character_id}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">Schema</dt>
              <dd>
                {exportPreview.schema} · v{exportPreview.schema_version}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">Estado</dt>
              <dd>
                {exportPreview.source_state} ·{" "}
                {exportPreview.canonical ? "canônica" : "não canônica"}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={downloadExport}
            className="mt-4 inline-flex rounded border border-[color:var(--gold)]/45 bg-[color:var(--gold)]/15 px-4 py-2 text-sm text-[color:var(--ivory)]"
          >
            Baixar ficha para Gravewright
          </button>
        </div>
      ) : null}
    </article>
  );
}
