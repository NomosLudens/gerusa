-- Canonical social membership layer for the two initial KALLISTIS tables.
CREATE TABLE IF NOT EXISTS public.mesas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT mesas_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT mesas_name_check CHECK (length(trim(name)) BETWEEN 1 AND 120)
);

CREATE TABLE IF NOT EXISTS public.mesa_members (
    mesa_id uuid NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    member_role text NOT NULL DEFAULT 'jogador',
    membership_status text NOT NULL DEFAULT 'active',
    joined_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (mesa_id, user_id),
    CONSTRAINT mesa_members_role_check CHECK (member_role IN ('mestre', 'jogador')),
    CONSTRAINT mesa_members_status_check CHECK (membership_status IN ('active', 'invited', 'left'))
);
CREATE INDEX IF NOT EXISTS mesa_members_user_idx ON public.mesa_members (user_id, membership_status);

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    general_community boolean NOT NULL DEFAULT false,
    guest_player text NOT NULL DEFAULT 'ask_first',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_preferences_guest_player_check CHECK (guest_player IN ('yes', 'ask_first', 'no'))
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS treatment_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS treatment_custom text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_treatment_type_check CHECK (
    treatment_type IS NULL OR treatment_type IN ('ele_dele', 'ela_dela', 'elu_delu', 'use_name', 'not_informed', 'other')
);

INSERT INTO public.mesas (slug, name) VALUES
    ('geek-wizards', 'Geek Wizards'),
    ('taverna-dos-pandas', 'Taverna dos Pandas')
ON CONFLICT (slug) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON TABLE public.mesas TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.mesa_members TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_preferences TO kallistis;
