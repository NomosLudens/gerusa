-- Scope confirmed Garden memories to the campaign of the source chat thread.
-- NULL remains the existing user-global scope for historical and manual memories.
ALTER TABLE public.jardim_memorias
    ADD COLUMN IF NOT EXISTS campaign_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'jardim_memorias_campaign_id_fkey'
    ) THEN
        ALTER TABLE public.jardim_memorias
            ADD CONSTRAINT jardim_memorias_campaign_id_fkey
            FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS jardim_memorias_user_campaign_idx
    ON public.jardim_memorias (user_id, campaign_id, archived_at, created_at DESC, id);

CREATE OR REPLACE FUNCTION public.confirm_sediment_atomic(
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
    v_sedimento public.sedimentos%ROWTYPE;
    v_campaign_id uuid;
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

    SELECT s.*
      INTO v_sedimento
      FROM public.sedimentos AS s
      JOIN public.chat_threads AS t
        ON t.id = s.thread_id AND t.user_id = s.user_id
     WHERE s.id = p_sedimento_id AND s.user_id = p_user_id
     FOR UPDATE OF s;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sediment not found or not owned by user' USING ERRCODE = 'P0002';
    END IF;
    SELECT t.campaign_id
      INTO v_campaign_id
      FROM public.chat_threads AS t
     WHERE t.id = v_sedimento.thread_id AND t.user_id = p_user_id;
    IF v_sedimento.status = 'confirmado' AND v_sedimento.promovido_para IS NOT NULL THEN
        RETURN jsonb_build_object('ok', true, 'idempotent', true, 'memory_id', v_sedimento.promovido_para);
    END IF;
    IF v_sedimento.status <> 'em_revisao' OR v_sedimento.promovido_para IS NOT NULL THEN
        RAISE EXCEPTION 'Sediment is not available for confirmation' USING ERRCODE = 'P0004';
    END IF;

    INSERT INTO public.jardim_memorias (user_id, title, body, importance, tags, campaign_id)
    VALUES (p_user_id, p_title, p_content, p_importance, coalesce(p_tags, '{}'), v_campaign_id)
    RETURNING id INTO v_memory_id;
    UPDATE public.sedimentos
       SET status = 'confirmado', promovido_para = v_memory_id,
           promovido_tipo = 'jardim_memoria', revisado_at = v_now
     WHERE id = p_sedimento_id AND user_id = p_user_id;
    RETURN jsonb_build_object('ok', true, 'memory_id', v_memory_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_sediment_atomic(uuid, uuid, text, text, integer, text[]) FROM PUBLIC;
