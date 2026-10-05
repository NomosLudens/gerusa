import { describe, it, expect } from "vitest";
import {
  promote_sediment_batch_atomic_mock_handler,
  create_handoff_candidate_atomic_mock_handler,
  confirm_sediment_atomic_mock_handler,
} from "./atomic-hardening.mocks";

// Este arquivo testa a LÓGICA de tratamento de erros e idempotência das RPCs atômicas
// simulando as respostas que o Postgres (hardened) retornaria.

describe("Atomic Hardening - RPC Simulation", () => {
  describe("promote_sediment_batch_atomic", () => {
    it("1. rejeita lote com menos de 5 itens", async () => {
      const { data, error } = await promote_sediment_batch_atomic_mock_handler({
        p_source_ids: ["id1", "id2", "id3", "id4"], // 4 itens
        p_next_level: "working",
      });

      expect(error?.message).toContain("Lote inválido: deve conter exatamente 5");
      expect(data).toBeNull();
    });

    it("2. rejeita transição de nível inválida (ex: short_term para episodic)", async () => {
      const { data, error } = await promote_sediment_batch_atomic_mock_handler({
        p_source_ids: ["id1", "id2", "id3", "id4", "id5"],
        p_parent_nivel: "short_term",
        p_next_level: "episodic", // Salto inválido (deve ser working)
      });

      expect(error?.message).toContain("Transição inválida: short_term -> working");
      expect(data).toBeNull();
    });

    it("3. permite transição válida (ex: short_term para working)", async () => {
      const { data, error } = await promote_sediment_batch_atomic_mock_handler({
        p_source_ids: ["id1", "id2", "id3", "id4", "id5"],
        p_parent_nivel: "short_term",
        p_next_level: "working",
      });

      expect(error).toBeNull();
      expect(data?.ok).toBe(true);
      expect(data?.novo_id).toBeDefined();
    });

    it("4. impede concorrência (simula 'já processado')", async () => {
      // Primeira chamada ok
      await promote_sediment_batch_atomic_mock_handler({
        p_source_ids: ["id1", "id2", "id3", "id4", "id5"],
        p_next_level: "working",
      });

      // Segunda chamada com mesmos IDs deve falhar (promovido_para já estaria preenchido)
      const { data, error } = await promote_sediment_batch_atomic_mock_handler({
        p_source_ids: ["id1", "id2", "id3", "id4", "id5"],
        p_next_level: "working",
        simular_ja_processado: true,
      });

      expect(error?.message).toContain("Lote inválido ou já processado");
      expect(data).toBeNull();
    });
  });

  describe("create_handoff_candidate_atomic (Allowlist)", () => {
    it("5. aceita tipo de evento e app de origem válidos", async () => {
      const { data, error } = await create_handoff_candidate_atomic_mock_handler({
        p_event_type: "handoff.candidate",
        p_source_app: "kallistis-clean",
      });

      expect(error).toBeNull();
      expect(data?.ok).toBe(true);
      expect(data?.event_id).toBe("mock-event-id");
    });

    it("6. rejeita tipo de evento inválido", async () => {
      const { data, error } = await create_handoff_candidate_atomic_mock_handler({
        p_event_type: "invalid_type",
        p_source_app: "kallistis-clean",
      });

      expect(error?.message).toContain("Tipo de evento inválido");
      expect(data).toBeNull();
    });

    it("7. rejeita aplicativo de origem inválido", async () => {
      const { data, error } = await create_handoff_candidate_atomic_mock_handler({
        p_event_type: "handoff.candidate",
        p_source_app: "invalid_app",
      });

      expect(error?.message).toContain("Aplicativo de origem inválido");
      expect(data).toBeNull();
    });
  });

  describe("confirm_sediment_atomic (State Block)", () => {
    it("8. confirmado + promovido_para não nulo retorna idempotente com sucesso", async () => {
      const { data, error } = await confirm_sediment_atomic_mock_handler({
        p_status: "confirmado",
        p_promovido_para: "memoria-existente-123",
      });

      expect(error).toBeNull();
      expect(data?.ok).toBe(true);
      expect(data?.idempotent).toBe(true);
      expect(data?.memory_id).toBe("memoria-existente-123");
    });

    it("9. em_revisao + promovido_para nulo permite confirmar", async () => {
      const { data, error } = await confirm_sediment_atomic_mock_handler({
        p_status: "em_revisao",
        p_promovido_para: null,
      });

      expect(error).toBeNull();
      expect(data?.ok).toBe(true);
      expect(data?.memory_id).toBe("new-memory-id");
    });

    it("10. status descartado deve rejeitar", async () => {
      const { data, error } = await confirm_sediment_atomic_mock_handler({
        p_status: "descartado",
        p_promovido_para: null,
      });

      expect(error?.message).toContain("Sedimento não está disponível para confirmação");
      expect(data).toBeNull();
    });

    it("11. sedimento já promovido para outra memória deve rejeitar", async () => {
      const { data, error } = await confirm_sediment_atomic_mock_handler({
        p_status: "em_revisao",
        p_promovido_para: "outra-memoria",
      });

      expect(error?.message).toContain("Sedimento não está disponível para confirmação");
      expect(data).toBeNull();
    });
  });
});
