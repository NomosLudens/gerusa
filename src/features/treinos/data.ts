// Dados estáticos do módulo Treinos: biblioteca semente, filtros, metadados.
import type { BlockSpec, Exercise, SemaphoreState } from "./types";

export const SEED_EXERCISES: Exercise[] = [
  // Peito
  {
    id: "supino-inclinado-halter",
    name: "Supino inclinado (halteres)",
    muscle_group: "Peito",
    equipment: "Halter",
    default_rest: 50,
  },
  {
    id: "peck-deck",
    name: "Peck Deck",
    muscle_group: "Peito",
    equipment: "Máquina",
    default_rest: 50,
  },
  {
    id: "crossover",
    name: "Crossover",
    muscle_group: "Peito",
    equipment: "Cabo",
    default_rest: 50,
  },
  // Costas
  {
    id: "puxada-alta-aberta",
    name: "Puxada alta aberta",
    muscle_group: "Costas",
    equipment: "Cabo",
    default_rest: 50,
  },
  {
    id: "puxada-alta-triangulo",
    name: "Puxada alta triângulo",
    muscle_group: "Costas",
    equipment: "Cabo",
    default_rest: 50,
  },
  {
    id: "remada-sentada",
    name: "Remada sentada",
    muscle_group: "Costas",
    equipment: "Máquina",
    default_rest: 50,
  },
  // Trapézio
  {
    id: "encolhimento-halter",
    name: "Encolhimento com halteres",
    muscle_group: "Trapézio",
    equipment: "Halter",
    default_rest: 50,
  },
  // Ombros
  {
    id: "elevacao-lateral",
    name: "Elevação lateral (halteres)",
    muscle_group: "Ombro",
    equipment: "Halter",
    default_rest: 30,
  },
  {
    id: "elevacao-frontal",
    name: "Elevação frontal (halteres)",
    muscle_group: "Ombro",
    equipment: "Halter",
    default_rest: 50,
  },
  {
    id: "desenvolvimento-ombro-halter",
    name: "Desenvolvimento de ombro (halteres)",
    muscle_group: "Ombro",
    equipment: "Halter",
    default_rest: 50,
  },
  // Bíceps
  {
    id: "rosca-pulley-barra",
    name: "Rosca pulley (barra reta)",
    muscle_group: "Bíceps",
    equipment: "Cabo",
    default_rest: 30,
  },
  {
    id: "rosca-barra-w",
    name: "Rosca barra W (em pé)",
    muscle_group: "Bíceps",
    equipment: "Barra W",
    default_rest: 50,
  },
  {
    id: "rosca-concentrada",
    name: "Rosca concentrada unilateral",
    muscle_group: "Bíceps",
    equipment: "Halter",
    default_rest: 50,
  },
  // Tríceps
  {
    id: "triceps-corda",
    name: "Tríceps corda (polia alta)",
    muscle_group: "Tríceps",
    equipment: "Cabo",
    default_rest: 30,
  },
  {
    id: "triceps-frances",
    name: "Tríceps francês",
    muscle_group: "Tríceps",
    equipment: "Halter",
    default_rest: 50,
  },
  // Pernas
  {
    id: "agachamento-livre",
    name: "Agachamento livre (peso corporal)",
    muscle_group: "Pernas",
    equipment: "Peso corporal",
    default_rest: 60,
  },
  {
    id: "cadeira-extensora",
    name: "Cadeira extensora",
    muscle_group: "Pernas",
    equipment: "Máquina",
    default_rest: 50,
  },
  {
    id: "mesa-flexora",
    name: "Mesa flexora",
    muscle_group: "Posterior",
    equipment: "Máquina",
    default_rest: 50,
  },
  {
    id: "leg-press",
    name: "Leg press (amplitude máxima)",
    muscle_group: "Pernas",
    equipment: "Máquina",
    default_rest: 120,
  },
  {
    id: "cadeira-abdutora",
    name: "Cadeira abdutora",
    muscle_group: "Glúteos",
    equipment: "Máquina",
    default_rest: 50,
  },
  {
    id: "cadeira-adutora",
    name: "Cadeira adutora",
    muscle_group: "Pernas",
    equipment: "Máquina",
    default_rest: 50,
  },
  {
    id: "panturrilha-sentado",
    name: "Panturrilha gêmeos sentado",
    muscle_group: "Pernas",
    equipment: "Máquina",
    default_rest: 50,
  },
  {
    id: "agachamento-sumo",
    name: "Agachamento sumô (respeite amplitude)",
    muscle_group: "Pernas",
    equipment: "Halter",
    default_rest: 50,
  },
  // Core
  {
    id: "abdominais-escolha",
    name: "Abdominais à escolha (peso corporal)",
    muscle_group: "Core",
    equipment: "Peso corporal",
    default_rest: 40,
  },
  // HIIT D:321
  {
    id: "hiit-d321-moderado",
    name: "HIIT D:321 · 3 min moderado (base aeróbica, controle de respiração)",
    muscle_group: "Cardio",
    equipment: "Livre",
    default_rest: 0,
  },
  {
    id: "hiit-d321-intenso",
    name: "HIIT D:321 · 2 min intenso (zona de queima)",
    muscle_group: "Cardio",
    equipment: "Livre",
    default_rest: 0,
  },
  {
    id: "hiit-d321-allout",
    name: "HIIT D:321 · 1 min all-out (esforço total, foco na potência)",
    muscle_group: "Cardio",
    equipment: "Livre",
    default_rest: 0,
  },
];

export const MUSCLE_FILTERS = [
  "Peito",
  "Costas",
  "Ombro",
  "Bíceps",
  "Tríceps",
  "Pernas",
  "Posterior",
  "Glúteos",
  "Trapézio",
  "Core",
  "Cardio",
];

export const HIIT_D321_BLOCKS: BlockSpec[] = [
  {
    exercise_id: "hiit-d321-moderado",
    sets: 1,
    target_reps: 3,
    rest_seconds: 0,
    block_type: "cardio",
  },
  {
    exercise_id: "hiit-d321-intenso",
    sets: 1,
    target_reps: 2,
    rest_seconds: 0,
    block_type: "cardio",
  },
  {
    exercise_id: "hiit-d321-allout",
    sets: 1,
    target_reps: 1,
    rest_seconds: 0,
    block_type: "cardio",
  },
];

export const PRESENCE_BY_STATE: Record<SemaphoreState, { title: string; sub: string }> = {
  neutral: {
    title: "Khora acompanha o gesto.",
    sub: "Escolha o treino e registre com honestidade. O corpo real vale mais que o plano perfeito.",
  },
  green: {
    title: "Hoje dá para avançar.",
    sub: "Sono e energia ok. Mantenha técnica, suba carga com método.",
  },
  yellow: {
    title: "Vamos com controle.",
    sub: "Energia ou sono baixos. Reduza séries de falha, mantenha carga.",
  },
  red: {
    title: "Reduza escopo. Segurança primeiro.",
    sub: "Dor relevante ou exaustão. Mobilidade, técnica leve, sem PR.",
  },
  blue: {
    title: "Dia de recolhimento.",
    sub: "Caminhada leve, mobilidade, recuperação. Treino pesado fica para amanhã.",
  },
};

export const SEMAPHORE_META: Record<
  SemaphoreState,
  { label: string; color: string; ring: string; glow: string }
> = {
  neutral: {
    label: "Sem leitura",
    color: "bg-[#F3EBDD]/30",
    ring: "ring-white/10",
    glow: "",
  },
  green: {
    label: "Pronto para treinar",
    color: "bg-[#16A34A]",
    ring: "ring-[#16A34A]/40",
    glow: "shadow-[0_0_6px_rgba(22,163,74,0.7)]",
  },
  yellow: {
    label: "Atenção",
    color: "bg-[#D9A441]",
    ring: "ring-[#D9A441]/40",
    glow: "shadow-[0_0_6px_rgba(217,164,65,0.7)]",
  },
  red: {
    label: "Contenção",
    color: "bg-[#BE123C]",
    ring: "ring-[#BE123C]/40",
    glow: "shadow-[0_0_6px_rgba(190,18,60,0.7)]",
  },
  blue: {
    label: "Recolhimento",
    color: "bg-[#2563EB]",
    ring: "ring-[#2563EB]/40",
    glow: "shadow-[0_0_6px_rgba(37,99,235,0.7)]",
  },
};

export const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
