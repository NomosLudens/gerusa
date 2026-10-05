-- PR4 follow-up: 0010 is already applied and immutable.
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS published_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS published_version integer;
ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS characters_published_snapshot_object;
ALTER TABLE public.characters ADD CONSTRAINT characters_published_snapshot_object
  CHECK (published_snapshot IS NULL OR jsonb_typeof(published_snapshot) = 'object');
ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS characters_published_version_check;
ALTER TABLE public.characters ADD CONSTRAINT characters_published_version_check
  CHECK (published_version IS NULL OR published_version >= 1);
DROP INDEX IF EXISTS public.character_progression_one_active_idx;
CREATE UNIQUE INDEX character_progression_one_active_idx
  ON public.character_progression_requests (character_id)
  WHERE status IN ('requested', 'authorized', 'in_progress');
