-- Atomic memory operations for the private Domain API.
-- p_user_id is supplied by the already-authenticated backend context.
-- These functions deliberately do not depend on an external auth provider and are not browser APIs.

CREATE OR REPLACE FUNCTION approve_memory_candidate_atomic(
    p_user_id uuid,
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
AS $$
DECLARE
    v_candidate memory_candidates%ROWTYPE;
    v_memory_id uuid;
    v_now timestamptz := now();
BEGIN
    IF p_user_id IS NULL OR p_candidate_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated user and candidate are required' USING ERRCODE = '42501';
    END IF;
    IF char_length(trim(p_title)) = 0 OR char_length(trim(p_content)) = 0 THEN
        RAISE EXCEPTION 'Title and content cannot be empty' USING ERRCODE = '22023';
    END IF;
    IF p_importance < 1 OR p_importance > 3 THEN
        RAISE EXCEPTION 'Importance must be between 1 and 3' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_candidate
    FROM memory_candidates
    WHERE id = p_candidate_id AND user_id = p_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate not found or not owned by user' USING ERRCODE = 'P0002';
    END IF;
    IF v_candidate.status = 'approved' AND v_candidate.approved_memory_id IS NOT NULL THEN
        RETURN jsonb_build_object('ok', true, 'idempotent', true, 'memory_id', v_candidate.approved_memory_id);
    END IF;
    IF v_candidate.status <> 'pending' THEN
        RAISE EXCEPTION 'Candidate is not pending' USING ERRCODE = 'P0003';
    END IF;

    INSERT INTO jardim_memorias (user_id, title, body, source, source_ref, category, tags, importance, next_review_at)
    VALUES (p_user_id, p_title, p_content, v_candidate.source, v_candidate.id, p_domain, coalesce(p_tags, '{}'), p_importance, v_now)
    RETURNING id INTO v_memory_id;

    UPDATE memory_candidates
    SET title = p_title, content = p_content, domain = p_domain, sensitivity = p_sensitivity,
        status = 'approved', reviewed_at = v_now, reviewed_by = p_user_id,
        approved_memory_id = v_memory_id, updated_at = v_now
    WHERE id = p_candidate_id AND user_id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'memory_id', v_memory_id);
END;
$$;

CREATE OR REPLACE FUNCTION confirm_sediment_atomic(
    p_user_id uuid,
    p_sedimento_id uuid,
    p_title text,
    p_content text,
    p_importance integer,
    p_tags text[]
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_sedimento sedimentos%ROWTYPE;
    v_memory_id uuid;
    v_now timestamptz := now();
BEGIN
    IF p_user_id IS NULL OR p_sedimento_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated user and sediment are required' USING ERRCODE = '42501';
    END IF;
    IF char_length(trim(p_title)) = 0 OR char_length(trim(p_content)) = 0 THEN
        RAISE EXCEPTION 'Title and content cannot be empty' USING ERRCODE = '22023';
    END IF;
    IF p_importance < 1 OR p_importance > 3 THEN
        RAISE EXCEPTION 'Importance must be between 1 and 3' USING ERRCODE = '22023';
    END IF;
    IF p_tags IS NOT NULL AND coalesce(array_length(p_tags, 1), 0) > 20 THEN
        RAISE EXCEPTION 'Too many tags' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_sedimento
    FROM sedimentos
    WHERE id = p_sedimento_id AND user_id = p_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sediment not found or not owned by user' USING ERRCODE = 'P0002';
    END IF;
    IF v_sedimento.status = 'confirmado' AND v_sedimento.promovido_para IS NOT NULL THEN
        RETURN jsonb_build_object('ok', true, 'idempotent', true, 'memory_id', v_sedimento.promovido_para);
    END IF;
    IF v_sedimento.status <> 'em_revisao' OR v_sedimento.promovido_para IS NOT NULL THEN
        RAISE EXCEPTION 'Sediment is not available for confirmation' USING ERRCODE = 'P0004';
    END IF;

    INSERT INTO jardim_memorias (user_id, title, body, importance, tags)
    VALUES (p_user_id, p_title, p_content, p_importance, coalesce(p_tags, '{}'))
    RETURNING id INTO v_memory_id;
    UPDATE sedimentos
    SET status = 'confirmado', promovido_para = v_memory_id, promovido_tipo = 'jardim_memoria', revisado_at = v_now
    WHERE id = p_sedimento_id AND user_id = p_user_id;
    RETURN jsonb_build_object('ok', true, 'memory_id', v_memory_id);
END;
$$;

CREATE OR REPLACE FUNCTION promote_sediment_batch_atomic(
    p_user_id uuid,
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
AS $$
DECLARE
    v_new_id uuid;
    v_count integer;
    v_distinct_levels integer;
    v_parent_level text;
BEGIN
    IF p_user_id IS NULL OR p_thread_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated user and thread are required' USING ERRCODE = '42501';
    END IF;
    IF p_parent_status NOT IN ('confirmado', 'em_revisao') OR p_new_status <> 'em_revisao' THEN
        RAISE EXCEPTION 'Invalid status combination' USING ERRCODE = '22023';
    END IF;
    IF p_source_ids IS NULL OR coalesce(array_length(p_source_ids, 1), 0) <> 5 THEN
        RAISE EXCEPTION 'Exactly five source sediments are required' USING ERRCODE = '22023';
    END IF;
    IF (SELECT count(DISTINCT source_id) FROM unnest(p_source_ids) AS source_id) <> 5 THEN
        RAISE EXCEPTION 'Source sediment IDs must be distinct' USING ERRCODE = '22023';
    END IF;
    IF p_confianca < 0 OR p_confianca > 3 OR char_length(trim(p_hipotese)) = 0 THEN
        RAISE EXCEPTION 'Invalid confidence or hypothesis' USING ERRCODE = '22023';
    END IF;

    WITH locked_rows AS (
        SELECT id, nivel
        FROM sedimentos
        WHERE user_id = p_user_id AND thread_id = p_thread_id AND id = ANY(p_source_ids)
          AND status = p_parent_status AND promovido_para IS NULL
        FOR UPDATE
    )
    SELECT count(*), count(DISTINCT nivel), max(nivel)
    INTO v_count, v_distinct_levels, v_parent_level
    FROM locked_rows;
    IF v_count <> 5 THEN
        RAISE EXCEPTION 'Invalid or already processed sediment batch' USING ERRCODE = 'P0004';
    END IF;
    IF v_distinct_levels <> 1 THEN
        RAISE EXCEPTION 'All source sediments must have the same level' USING ERRCODE = '22023';
    END IF;

    IF (v_parent_level, p_next_level) NOT IN (
        ('iconic', 'echoic'), ('echoic', 'short_term'), ('short_term', 'working'),
        ('working', 'prospective'), ('prospective', 'episodic'), ('episodic', 'semantic'),
        ('semantic', 'procedural')
    ) THEN
        RAISE EXCEPTION 'Invalid sediment level progression' USING ERRCODE = '22023';
    END IF;

    INSERT INTO sedimentos (user_id, thread_id, nivel, status, source_kind, source_ids, hipotese, resumo, confianca)
    VALUES (p_user_id, p_thread_id, p_next_level, p_new_status, 'sedimento', p_source_ids, p_hipotese, p_resumo, p_confianca)
    RETURNING id INTO v_new_id;
    UPDATE sedimentos
    SET promovido_para = v_new_id, promovido_tipo = 'sedimento'
    WHERE user_id = p_user_id AND id = ANY(p_source_ids);
    RETURN jsonb_build_object('ok', true, 'novo_id', v_new_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_memory_candidate_atomic(uuid, uuid, text, text, text, text, text[], integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION confirm_sediment_atomic(uuid, uuid, text, text, integer, text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION promote_sediment_batch_atomic(uuid, uuid, text, uuid[], text, text, numeric, text, text) FROM PUBLIC;
