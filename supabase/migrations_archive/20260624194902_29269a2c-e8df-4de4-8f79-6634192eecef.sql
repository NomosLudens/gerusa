
CREATE TYPE public.chat_facet AS ENUM ('kaline','klio','kuanyin');

ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS facet public.chat_facet NOT NULL DEFAULT 'klio';

UPDATE public.chat_threads
  SET facet = 'klio'
  WHERE surface IN ('oab','leitor','plano','fichamento');

UPDATE public.chat_threads
  SET facet = 'kaline'
  WHERE surface NOT IN ('oab','leitor','plano','fichamento');

CREATE INDEX IF NOT EXISTS chat_threads_user_facet_idx
  ON public.chat_threads (user_id, facet, created_at DESC);
