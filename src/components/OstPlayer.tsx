import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Library,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat1,
  Search,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { OST_CATALOG, OST_CATEGORIES, getOstTrack, type OstCategory } from "@/lib/ost-catalog";

const TRACK_STORAGE_KEY = "kallistis-ost-track";
const VOLUME_STORAGE_KEY = "kallistis-ost-volume";
const MUTED_STORAGE_KEY = "kallistis-ost-muted";
const LOOP_STORAGE_KEY = "kallistis-ost-loop";
const MINIMIZED_STORAGE_KEY = "kallistis-ost-minimized";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Prefer a working local player when storage is unavailable.
  }
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function initialTrackId() {
  const saved = readStorage(TRACK_STORAGE_KEY);
  return saved && OST_CATALOG.some((track) => track.id === saved) ? saved : "00";
}

function initialVolume() {
  const saved = Number(readStorage(VOLUME_STORAGE_KEY));
  return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 0.8;
}

function initialMinimized() {
  const saved = readStorage(MINIMIZED_STORAGE_KEY);
  if (saved !== null) return saved === "true";
  return typeof window !== "undefined" && window.innerWidth < 640;
}

export function OstPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeAfterTrackChange = useRef(false);
  const [trackId, setTrackId] = useState(initialTrackId);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(initialVolume);
  const [muted, setMuted] = useState(() => readStorage(MUTED_STORAGE_KEY) === "true");
  const [loop, setLoop] = useState(() => readStorage(LOOP_STORAGE_KEY) === "true");
  const [minimized, setMinimized] = useState(initialMinimized);
  const [playing, setPlaying] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"Todas" | OstCategory>("Todas");
  const [error, setError] = useState<string | null>(null);

  const track = getOstTrack(trackId);
  const trackIndex = OST_CATALOG.findIndex((candidate) => candidate.id === track.id);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const shouldResume = resumeAfterTrackChange.current;
    resumeAfterTrackChange.current = false;
    setError(null);
    audio.src = track.src;
    audio.currentTime = 0;
    audio.load();
    if (shouldResume)
      void audio.play().catch(() => setError("Clique em Play para iniciar a faixa."));
    writeStorage(TRACK_STORAGE_KEY, track.id);
  }, [track.id, track.src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
    audio.loop = loop;
    writeStorage(VOLUME_STORAGE_KEY, String(volume));
    writeStorage(MUTED_STORAGE_KEY, String(muted));
    writeStorage(LOOP_STORAGE_KEY, String(loop));
  }, [loop, muted, volume]);

  useEffect(() => {
    writeStorage(MINIMIZED_STORAGE_KEY, String(minimized));
  }, [minimized]);

  useEffect(() => {
    const openLibrary = () => {
      setMinimized(false);
      setLibraryOpen(true);
    };
    window.addEventListener("kallistis:open-ost-library", openLibrary);
    return () => window.removeEventListener("kallistis:open-ost-library", openLibrary);
  }, []);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncTime = () => setCurrentTime(audio.currentTime || 0);
    const syncDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const syncPlaying = () => setPlaying(!audio.paused);
    const handleEnded = () => {
      if (audio.loop) return;
      const next = OST_CATALOG[(trackIndex + 1) % OST_CATALOG.length];
      if (!next.autoplayAllowed) {
        setPlaying(false);
        return;
      }
      resumeAfterTrackChange.current = true;
      setTrackId(next.id);
    };
    const handleError = () => setError("Não foi possível carregar esta faixa.");

    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("play", syncPlaying);
    audio.addEventListener("pause", syncPlaying);
    audio.addEventListener("volumechange", syncPlaying);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("play", syncPlaying);
      audio.removeEventListener("pause", syncPlaying);
      audio.removeEventListener("volumechange", syncPlaying);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [trackIndex]);

  const filteredTracks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return OST_CATALOG.filter((candidate) => {
      const matchesCategory = category === "Todas" || candidate.categories.includes(category);
      const haystack =
        `${candidate.id} ${candidate.title} ${candidate.subtitle ?? ""}`.toLocaleLowerCase();
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [category, query]);

  function chooseTrack(nextId: string) {
    if (nextId === track.id) return;
    const audio = audioRef.current;
    resumeAfterTrackChange.current = Boolean(audio && !audio.paused && !audio.ended);
    setTrackId(nextId);
  }

  function moveTrack(step: -1 | 1) {
    const nextIndex = (trackIndex + step + OST_CATALOG.length) % OST_CATALOG.length;
    chooseTrack(OST_CATALOG[nextIndex].id);
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setError("Clique novamente em Play para iniciar a faixa."));
    } else {
      audio.pause();
    }
  }

  function seek(nextTime: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(nextTime)) return;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function changeVolume(nextVolume: number) {
    const next = Math.max(0, Math.min(1, nextVolume));
    setVolume(next);
    if (next > 0 && muted) setMuted(false);
  }

  return (
    <section
      aria-label={
        minimized ? "Player de trilha KALLISTIS minimizado" : "Player de trilha KALLISTIS"
      }
      className={
        minimized
          ? "fixed bottom-3 right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-background/95 p-1 shadow-2xl backdrop-blur-xl"
          : "fixed bottom-3 right-3 z-50 w-[min(38rem,calc(100vw-1.5rem))] rounded-2xl border border-[color:var(--border)] bg-background/95 p-3 shadow-2xl backdrop-blur-xl"
      }
    >
      <audio ref={audioRef} preload="metadata" className="sr-only" aria-hidden="true" />
      {minimized ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playing ? "Pausar trilha" : "Tocar trilha"}
            title={playing ? "Pausar trilha" : `Tocar: ${track.title}`}
            className="rounded-full p-2 text-[color:var(--gold)] hover:bg-[color:var(--ivory)]/[0.06]"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMinimized(false)}
            aria-label="Expandir player de música"
            title={`Expandir player: ${track.title}`}
            className="rounded-full p-2 text-[color:var(--ivory-dim)] hover:bg-[color:var(--ivory)]/[0.06]"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          {libraryOpen ? (
            <div className="mb-3 max-h-[min(58vh,30rem)] overflow-y-auto rounded-xl border border-[color:var(--border)] bg-card/80 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
                    Biblioteca
                  </p>
                  <p className="text-xs text-[color:var(--ivory-dim)]">
                    Trilha local para condução da mesa
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLibraryOpen(false)}
                  aria-label="Fechar biblioteca"
                  title="Fechar biblioteca"
                  className="rounded-md p-1 text-[color:var(--ivory-dim)] hover:bg-[color:var(--ivory)]/[0.06]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <label className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-lg border border-[color:var(--border)] px-2 py-1.5">
                  <Search className="h-3.5 w-3.5 text-[color:var(--ivory-dim)]" />
                  <span className="sr-only">Pesquisar faixa</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Pesquisar faixa"
                    className="min-w-0 flex-1 bg-transparent text-xs text-[color:var(--ivory)] outline-none placeholder:text-[color:var(--ivory-dim)]"
                  />
                </label>
                <select
                  aria-label="Filtrar categoria"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as "Todas" | OstCategory)}
                  className="max-w-full rounded-lg border border-[color:var(--border)] bg-background px-2 py-1.5 text-xs text-[color:var(--ivory)]"
                >
                  {OST_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                {filteredTracks.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => chooseTrack(candidate.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[color:var(--ivory)]/[0.06] ${candidate.id === track.id ? "bg-[color:var(--gold)]/[0.12]" : ""}`}
                  >
                    <span className="mr-2 font-mono text-xs text-[color:var(--gold)]">
                      {candidate.id}
                    </span>
                    <span className="text-sm text-[color:var(--ivory)]">{candidate.title}</span>
                    {candidate.subtitle ? (
                      <span className="mt-0.5 block pl-7 text-xs text-[color:var(--ivory-dim)]">
                        {candidate.subtitle}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveTrack(-1)}
              aria-label="Faixa anterior"
              title="Faixa anterior"
              className="rounded-lg p-2 text-[color:var(--ivory-dim)] hover:bg-[color:var(--ivory)]/[0.06]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playing ? "Pausar" : "Tocar"}
              title={playing ? "Pausar" : "Tocar"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--gold)] text-background hover:brightness-110"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => moveTrack(1)}
              aria-label="Próxima faixa"
              title="Próxima faixa"
              className="rounded-lg p-2 text-[color:var(--ivory-dim)] hover:bg-[color:var(--ivory)]/[0.06]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[color:var(--ivory)]">
                <span className="mr-2 font-mono text-xs text-[color:var(--gold)]">{track.id}</span>
                {track.title}
              </p>
              <p className="truncate text-xs text-[color:var(--ivory-dim)]">
                {track.subtitle ?? track.category}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLoop((value) => !value)}
              aria-label={loop ? "Desativar loop" : "Ativar loop"}
              aria-pressed={loop}
              title={loop ? "Desativar loop" : "Ativar loop"}
              className={`rounded-lg p-2 ${loop ? "bg-[color:var(--gold)]/[0.15] text-[color:var(--gold)]" : "text-[color:var(--ivory-dim)] hover:bg-[color:var(--ivory)]/[0.06]"}`}
            >
              <Repeat1 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-label={muted ? "Ativar som" : "Silenciar"}
              title={muted ? "Ativar som" : "Silenciar"}
              className="rounded-lg p-2 text-[color:var(--ivory-dim)] hover:bg-[color:var(--ivory)]/[0.06]"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setLibraryOpen((value) => !value)}
              aria-label={libraryOpen ? "Fechar biblioteca" : "Abrir biblioteca"}
              title={libraryOpen ? "Fechar biblioteca" : "Abrir biblioteca"}
              className={`rounded-lg p-2 ${libraryOpen ? "text-[color:var(--gold)]" : "text-[color:var(--ivory-dim)] hover:bg-[color:var(--ivory)]/[0.06]"}`}
            >
              <Library className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMinimized(true)}
              aria-label="Minimizar player de música"
              title="Minimizar player de música"
              className="rounded-lg p-2 text-[color:var(--ivory-dim)] hover:bg-[color:var(--ivory)]/[0.06]"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-10 text-right font-mono text-[10px] text-[color:var(--ivory-dim)]">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              disabled={!duration}
              aria-label="Posição da faixa"
              className="h-1 min-w-0 flex-1 accent-[color:var(--gold)]"
            />
            <span className="w-10 font-mono text-[10px] text-[color:var(--ivory-dim)]">
              {formatTime(duration)}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              aria-label="Volume"
              className="hidden h-1 w-16 accent-[color:var(--gold)] sm:block"
            />
          </div>
        </>
      )}
      {!minimized && error ? (
        <p className="mt-1 text-[10px] text-[color:var(--ivory-dim)]">{error}</p>
      ) : null}
    </section>
  );
}
