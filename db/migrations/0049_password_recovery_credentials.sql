-- KALLISTIS recovery-code credentials.
-- The plaintext code exists only in the one-time response to the operator. The
-- database stores only its HMAC digest and technical state.

CREATE TABLE IF NOT EXISTS public.user_recovery_credentials (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    code_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    rotated_at timestamptz,
    used_at timestamptz,
    failed_attempts integer NOT NULL DEFAULT 0,
    locked_until timestamptz,
    processing_until timestamptz,
    CONSTRAINT user_recovery_credentials_hash_not_empty CHECK (length(code_hash) > 0),
    CONSTRAINT user_recovery_credentials_failed_attempts_check CHECK (failed_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS user_recovery_credentials_lock_idx
    ON public.user_recovery_credentials (locked_until)
    WHERE locked_until IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.auth_recovery_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    event_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT auth_recovery_events_type_check CHECK (
        event_type IN (
            'RECOVERY_REQUESTED',
            'RECOVERY_FAILED',
            'RECOVERY_RATE_LIMITED',
            'RECOVERY_SUCCEEDED',
            'RECOVERY_CODE_ROTATED',
            'RECOVERY_CODE_ADMIN_RESET'
        )
    )
);

REVOKE ALL ON TABLE public.user_recovery_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.auth_recovery_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_recovery_credentials TO kallistis;
GRANT INSERT ON TABLE public.auth_recovery_events TO kallistis;
GRANT USAGE, SELECT ON SEQUENCE public.auth_recovery_events_id_seq TO kallistis;
