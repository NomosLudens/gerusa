DROP TABLE IF EXISTS public.clio_memory CASCADE;
DROP TABLE IF EXISTS public.clio_settings CASCADE;
DROP INDEX IF EXISTS public.eventos_user_audience_inicio_idx;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS audience;