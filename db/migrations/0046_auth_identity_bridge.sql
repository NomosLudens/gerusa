-- AUTH-01: KALLISTIS remains the authority for user, Mesa and membership.
-- Gravewright receives only a one-time server-validated handoff.
CREATE TABLE IF NOT EXISTS public.player_access (
    player_code text PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    credential_lookup_digest text NOT NULL UNIQUE,
    credential_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CONSTRAINT player_access_code_check CHECK (player_code ~ '^JOGADOR-(0[1-9]|1[0-9]|2[0-5])$'),
    CONSTRAINT player_access_hash_not_empty CHECK (length(credential_hash) > 0)
);
CREATE INDEX IF NOT EXISTS player_access_user_idx ON public.player_access (user_id);

CREATE TABLE IF NOT EXISTS public.vtt_campaign_mappings (
    mesa_id uuid PRIMARY KEY REFERENCES public.mesas(id) ON DELETE CASCADE,
    gravewright_campaign_id uuid NOT NULL UNIQUE,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vtt_handoff_codes (
    code_digest text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    mesa_id uuid NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
    member_role text NOT NULL,
    gravewright_campaign_id uuid NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    consumed_at timestamptz,
    CONSTRAINT vtt_handoff_role_check CHECK (member_role IN ('mestre', 'jogador')),
    CONSTRAINT vtt_handoff_expiry_check CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS vtt_handoff_expiry_idx ON public.vtt_handoff_codes (expires_at);

GRANT SELECT, INSERT, UPDATE ON public.player_access TO kallistis;
GRANT SELECT ON public.vtt_campaign_mappings TO kallistis;
GRANT SELECT, INSERT, UPDATE ON public.vtt_handoff_codes TO kallistis;
