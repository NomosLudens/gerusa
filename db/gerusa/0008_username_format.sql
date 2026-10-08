-- Keep Gerusa student usernames consistent across the UI, Worker, Core and PostgreSQL.
DO $$
BEGIN
  IF current_database() <> 'gerusa' OR current_user <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa username constraint outside gerusa database/role';
  END IF;
END;
$$;

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM gerusa.profiles
     WHERE username IS NOT NULL
       AND username !~ '^[a-z0-9][a-z0-9_-]{2,31}$'
  ) THEN
    RAISE EXCEPTION 'Existing Gerusa usernames do not satisfy the canonical format';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'gerusa.profiles'::regclass
       AND conname = 'profiles_username_format_check'
  ) THEN
    ALTER TABLE gerusa.profiles
      ADD CONSTRAINT profiles_username_format_check
      CHECK (username IS NULL OR username ~ '^[a-z0-9][a-z0-9_-]{2,31}$');
  END IF;
END;
$$;

INSERT INTO gerusa.schema_migrations (version)
VALUES ('0008_username_format')
ON CONFLICT (version) DO NOTHING;

COMMIT;
