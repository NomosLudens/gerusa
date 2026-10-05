-- Spoiler-free, master-published continuity maps per Camara session and Mesa.
-- Private transcripts and analyses remain in camara_sessoes/camara_segmentos.
CREATE TABLE IF NOT EXISTS public.camara_mapas_continuidade (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id uuid NOT NULL REFERENCES public.camara_sessoes(id) ON DELETE CASCADE,
    mesa_id uuid NOT NULL REFERENCES public.mesas(id) ON DELETE RESTRICT,
    titulo text NOT NULL,
    conteudo_publico text NOT NULL,
    published_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    published_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT camara_mapas_cont_sessao_mesa_unique UNIQUE (sessao_id, mesa_id),
    CONSTRAINT camara_mapas_cont_titulo_check CHECK (length(trim(titulo)) BETWEEN 1 AND 160),
    CONSTRAINT camara_mapas_cont_conteudo_check CHECK (length(trim(conteudo_publico)) BETWEEN 1 AND 12000)
);

CREATE INDEX IF NOT EXISTS camara_mapas_cont_mesa_published_idx
    ON public.camara_mapas_continuidade (mesa_id, published_at DESC, id);
CREATE INDEX IF NOT EXISTS camara_mapas_cont_sessao_idx
    ON public.camara_mapas_continuidade (sessao_id, updated_at DESC, id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.camara_mapas_continuidade TO kallistis;
