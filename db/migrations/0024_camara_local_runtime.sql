-- Câmara do Eco no runtime PostgreSQL local.
-- As colunas preservam o contrato legado, mas a identidade aponta para users.
CREATE TABLE IF NOT EXISTS public.camara_sessoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    titulo text NOT NULL,
    modo text NOT NULL,
    status text NOT NULL DEFAULT 'gravando',
    texto_rapido text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    analise jsonb,
    analise_at timestamptz,
    CONSTRAINT camara_sessoes_modo_check CHECK (modo IN ('audio', 'texto')),
    CONSTRAINT camara_sessoes_status_check CHECK (status IN ('gravando', 'finalizado')),
    CONSTRAINT camara_sessoes_titulo_check CHECK (length(trim(titulo)) > 0)
);

CREATE TABLE IF NOT EXISTS public.camara_segmentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id uuid NOT NULL REFERENCES public.camara_sessoes(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ordem integer NOT NULL,
    inicio_seg integer NOT NULL,
    fim_seg integer NOT NULL,
    audio_path text,
    transcricao text,
    status text NOT NULL DEFAULT 'queued',
    erro text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT camara_segmentos_status_check CHECK (status IN ('queued', 'processing', 'transcribed', 'failed')),
    CONSTRAINT camara_segmentos_ordem_check CHECK (ordem > 0),
    CONSTRAINT camara_segmentos_interval_check CHECK (inicio_seg >= 0 AND fim_seg >= inicio_seg)
);

CREATE INDEX IF NOT EXISTS camara_sessoes_user_created_idx
    ON public.camara_sessoes (user_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS camara_segmentos_sessao_ordem_idx
    ON public.camara_segmentos (sessao_id, ordem, id);
CREATE INDEX IF NOT EXISTS camara_segmentos_user_idx
    ON public.camara_segmentos (user_id, created_at, id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.camara_sessoes TO kallistis;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.camara_segmentos TO kallistis;
