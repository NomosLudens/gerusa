ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS player_experience text,
  ADD COLUMN IF NOT EXISTS active_character_id text;

ALTER TABLE public.chat_threads
  DROP CONSTRAINT IF EXISTS chat_threads_player_experience_check;

ALTER TABLE public.chat_threads
  ADD CONSTRAINT chat_threads_player_experience_check
  CHECK (
    player_experience IS NULL
    OR player_experience IN ('CHARACTER_CREATION', 'CAMPAIGN', 'ONTOLOGICAL')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_threads_active_character_id_fkey'
      AND conrelid = 'public.chat_threads'::regclass
  ) THEN
    ALTER TABLE public.chat_threads
      ADD CONSTRAINT chat_threads_active_character_id_fkey
      FOREIGN KEY (active_character_id)
      REFERENCES public.characters(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS chat_threads_player_experience_idx
  ON public.chat_threads (user_id, player_experience);

ALTER TABLE public.chat_mutation_confirmations
  ALTER COLUMN character_id DROP NOT NULL,
  ALTER COLUMN expected_version DROP NOT NULL,
  ALTER COLUMN before_biography DROP NOT NULL,
  ALTER COLUMN next_biography DROP NOT NULL;

ALTER TABLE public.chat_mutation_confirmations
  DROP CONSTRAINT IF EXISTS chat_mutation_confirmations_operation_check;

ALTER TABLE public.chat_mutation_confirmations
  ADD CONSTRAINT chat_mutation_confirmations_operation_check
  CHECK (operation IN ('character_biography_update', 'character_create'));

ALTER TABLE public.chat_mutation_confirmations
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;
