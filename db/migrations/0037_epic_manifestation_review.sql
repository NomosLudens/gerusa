BEGIN;

ALTER TABLE public.character_progression_requests
  ADD COLUMN IF NOT EXISTS epic_manifestation_status text,
  ADD COLUMN IF NOT EXISTS epic_manifestation_feedback text,
  ADD COLUMN IF NOT EXISTS epic_manifestation_reviewed_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS epic_manifestation_reviewed_at timestamptz;

ALTER TABLE public.character_progression_requests
  DROP CONSTRAINT IF EXISTS character_progression_epic_manifestation_status_check;

ALTER TABLE public.character_progression_requests
  ADD CONSTRAINT character_progression_epic_manifestation_status_check CHECK (
    epic_manifestation_status IS NULL OR epic_manifestation_status IN (
      'RASCUNHO', 'EM_ANALISE', 'HOMOLOGADA', 'HOMOLOGADA_PROVISORIAMENTE',
      'DEVOLVIDA_PARA_AJUSTE', 'NAO_HOMOLOGADA'
    )
  );

GRANT SELECT, INSERT, UPDATE ON TABLE public.character_progression_requests TO kallistis;

COMMIT;
