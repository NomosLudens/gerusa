-- Google-only onboarding invitations for the 25 canonical player slots.
-- The slot exists before authentication; the Auth UID is bound only by the
-- transactional claim after a valid invite and a verified Supabase session.
CREATE TABLE IF NOT EXISTS public.player_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    player_label text NOT NULL UNIQUE,
    token_hash text NOT NULL UNIQUE,
    claimed_by_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
    claimed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CONSTRAINT player_invites_label_check CHECK (player_label ~ '^JOGADOR-(0[1-9]|1[0-9]|2[0-5])$'),
    CONSTRAINT player_invites_claim_state_check CHECK (
        (claimed_by_user_id IS NULL AND claimed_at IS NULL)
        OR (claimed_by_user_id IS NOT NULL AND claimed_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS player_invites_claimed_user_idx
    ON public.player_invites (claimed_by_user_id)
    WHERE claimed_by_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.player_invite_oauth_states (
    state_hash text PRIMARY KEY,
    invite_id uuid NOT NULL REFERENCES public.player_invites(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    CONSTRAINT player_invite_oauth_state_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS player_invite_oauth_states_expiry_idx
    ON public.player_invite_oauth_states (expires_at)
    WHERE consumed_at IS NULL;

REVOKE ALL ON TABLE public.player_invites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.player_invite_oauth_states FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.player_invites TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.player_invite_oauth_states TO kallistis;
