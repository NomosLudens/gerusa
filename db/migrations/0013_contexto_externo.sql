-- Local Core continuity records. Historical Supabase data is intentionally not imported here.
CREATE TABLE IF NOT EXISTS public.contexto_externo (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    titulo text NOT NULL,
    conteudo text NOT NULL,
    tipo text NOT NULL DEFAULT 'identidade',
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT contexto_externo_tipo_check CHECK (tipo IN ('identidade', 'memoria_relacional'))
);
CREATE INDEX IF NOT EXISTS contexto_externo_user_updated_idx ON public.contexto_externo (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS contexto_externo_user_active_updated_idx ON public.contexto_externo (user_id, ativo, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contexto_externo TO kallistis;
