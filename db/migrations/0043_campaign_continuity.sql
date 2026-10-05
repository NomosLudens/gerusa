BEGIN;

CREATE TABLE IF NOT EXISTS public.campaign_continuity_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type text NOT NULL,
    title text NOT NULL,
    canonical_status text NOT NULL DEFAULT 'PLANNED',
    editorial_status text NOT NULL DEFAULT 'DRAFT',
    public_content text NOT NULL DEFAULT '',
    private_notes text NOT NULL DEFAULT '',
    media_asset_id text,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz,
    CONSTRAINT campaign_continuity_entries_type_check CHECK (entry_type IN ('NPC','LOCAL','OBJETO','PISTA','EVENTO','DIARIO','IMAGEM')),
    CONSTRAINT campaign_continuity_entries_canonical_check CHECK (canonical_status IN ('PLAYED_CONFIRMED','RECOVERED_SESSION_NOTE','CAMPAIGN_CANON','CAMPAIGN_LOCK','PLANNED','OPEN')),
    CONSTRAINT campaign_continuity_entries_editorial_check CHECK (editorial_status IN ('DRAFT','READY','REVEALED','ARCHIVED')),
    CONSTRAINT campaign_continuity_entries_title_check CHECK (length(trim(title)) BETWEEN 1 AND 160)
);

CREATE TABLE IF NOT EXISTS public.campaign_continuity_publications (
    entry_id uuid NOT NULL REFERENCES public.campaign_continuity_entries(id) ON DELETE CASCADE,
    mesa_id uuid NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
    visibility text NOT NULL DEFAULT 'hidden',
    published_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    published_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (entry_id, mesa_id),
    CONSTRAINT campaign_continuity_publications_visibility_check CHECK (visibility IN ('hidden','revealed'))
);

CREATE INDEX IF NOT EXISTS campaign_continuity_entries_active_idx ON public.campaign_continuity_entries (archived_at, updated_at DESC, id);
CREATE INDEX IF NOT EXISTS campaign_continuity_publications_mesa_idx ON public.campaign_continuity_publications (mesa_id, published_at DESC, entry_id);

GRANT SELECT, INSERT, UPDATE ON TABLE public.campaign_continuity_entries TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.campaign_continuity_publications TO kallistis;

COMMIT;
