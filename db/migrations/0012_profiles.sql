-- Local user profile, owned by the same identity as the local session.
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    display_name text,
    avatar_url text,
    gender text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT profiles_gender_check CHECK (gender IS NULL OR gender IN ('feminino', 'masculino', 'neutro'))
);

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO kallistis;
