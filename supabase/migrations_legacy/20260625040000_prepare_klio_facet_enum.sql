-- Existing projects do not re-run the baseline migration.
-- Prepare the live enum (when present) before rewriting Kalisto rows in the next migration.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_facet') THEN
    ALTER TYPE public.chat_facet ADD VALUE IF NOT EXISTS 'klio';
    ALTER TYPE public.chat_facet ADD VALUE IF NOT EXISTS 'kuanyin';
  END IF;
END $$;
