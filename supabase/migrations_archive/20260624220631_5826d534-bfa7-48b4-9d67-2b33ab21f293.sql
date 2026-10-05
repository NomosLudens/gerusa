
ALTER TABLE public.camara_sessoes
  ADD COLUMN IF NOT EXISTS analise jsonb,
  ADD COLUMN IF NOT EXISTS analise_at timestamptz;
