// Persistência local do estado de treinos.
import { SEED_EXERCISES } from "./data";
import type { TrainingState, TrainingTemplate, TrainingTemplateKey, WeekPlan } from "./types";

const STORAGE_KEY = "kallistis.treinos.v1";

const DEFAULT_TEMPLATE_SPECS: Record<
  TrainingTemplateKey,
  Omit<TrainingTemplate, "exercises"> & {
    exercises: Omit<TrainingTemplate["exercises"][number], "id">[];
  }
> = {
  treinoA: {
    key: "treinoA",
    name: "Treino A",
    day: null,
    goal: "hipertrofia",
    estimated_min: 60,
    exercises: [
      { exercise_id: "supino-inclinado-halter", sets: 3, target_reps: 13, rest_seconds: 50 },
      { exercise_id: "puxada-alta-aberta", sets: 3, target_reps: 13, rest_seconds: 50 },
      { exercise_id: "peck-deck", sets: 3, target_reps: 13, rest_seconds: 50 },
    ],
  },
  treinoB: {
    key: "treinoB",
    name: "Treino B",
    day: null,
    goal: "hipertrofia",
    estimated_min: 55,
    exercises: [
      { exercise_id: "elevacao-lateral", sets: 3, target_reps: 13, rest_seconds: 30 },
      { exercise_id: "triceps-corda", sets: 3, target_reps: 13, rest_seconds: 30 },
      { exercise_id: "rosca-pulley-barra", sets: 3, target_reps: 13, rest_seconds: 30 },
    ],
  },
  treinoC: {
    key: "treinoC",
    name: "Treino C",
    day: null,
    goal: "hipertrofia",
    estimated_min: 70,
    exercises: [
      {
        exercise_id: "agachamento-livre",
        sets: 3,
        target_reps: 25,
        rest_seconds: 60,
        block_type: "warmup",
      },
      { exercise_id: "cadeira-extensora", sets: 3, target_reps: 16, rest_seconds: 50 },
      { exercise_id: "leg-press", sets: 4, target_reps: 16, rest_seconds: 120 },
    ],
  },
  treinoD: {
    key: "treinoD",
    name: "Treino D",
    day: null,
    goal: "mobilidade",
    estimated_min: 40,
    exercises: [
      { exercise_id: "desenvolvimento-ombro-halter", sets: 3, target_reps: 12, rest_seconds: 60 },
      { exercise_id: "remada-sentada", sets: 3, target_reps: 12, rest_seconds: 60 },
      {
        exercise_id: "abdominais-escolha",
        sets: 3,
        target_reps: 30,
        rest_seconds: 45,
        block_type: "mobility",
      },
    ],
  },
};

export function defaultTemplates(): TrainingState["templates"] {
  return Object.fromEntries(
    Object.entries(DEFAULT_TEMPLATE_SPECS).map(([key, template]) => [
      key,
      {
        ...template,
        exercises: template.exercises.map((exercise) => ({ ...exercise, id: crypto.randomUUID() })),
      },
    ]),
  ) as TrainingState["templates"];
}

export function weekFromTemplates(templates: TrainingState["templates"]): WeekPlan {
  const week: WeekPlan = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  Object.values(templates).forEach((template) => {
    if (template.day !== null) week[template.day] = { name: template.name, status: "planned" };
  });
  return week;
}

export function defaultState(): TrainingState {
  return {
    exercises: SEED_EXERCISES,
    todayWorkout: null,
    history: [],
    signals: null,
    week: weekFromTemplates(defaultTemplates()),
    templates: defaultTemplates(),
  };
}

export function loadState(): TrainingState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as TrainingState;
    if (!parsed.exercises || parsed.exercises.length === 0) parsed.exercises = SEED_EXERCISES;
    const existingIds = new Set(parsed.exercises.map((e) => e.id));
    const missing = SEED_EXERCISES.filter((e) => !existingIds.has(e.id));
    if (missing.length > 0) parsed.exercises = [...parsed.exercises, ...missing];
    parsed.templates = { ...defaultTemplates(), ...(parsed.templates ?? {}) };
    parsed.week = weekFromTemplates(parsed.templates);
    return parsed;
  } catch {
    return defaultState();
  }
}

export function saveState(s: TrainingState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
