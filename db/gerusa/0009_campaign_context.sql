-- Extend the existing KALLISTIS campaign/session linkage for the Gerusa flow.
DO $$
BEGIN
  IF current_database() <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa campaign migration in database %', current_database();
  END IF;
  IF current_user <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa campaign migration for role %', current_user;
  END IF;
END;
$$;

BEGIN;

ALTER TABLE gerusa.campaigns
  ADD COLUMN IF NOT EXISTS premise text NOT NULL DEFAULT '';

ALTER TABLE gerusa.assignments
  ADD COLUMN IF NOT EXISTS live_session_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'gerusa.assignments'::regclass
       AND conname = 'gerusa_assignments_live_session_fk'
  ) THEN
    ALTER TABLE gerusa.assignments
      ADD CONSTRAINT gerusa_assignments_live_session_fk
      FOREIGN KEY (live_session_id) REFERENCES gerusa.live_sessions(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'gerusa.assignments'::regclass
       AND conname = 'gerusa_assignments_session_lesson_check'
  ) THEN
    ALTER TABLE gerusa.assignments
      ADD CONSTRAINT gerusa_assignments_session_lesson_check
      CHECK (live_session_id IS NULL OR lesson_id IS NOT NULL);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS gerusa_assignments_live_session_idx
  ON gerusa.assignments (live_session_id)
  WHERE live_session_id IS NOT NULL;

INSERT INTO gerusa.schema_migrations (version)
VALUES ('0009_campaign_context')
ON CONFLICT (version) DO NOTHING;

COMMIT;
