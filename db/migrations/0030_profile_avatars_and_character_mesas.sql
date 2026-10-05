-- Profile avatars and explicit many-to-many character/table membership.
-- KALLISTIS local PostgreSQL only.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_data bytea,
  ADD COLUMN IF NOT EXISTS avatar_mime_type text,
  ADD COLUMN IF NOT EXISTS avatar_size integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_avatar_mime_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_mime_check CHECK (
      avatar_mime_type IS NULL OR avatar_mime_type IN ('image/png', 'image/jpeg', 'image/webp')
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_avatar_size_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_size_check CHECK (
      avatar_size IS NULL OR avatar_size BETWEEN 1 AND 4194304
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.character_mesas (
  character_id text NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (character_id, mesa_id)
);
CREATE INDEX IF NOT EXISTS character_mesas_mesa_idx
  ON public.character_mesas (mesa_id, character_id);

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO kallistis;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mesa_members TO kallistis;
GRANT SELECT, INSERT, DELETE ON TABLE public.character_mesas TO kallistis;
