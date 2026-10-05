BEGIN;

CREATE TABLE IF NOT EXISTS public.mesa_live_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mesa_id uuid NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'live',
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    created_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    closed_by_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
    summary text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT mesa_live_sessions_status_check CHECK (status IN ('live','closed')),
    CONSTRAINT mesa_live_sessions_title_check CHECK (length(trim(title)) BETWEEN 1 AND 160)
);

CREATE UNIQUE INDEX IF NOT EXISTS mesa_live_sessions_one_live_per_mesa_idx
    ON public.mesa_live_sessions (mesa_id)
    WHERE status = 'live';

CREATE INDEX IF NOT EXISTS mesa_live_sessions_mesa_recent_idx
    ON public.mesa_live_sessions (mesa_id, started_at DESC, id);

CREATE TABLE IF NOT EXISTS public.mesa_live_session_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.mesa_live_sessions(id) ON DELETE CASCADE,
    created_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    title text,
    event_type text NOT NULL DEFAULT 'EVENTO',
    public_content text NOT NULL,
    private_notes text,
    promoted_entry_id uuid REFERENCES public.campaign_continuity_entries(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT mesa_live_session_events_type_check
      CHECK (event_type IN ('NPC','LOCAL','OBJETO','PISTA','EVENTO','DIARIO','IMAGEM')),
    CONSTRAINT mesa_live_session_events_title_check
      CHECK (title IS NULL OR length(trim(title)) BETWEEN 1 AND 160)
);

CREATE INDEX IF NOT EXISTS mesa_live_session_events_session_idx
    ON public.mesa_live_session_events (session_id, created_at, id);

GRANT SELECT, INSERT, UPDATE ON TABLE public.mesa_live_sessions TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.mesa_live_session_events TO kallistis;

COMMIT;
