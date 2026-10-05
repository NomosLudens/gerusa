BEGIN;
CREATE TABLE IF NOT EXISTS public.system_identities (
  identity_key text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_identities_key_check CHECK (identity_key = 'TAL')
);
GRANT SELECT, INSERT ON TABLE public.system_identities TO kallistis;
COMMIT;
