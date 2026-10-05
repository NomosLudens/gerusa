-- Local Registro Vivo contract.
CREATE TABLE IF NOT EXISTS public.registro_vivo (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    kind text NOT NULL,
    body text NOT NULL,
    mood smallint,
    tags text[] NOT NULL DEFAULT '{}',
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT registro_vivo_kind_check CHECK (kind IN ('nota', 'evento', 'sentimento', 'ideia', 'dor', 'ganho', 'sonho', 'pergunta')),
    CONSTRAINT registro_vivo_mood_check CHECK (mood IS NULL OR mood BETWEEN -3 AND 3),
    CONSTRAINT registro_vivo_text_check CHECK (length(trim(body)) > 0)
);
CREATE INDEX IF NOT EXISTS registro_vivo_user_occurred_idx
    ON public.registro_vivo (user_id, occurred_at DESC, id);
CREATE OR REPLACE FUNCTION public.delete_registro_vivo(p_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.registro_vivo WHERE id = p_id AND user_id = p_user_id;
$$;
GRANT SELECT, INSERT ON TABLE public.registro_vivo TO kallistis;
GRANT EXECUTE ON FUNCTION public.delete_registro_vivo(uuid, uuid) TO kallistis;
