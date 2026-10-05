-- V26 consolidado: profiles.gender + presenca_regimes (Semáforo da Kaline)
-- Idempotente: pode rodar em DB novo ou já parcialmente migrado.

-- ---- profiles.gender ----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_gender_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gender_check
      CHECK (gender IS NULL OR gender IN ('feminino','masculino','neutro'));
  END IF;
END $$;

-- ---- presenca_regimes ----
CREATE TABLE IF NOT EXISTS public.presenca_regimes (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state      TEXT NOT NULL CHECK (state IN ('green','yellow','blue','red')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.presenca_regimes TO authenticated;
GRANT ALL ON public.presenca_regimes TO service_role;

ALTER TABLE public.presenca_regimes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presenca_regimes own row" ON public.presenca_regimes;
CREATE POLICY "presenca_regimes own row"
  ON public.presenca_regimes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS presenca_regimes_touch ON public.presenca_regimes;
CREATE TRIGGER presenca_regimes_touch
  BEFORE UPDATE ON public.presenca_regimes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();