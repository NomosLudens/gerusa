-- ============================================================================
-- Atomic Transactions and Stored Procedures for Kaline Clean (Hardened)
-- ============================================================================
-- Regras deste arquivo:
-- - apenas objetos novos;
-- - SECURITY DEFINER com caminhos de busca seguros;
-- - tratamento robusto de erros e integridade referencial;
-- - validações rígidas de usuário para evitar spoofing;
-- - estratégia correta de locking (FOR UPDATE em linhas individuais);
-- - validação de lote de 5 elementos;
-- - validação de progressão de nível;
-- - idempotência total.
-- ============================================================================

-- Drop functions first to prevent signature overload compilation errors
DROP FUNCTION IF EXISTS public.approve_memory_candidate_atomic(uuid, text, text, text, text, text[], integer);
DROP FUNCTION IF EXISTS public.confirm_sediment_atomic(uuid, text, text, integer, text[]);
DROP FUNCTION IF EXISTS public.create_handoff_candidate_atomic(text, text, timestamp with time zone, text, text, jsonb);
DROP FUNCTION IF EXISTS public.promote_sediment_batch_atomic(uuid, text, uuid[], text, text, numeric, text, text);

-- 1. approve_memory_candidate_atomic
CREATE OR REPLACE FUNCTION public.approve_memory_candidate_atomic(
    p_candidate_id uuid,
    p_title text,
    p_content text,
    p_domain text,
    p_sensitivity text,
    p_tags text[],
    p_importance integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_memoria_id uuid;
    v_candidate record;
    v_now timestamptz := now();
BEGIN
    -- Defense-in-depth: reject null authentication
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- Basic validation
    IF char_length(trim(p_title)) = 0 OR char_length(trim(p_content)) = 0 THEN
        RAISE EXCEPTION 'Título e conteúdo não podem ser vazios.' USING ERRCODE = '22023';
    END IF;

    IF p_importance < 1 OR p_importance > 3 THEN
        RAISE EXCEPTION 'Importância deve estar entre 1 e 3.' USING ERRCODE = '22023';
    END IF;

    -- Check candidate exists and lock row
    SELECT * INTO v_candidate
    FROM public.memory_candidates
    WHERE id = p_candidate_id
      AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate not found or not owned by user.' USING ERRCODE = 'P0002';
    END IF;

    -- Idempotency check
    IF v_candidate.status = 'approved' AND v_candidate.approved_memory_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'memory_id', v_candidate.approved_memory_id
        );
    END IF;

    IF v_candidate.status <> 'pending' THEN
        RAISE EXCEPTION 'Candidate is not in pending status.' USING ERRCODE = 'P0003';
    END IF;

    -- Insert into jardim_memorias
    INSERT INTO public.jardim_memorias (
        user_id,
        title,
        body,
        source,
        source_ref,
        category,
        tags,
        importance,
        next_review_at
    ) VALUES (
        v_user_id,
        p_title,
        p_content,
        v_candidate.source,
        v_candidate.id,
        p_domain,
        p_tags,
        p_importance,
        v_now
    )
    RETURNING id INTO v_memoria_id;

    -- Update memory_candidates
    UPDATE public.memory_candidates
    SET
        title = p_title,
        content = p_content,
        domain = p_domain,
        sensitivity = p_sensitivity,
        status = 'approved',
        reviewed_at = v_now,
        reviewed_by = v_user_id,
        approved_memory_id = v_memoria_id,
        updated_at = v_now
    WHERE id = p_candidate_id;

    RETURN jsonb_build_object(
        'ok', true,
        'memory_id', v_memoria_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_memory_candidate_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_memory_candidate_atomic TO authenticated;


-- 2. confirm_sediment_atomic
CREATE OR REPLACE FUNCTION public.confirm_sediment_atomic(
    p_sedimento_id uuid,
    p_title text,
    p_content text,
    p_importance integer,
    p_tags text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_memoria_id uuid;
    v_sed record;
    v_now timestamptz := now();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '42501';
    END IF;

    IF char_length(trim(p_title)) = 0 OR char_length(trim(p_content)) = 0 THEN
        RAISE EXCEPTION 'Título e conteúdo não podem ser vazios.' USING ERRCODE = '22023';
    END IF;

    IF p_importance < 1 OR p_importance > 3 THEN
        RAISE EXCEPTION 'Importância deve estar entre 1 e 3.' USING ERRCODE = '22023';
    END IF;

    IF p_tags IS NOT NULL AND array_length(p_tags, 1) > 20 THEN
        RAISE EXCEPTION 'Limite de tags excedido (máximo 20).' USING ERRCODE = '22023';
    END IF;

    -- Check sediment and lock row
    SELECT * INTO v_sed
    FROM public.sedimentos
    WHERE id = p_sedimento_id
      AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sediment not found or not owned by user.' USING ERRCODE = 'P0002';
    END IF;

    -- Idempotency check
    IF v_sed.status = 'confirmado' AND v_sed.promovido_para IS NOT NULL THEN
        RETURN jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'memory_id', v_sed.promovido_para
        );
    END IF;

    -- Strict validation: must be 'em_revisao' and not yet promoted
    IF v_sed.status <> 'em_revisao' OR v_sed.promovido_para IS NOT NULL THEN
        RAISE EXCEPTION 'Sedimento não está disponível para confirmação.' USING ERRCODE = 'P0004';
    END IF;

    -- Insert into jardim_memorias
    INSERT INTO public.jardim_memorias (
        user_id,
        title,
        body,
        importance,
        tags
    ) VALUES (
        v_user_id,
        p_title,
        p_content,
        p_importance,
        p_tags
    )
    RETURNING id INTO v_memoria_id;

    -- Update sediment status
    UPDATE public.sedimentos
    SET
        status = 'confirmado',
        promovido_para = v_memoria_id,
        promovido_tipo = 'jardim_memoria',
        revisado_at = v_now
    WHERE id = p_sedimento_id;

    RETURN jsonb_build_object(
        'ok', true,
        'memory_id', v_memoria_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_sediment_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_sediment_atomic TO authenticated;


-- 3. create_handoff_candidate_atomic
CREATE OR REPLACE FUNCTION public.create_handoff_candidate_atomic(
    p_event_type text,
    p_source_app text,
    p_occurred_at timestamp with time zone,
    p_title text,
    p_body text,
    p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_event_id uuid;
    v_review_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- Allowlist for event_type and source_app
    IF p_event_type <> 'handoff.candidate' THEN
        RAISE EXCEPTION 'Tipo de evento inválido.' USING ERRCODE = '22023';
    END IF;

    IF p_source_app <> 'kaline-clean' THEN
        RAISE EXCEPTION 'Aplicativo de origem inválido.' USING ERRCODE = '22023';
    END IF;

    IF pg_column_size(p_payload) > 102400 THEN -- 100KB
        RAISE EXCEPTION 'Payload excedeu o limite de tamanho permitido.' USING ERRCODE = '22023';
    END IF;

    -- Insert into kline_events
    INSERT INTO public.kline_events (
        user_id,
        event_type,
        source_app,
        occurred_at,
        title,
        body,
        payload
    ) VALUES (
        v_user_id,
        p_event_type,
        p_source_app,
        p_occurred_at,
        p_title,
        p_body,
        p_payload
    )
    RETURNING id INTO v_event_id;

    -- Insert into kline_event_review_state
    INSERT INTO public.kline_event_review_state (
        user_id,
        event_id,
        status
    ) VALUES (
        v_user_id,
        v_event_id,
        'pending'
    )
    RETURNING id INTO v_review_id;

    RETURN jsonb_build_object(
        'ok', true,
        'event_id', v_event_id,
        'review_id', v_review_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_handoff_candidate_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_handoff_candidate_atomic TO authenticated;


-- 4. promote_sediment_batch_atomic
CREATE OR REPLACE FUNCTION public.promote_sediment_batch_atomic(
    p_thread_id uuid,
    p_next_level text,
    p_source_ids uuid[],
    p_hipotese text,
    p_resumo text,
    p_confianca numeric,
    p_parent_status text DEFAULT 'confirmado',
    p_new_status text DEFAULT 'em_revisao'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_novo_id uuid;
    v_count integer;
    v_distinct_nivels integer;
    v_parent_nivel public.sedimento_nivel;
BEGIN
    -- 0. Authentication
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 1. Strict status validation
    IF p_parent_status NOT IN ('confirmado', 'em_revisao') OR p_new_status <> 'em_revisao' THEN
        RAISE EXCEPTION 'Combinação de status inválida para promoção.' USING ERRCODE = '22023';
    END IF;

    -- 2. Validate input batch
    IF p_source_ids IS NULL OR array_length(p_source_ids, 1) <> 5 THEN
        RAISE EXCEPTION 'Lote inválido: deve conter exatamente 5 sedimentos.' USING ERRCODE = '22023';
    END IF;

    IF (SELECT count(DISTINCT x) FROM unnest(p_source_ids) x) <> 5 THEN
        RAISE EXCEPTION 'Lote inválido: IDs duplicados.' USING ERRCODE = '22023';
    END IF;

    IF p_confianca < 0 OR p_confianca > 3 THEN
        RAISE EXCEPTION 'Confiança deve estar entre 0 e 3.' USING ERRCODE = '22023';
    END IF;

    IF char_length(trim(p_hipotese)) = 0 THEN
        RAISE EXCEPTION 'Hipótese não pode ser vazia.' USING ERRCODE = '22023';
    END IF;

    -- 3. Lock and validate all 5 parents with strict security and scoping via CTE
    WITH locked_rows AS (
        SELECT id, nivel
        FROM public.sedimentos
        WHERE user_id = v_user_id
          AND thread_id = p_thread_id
          AND id = ANY(p_source_ids)
          AND status = p_parent_status::public.sedimento_status
          AND promovido_para IS NULL
        FOR UPDATE
    )
    SELECT count(*), count(DISTINCT nivel), max(nivel)
    INTO v_count, v_distinct_nivels, v_parent_nivel
    FROM locked_rows;

    IF v_count <> 5 THEN
        RAISE EXCEPTION 'Lote inválido ou já processado. Verifique status, thread e propriedade.' USING ERRCODE = 'P0004';
    END IF;

    IF v_distinct_nivels <> 1 THEN
        RAISE EXCEPTION 'Lote inválido: todos os sedimentos devem ser do mesmo nível.' USING ERRCODE = '22023';
    END IF;

    -- 5. Validate level progression (Ponytail Allowlist)
    CASE v_parent_nivel
        WHEN 'iconic' THEN IF p_next_level <> 'echoic' THEN RAISE EXCEPTION 'Transição inválida: iconic -> echoic.'; END IF;
        WHEN 'echoic' THEN IF p_next_level <> 'short_term' THEN RAISE EXCEPTION 'Transição inválida: echoic -> short_term.'; END IF;
        WHEN 'short_term' THEN IF p_next_level <> 'working' THEN RAISE EXCEPTION 'Transição inválida: short_term -> working.'; END IF;
        WHEN 'working' THEN IF p_next_level <> 'prospective' THEN RAISE EXCEPTION 'Transição inválida: working -> prospective.'; END IF;
        WHEN 'prospective' THEN IF p_next_level <> 'episodic' THEN RAISE EXCEPTION 'Transição inválida: prospective -> episodic.'; END IF;
        WHEN 'episodic' THEN IF p_next_level <> 'semantic' THEN RAISE EXCEPTION 'Transição inválida: episodic -> semantic.'; END IF;
        WHEN 'semantic' THEN IF p_next_level <> 'procedural' THEN RAISE EXCEPTION 'Transição inválida: semantic -> procedural.'; END IF;
        ELSE RAISE EXCEPTION 'Nível terminal ou transição não permitida.';
    END CASE;

    -- 6. Insert new sediment
    INSERT INTO public.sedimentos (
        user_id,
        thread_id,
        nivel,
        status,
        source_kind,
        source_ids,
        hipotese,
        resumo,
        confianca
    ) VALUES (
        v_user_id,
        p_thread_id,
        p_next_level::public.sedimento_nivel,
        p_new_status::public.sedimento_status,
        'sedimento',
        p_source_ids,
        p_hipotese,
        p_resumo,
        p_confianca
    )
    RETURNING id INTO v_novo_id;

    -- 7. Link parents to child
    UPDATE public.sedimentos
    SET
        promovido_para = v_novo_id,
        promovido_tipo = 'sedimento'
    WHERE id = ANY(p_source_ids);

    RETURN jsonb_build_object(
        'ok', true,
        'novo_id', v_novo_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_sediment_batch_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_sediment_batch_atomic TO authenticated;
