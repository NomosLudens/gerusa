-- Additive scope columns for Local Core external context.
ALTER TABLE public.contexto_externo
    ADD COLUMN IF NOT EXISTS mesa_id uuid,
    ADD COLUMN IF NOT EXISTS campaign_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contexto_externo_mesa_id_fkey'
    ) THEN
        ALTER TABLE public.contexto_externo
            ADD CONSTRAINT contexto_externo_mesa_id_fkey
            FOREIGN KEY (mesa_id) REFERENCES public.mesas(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contexto_externo_campaign_id_fkey'
    ) THEN
        ALTER TABLE public.contexto_externo
            ADD CONSTRAINT contexto_externo_campaign_id_fkey
            FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE public.contexto_externo
    DROP CONSTRAINT IF EXISTS contexto_externo_scope_exclusive;

ALTER TABLE public.contexto_externo
    ADD CONSTRAINT contexto_externo_scope_exclusive
    CHECK (NOT (mesa_id IS NOT NULL AND campaign_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS contexto_externo_scope_idx
    ON public.contexto_externo (user_id, ativo, campaign_id, mesa_id, updated_at DESC, id);

-- Existing rows remain user-global: mesa_id = NULL and campaign_id = NULL.
