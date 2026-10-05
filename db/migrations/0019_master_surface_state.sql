CREATE TABLE IF NOT EXISTS public.master_user_surface_state (
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    surface_key text NOT NULL,
    state jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, surface_key)
);

CREATE TABLE IF NOT EXISTS public.master_mesa_surface_state (
    mesa_id uuid NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
    surface_key text NOT NULL,
    state jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (mesa_id, surface_key)
);

GRANT SELECT, INSERT, UPDATE ON TABLE public.master_user_surface_state TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.master_mesa_surface_state TO kallistis;
