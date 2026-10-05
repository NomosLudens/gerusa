-- 1) Faceta clio
ALTER TYPE chat_facet ADD VALUE IF NOT EXISTS 'clio';

-- 2) Audience em eventos
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'self'
    CHECK (audience IN ('self','clio'));

CREATE INDEX IF NOT EXISTS eventos_user_audience_inicio_idx
  ON public.eventos (user_id, audience, inicio);

-- 3) Configuração do Clio
CREATE TABLE IF NOT EXISTS public.clio_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text,
  voice text NOT NULL DEFAULT 'alloy',
  speech_rate numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clio_settings TO authenticated;
GRANT ALL ON public.clio_settings TO service_role;

ALTER TABLE public.clio_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own clio settings"
  ON public.clio_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER clio_settings_touch
  BEFORE UPDATE ON public.clio_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();