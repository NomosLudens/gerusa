CREATE TABLE public.presenca_regimes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('green','yellow','blue','red')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.presenca_regimes TO authenticated;
GRANT ALL ON public.presenca_regimes TO service_role;

ALTER TABLE public.presenca_regimes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presenca_regimes own row"
  ON public.presenca_regimes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER presenca_regimes_touch
  BEFORE UPDATE ON public.presenca_regimes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();