import { useSyncExternalStore } from "react";
import type { KittState } from "@/components/KittScanner";

// ─────────────────────────────────────────────────────────────
// KITT pulse bus
// ─────────────────────────────────────────────────────────────
// Um store mínimo (pub/sub via useSyncExternalStore) para que qualquer
// componente — player de voz, radar de pesquisa, transcrição, TTS — possa
// publicar o estado sensorial atual. O KittScanner consome esse pulso e
// reflete em tempo real, sem prop drilling.
//
// Cada "fonte" (source) publica seu próprio estado. A prioridade resolve
// conflitos quando há múltiplas fontes ativas ao mesmo tempo (ex.: voz
// escutando enquanto o radar varre).
//
// Prioridade (maior vence):
//   listening > transcribing > radar > speaking > thinking > unavailable > idle
//
// Uso:
//   setKittPulse("voice", "listening")
//   setKittPulse("voice", null)         // libera essa fonte
//   const state = useKittPulse("idle")  // fallback quando nada ativo

export type KittSource = "voice" | "radar" | "tts" | "chat" | "system";

const PRIORITY: Record<KittState, number> = {
  listening: 70,
  transcribing: 60,
  radar: 55,
  speaking: 50,
  thinking: 40,
  unavailable: 20,
  idle: 0,
};

type PulseMap = Partial<Record<KittSource, KittState>>;

let pulses: PulseMap = {};
const listeners = new Set<() => void>();
let cached: KittState | null = null;

function recompute(): KittState | null {
  let best: KittState | null = null;
  let bestPrio = -1;
  for (const v of Object.values(pulses)) {
    if (!v) continue;
    const p = PRIORITY[v];
    if (p > bestPrio) {
      bestPrio = p;
      best = v;
    }
  }
  return best;
}

function emit() {
  cached = recompute();
  for (const l of listeners) l();
}

export function setKittPulse(source: KittSource, state: KittState | null) {
  if (state === null) {
    if (pulses[source] === undefined) return;
    delete pulses[source];
  } else {
    if (pulses[source] === state) return;
    pulses = { ...pulses, [source]: state };
  }
  emit();
}

export function clearKittPulses() {
  if (Object.keys(pulses).length === 0) return;
  pulses = {};
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): KittState | null {
  return cached;
}

function getServerSnapshot(): KittState | null {
  return null;
}

/**
 * Lê o estado KITT publicado (ou null se ninguém publicou).
 * Passe um fallback para garantir um estado renderizável.
 */
export function useKittPulse(): KittState | null;
export function useKittPulse(fallback: KittState): KittState;
export function useKittPulse(fallback?: KittState): KittState | null {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return value ?? fallback ?? null;
}

// ─────────────────────────────────────────────────────────────
// Debug — expõe o mapa cru de fontes ativas e a prioridade
// ─────────────────────────────────────────────────────────────
function subscribeRaw(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getRawSnapshot(): PulseMap {
  return pulses;
}
function getRawServerSnapshot(): PulseMap {
  return {};
}
/** Mapa cru { source → state } das fontes ativas no momento. */
export function useKittPulses(): PulseMap {
  return useSyncExternalStore(subscribeRaw, getRawSnapshot, getRawServerSnapshot);
}
export function kittPriority(state: KittState): number {
  return PRIORITY[state];
}
export const KITT_SOURCES: KittSource[] = ["voice", "tts", "radar", "chat", "system"];
