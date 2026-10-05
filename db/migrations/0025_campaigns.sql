-- Minimal campaign substrate. Authorization remains derived from active mesa membership.
CREATE TABLE IF NOT EXISTS public.campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mesa_id uuid NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaigns_name_check CHECK (length(trim(name)) BETWEEN 1 AND 120),
    CONSTRAINT campaigns_status_check CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS campaigns_mesa_status_idx
    ON public.campaigns (mesa_id, status, created_at, id);

ALTER TABLE public.chat_threads
    ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS chat_threads_campaign_idx
    ON public.chat_threads (campaign_id, created_at, id);

GRANT SELECT, INSERT, UPDATE ON TABLE public.campaigns TO kallistis;

-- Historical threads remain valid with campaign_id = NULL.
-- No campaign_members table is part of this substrate.
