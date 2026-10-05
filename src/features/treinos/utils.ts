// Utilitários puros do módulo Treinos.
import type { BlockSpec, BodySignals, SemaphoreState, WorkoutBlock } from "./types";

export const todayIso = () => new Date().toISOString().slice(0, 10);

export function makeBlocksDetailed(specs: BlockSpec[]): WorkoutBlock[] {
  return specs.map((sp) => ({
    id: crypto.randomUUID(),
    block_type: sp.block_type ?? "exercise",
    exercise_id: sp.exercise_id,
    planned: Array.from({ length: sp.sets }, (_, i) => ({
      set_number: i + 1,
      target_reps: sp.target_reps,
      target_weight: 0,
      target_rir: 0,
      rest_seconds: sp.rest_seconds,
    })),
    logged: [],
  }));
}

export function inferSemaphore(s: BodySignals | null): SemaphoreState {
  if (!s) return "neutral";
  if (s.pain === "relevante") return "red";
  if (s.energy === "baixa" && s.sleep === "ruim") return "red";
  if (s.sleep === "ruim" || s.energy === "baixa" || s.pain === "leve") return "yellow";
  if (s.available === 20) return "blue";
  if (s.energy === "alta" && s.sleep === "bom") return "green";
  return "yellow";
}
