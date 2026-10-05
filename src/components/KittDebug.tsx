import {
  KITT_SOURCES,
  kittPriority,
  useKittPulse,
  useKittPulses,
  type KittSource,
} from "@/lib/kitt-pulse";

interface KittDebugProps {
  className?: string;
  compact?: boolean;
}

/**
 * Painel de debug do KITT: lista todas as fontes (voice/tts/radar/chat/system),
 * o estado publicado por cada uma e qual delas venceu a prioridade.
 */
export function KittDebug({ className, compact }: KittDebugProps) {
  const pulses = useKittPulses();
  const resolved = useKittPulse("idle");
  const resolvedPrio = kittPriority(resolved);

  // Determina qual fonte está "vencendo" (primeira com o estado resolvido).
  let winnerSource: KittSource | null = null;
  for (const src of KITT_SOURCES) {
    if (pulses[src] === resolved) {
      winnerSource = src;
      break;
    }
  }

  return (
    <div
      className={
        "rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[10px] text-[#F3EBDD]/80 " +
        (className ?? "")
      }
      role="status"
      aria-label="KITT debug"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="uppercase tracking-[0.22em] text-[#F3EBDD]/45">KITT · debug</span>
        <span className="uppercase tracking-[0.22em]">
          <span className="text-[#F3EBDD]/45">final: </span>
          <span className="text-[#C98A65]">{resolved}</span>
          <span className="text-[#F3EBDD]/35"> · prio {resolvedPrio}</span>
        </span>
      </div>
      <ul className={compact ? "grid grid-cols-5 gap-1" : "space-y-1"}>
        {KITT_SOURCES.map((src) => {
          const state = pulses[src] ?? null;
          const isWinner = src === winnerSource && state !== null;
          return (
            <li
              key={src}
              className={
                "flex items-center justify-between gap-2 px-2 py-1 rounded border " +
                (isWinner
                  ? "border-[#C98A65]/60 bg-[#C98A65]/10"
                  : state
                    ? "border-white/15"
                    : "border-white/5 opacity-50")
              }
            >
              <span className="uppercase tracking-[0.18em] text-[#F3EBDD]/55">{src}</span>
              <span className={state ? "text-[#F3EBDD]" : "text-[#F3EBDD]/30"}>
                {state ?? "—"}
                {state ? <span className="text-[#F3EBDD]/35"> · {kittPriority(state)}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default KittDebug;
