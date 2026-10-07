-- Gate 02 aligns persisted message roles with the conversation API.
DO $$
BEGIN
  IF current_database() <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa migration in database %', current_database();
  END IF;
END;
$$;

BEGIN;

ALTER TABLE gerusa.messages DROP CONSTRAINT IF EXISTS messages_role_check;
UPDATE gerusa.messages SET role = 'assistant' WHERE role = 'gerusa';
ALTER TABLE gerusa.messages
  ADD CONSTRAINT messages_role_check CHECK (role IN ('user', 'assistant'));

INSERT INTO gerusa.schema_migrations (version)
VALUES ('0002_assistant_role')
ON CONFLICT (version) DO NOTHING;

COMMIT;
