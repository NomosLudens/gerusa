-- One-time invitations replace sharing a player's permanent credential.
CREATE TABLE IF NOT EXISTS public.mesa_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_digest text NOT NULL UNIQUE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    mesa_id uuid NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    used_at timestamptz
);

CREATE INDEX IF NOT EXISTS mesa_invites_user_idx
    ON public.mesa_invites (user_id, expires_at);

GRANT SELECT, INSERT, UPDATE ON TABLE public.mesa_invites TO kallistis;
