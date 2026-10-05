-- TAL controls which player-facing tabs each local profile can use.
-- No row means the player keeps the default access to every real player tab.
CREATE TABLE IF NOT EXISTS public.user_app_access (
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    app_id text NOT NULL,
    allowed boolean NOT NULL DEFAULT true,
    updated_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, app_id)
);

CREATE INDEX IF NOT EXISTS user_app_access_user_idx
    ON public.user_app_access (user_id, allowed);

GRANT SELECT, INSERT, UPDATE ON TABLE public.user_app_access TO kallistis;
