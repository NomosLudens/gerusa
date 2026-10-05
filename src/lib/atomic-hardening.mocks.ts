export interface MockHandlerArgs {
  p_source_ids?: string[];
  p_next_level?: string;
  p_parent_nivel?: string;
  simular_ja_processado?: boolean;
  p_event_type?: string;
  p_source_app?: string;
  p_status?: string;
  p_promovido_para?: string | null;
}

// Mocks para simular o comportamento do Postgres hardened no Vitest
export async function promote_sediment_batch_atomic_mock_handler(args: MockHandlerArgs) {
  const { p_source_ids, p_next_level, p_parent_nivel, simular_ja_processado } = args;

  if (!p_source_ids || p_source_ids.length !== 5) {
    return {
      data: null,
      error: { message: "Lote inválido: deve conter exatamente 5 sedimentos." },
    };
  }

  if (simular_ja_processado) {
    return {
      data: null,
      error: { message: "Lote inválido ou já processado. Verifique status, thread e propriedade." },
    };
  }

  if (p_parent_nivel === "short_term" && p_next_level !== "working") {
    return { data: null, error: { message: "Transição inválida: short_term -> working." } };
  }

  // Simulação de sucesso
  return {
    data: { ok: true, novo_id: "new-sed-uuid" },
    error: null,
  };
}

export async function create_handoff_candidate_atomic_mock_handler(args: {
  p_event_type: string;
  p_source_app: string;
}) {
  const { p_event_type, p_source_app } = args;

  if (p_event_type !== "handoff.candidate") {
    return { data: null, error: { message: "Tipo de evento inválido." } };
  }

  if (p_source_app !== "kallistis-clean") {
    return { data: null, error: { message: "Aplicativo de origem inválido." } };
  }

  return {
    data: { ok: true, event_id: "mock-event-id", review_id: "mock-review-id" },
    error: null,
  };
}

export async function confirm_sediment_atomic_mock_handler(args: {
  p_status: string;
  p_promovido_para: string | null;
}) {
  const { p_status, p_promovido_para } = args;

  // Idempotency: status = 'confirmado' and promovido_para IS NOT NULL
  if (p_status === "confirmado" && p_promovido_para !== null) {
    return {
      data: { ok: true, idempotent: true, memory_id: p_promovido_para },
      error: null,
    };
  }

  // Otherwise, must be 'em_revisao' and promovido_para IS NULL
  if (p_status !== "em_revisao" || p_promovido_para !== null) {
    return {
      data: null,
      error: { message: "Sedimento não está disponível para confirmação." },
    };
  }

  return {
    data: { ok: true, memory_id: "new-memory-id" },
    error: null,
  };
}
