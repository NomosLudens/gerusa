-- Allow a published continuity entry to be either a session summary or a
-- curated, versioned HTML document assigned to a Mesa.
ALTER TABLE public.camara_mapas_continuidade
    ALTER COLUMN sessao_id DROP NOT NULL;

ALTER TABLE public.camara_mapas_continuidade
    ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'session';

ALTER TABLE public.camara_mapas_continuidade
    ADD COLUMN IF NOT EXISTS asset_key text;

ALTER TABLE public.camara_mapas_continuidade
    DROP CONSTRAINT IF EXISTS camara_mapas_cont_sessao_mesa_unique;

ALTER TABLE public.camara_mapas_continuidade
    ADD CONSTRAINT camara_mapas_cont_tipo_check
    CHECK (tipo IN ('session', 'document'));

ALTER TABLE public.camara_mapas_continuidade
    ADD CONSTRAINT camara_mapas_cont_source_check
    CHECK (
        (tipo = 'session' AND sessao_id IS NOT NULL AND asset_key IS NULL)
        OR
        (tipo = 'document' AND sessao_id IS NULL AND asset_key IS NOT NULL)
    );

CREATE UNIQUE INDEX IF NOT EXISTS camara_mapas_cont_sessao_mesa_unique_idx
    ON public.camara_mapas_continuidade (sessao_id, mesa_id)
    WHERE sessao_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS camara_mapas_cont_document_unique_idx
    ON public.camara_mapas_continuidade (mesa_id, asset_key)
    WHERE sessao_id IS NULL AND asset_key IS NOT NULL;
