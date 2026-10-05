-- Profile photos stay in the local PostgreSQL authority and are served only
-- to the authenticated owner through /api/profile/avatar.
CREATE TABLE IF NOT EXISTS public.profile_avatars (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
    image_bytes bytea NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_avatars TO kallistis;
