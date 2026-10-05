-- Minimal explicit global authority for the local KALLISTIS product.
CREATE TABLE IF NOT EXISTS public.system_roles (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    system_role text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT system_roles_role_check CHECK (system_role IN ('system_master'))
);

GRANT SELECT ON TABLE public.system_roles TO kallistis;

CREATE INDEX IF NOT EXISTS system_roles_role_idx
    ON public.system_roles (system_role);
