-- 1) Tabela de memória persistente do Clio
CREATE TABLE public.clio_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('perfil','pessoas','gostos','rotina','escola','saude','alerta','outro')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  importance SMALLINT NOT NULL DEFAULT 2 CHECK (importance BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clio_memory TO authenticated;
GRANT ALL ON public.clio_memory TO service_role;

ALTER TABLE public.clio_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages own clio memory"
  ON public.clio_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX clio_memory_user_idx ON public.clio_memory (user_id, importance DESC, updated_at DESC);

CREATE TRIGGER clio_memory_touch
  BEFORE UPDATE ON public.clio_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Retomada da última conversa
ALTER TABLE public.clio_settings
  ADD COLUMN IF NOT EXISTS current_thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;