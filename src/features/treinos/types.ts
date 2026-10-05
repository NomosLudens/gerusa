// Tipos do módulo Treinos / Khora.
export type SemaphoreState = "neutral" | "green" | "yellow" | "red" | "blue";

export type SetStatus = "pending" | "completed" | "skipped" | "failed";
export type SessionStatus =
  | "planned"
  | "in_progress"
  | "paused"
  | "completed"
  | "skipped"
  | "cancelled";

export type PlannedSet = {
  set_number: number;
  target_reps: number;
  target_weight: number;
  target_rir?: number;
  rest_seconds: number;
};

export type LoggedSet = {
  set_number: number;
  weight: number;
  reps: number;
  rir?: number;
  rpe?: number;
  rest_seconds: number;
  status: SetStatus;
  notes?: string;
  logged_at: string;
};

export type Exercise = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  movement_pattern?: string;
  default_rest: number;
  notes?: string;
};

export type WorkoutBlock = {
  id: string;
  block_type: "exercise" | "superset" | "warmup" | "cardio" | "mobility";
  exercise_id: string;
  planned: PlannedSet[];
  logged: LoggedSet[];
};

export type Workout = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  goal: "forca" | "hipertrofia" | "resistencia" | "mobilidade" | "cardio";
  estimated_min: number;
  status: SessionStatus;
  blocks: WorkoutBlock[];
};

export type BodySignals = {
  date: string;
  energy: "baixa" | "media" | "alta";
  sleep: "ruim" | "ok" | "bom";
  pain: "nenhuma" | "leve" | "relevante";
  available: 20 | 40 | 60;
  notes?: string;
};

export type WeekPlan = Record<number, { name: string; status: "planned" | "done" | "rest" } | null>; // 0..6
export type TrainingTemplateKey = "treinoA" | "treinoB" | "treinoC" | "treinoD";

export type TrainingTemplateExercise = {
  id: string;
  exercise_id: string;
  sets: number;
  target_reps: number;
  rest_seconds: number;
  block_type?: WorkoutBlock["block_type"];
};

export type TrainingTemplate = {
  key: TrainingTemplateKey;
  name: string;
  day: number | null;
  goal: Workout["goal"];
  estimated_min: number;
  exercises: TrainingTemplateExercise[];
};

export type TrainingState = {
  exercises: Exercise[];
  todayWorkout: Workout | null;
  history: Workout[];
  signals: BodySignals | null;
  week: WeekPlan;
  templates: Record<TrainingTemplateKey, TrainingTemplate>;
};

export type BlockSpec = {
  exercise_id: string;
  sets: number;
  target_reps: number;
  rest_seconds: number;
  block_type?: WorkoutBlock["block_type"];
};
