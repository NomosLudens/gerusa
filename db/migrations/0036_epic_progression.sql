-- KALLISTIS epic progression M11-M15. The proposal is reviewed before apply.
BEGIN;

ALTER TABLE public.character_progression_requests
  ADD COLUMN IF NOT EXISTS proposed_snapshot jsonb;

ALTER TABLE public.character_progression_requests
  DROP CONSTRAINT IF EXISTS character_progression_marco_check;

ALTER TABLE public.character_progression_requests
  ADD CONSTRAINT character_progression_marco_check
  CHECK (from_marco BETWEEN 1 AND 14 AND to_marco = from_marco + 1 AND to_marco BETWEEN 2 AND 15);

ALTER TABLE public.character_progression_requests
  DROP CONSTRAINT IF EXISTS character_progression_proposed_snapshot_object;

ALTER TABLE public.character_progression_requests
  ADD CONSTRAINT character_progression_proposed_snapshot_object
  CHECK (proposed_snapshot IS NULL OR jsonb_typeof(proposed_snapshot) = 'object');

GRANT SELECT, INSERT, UPDATE ON TABLE public.character_progression_requests TO kallistis;

COMMIT;
