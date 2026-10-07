-- One-time teacher recovery code stored alongside the existing credential.
DO $$
BEGIN
  IF current_database() <> 'gerusa' OR current_user <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa recovery migration outside gerusa database/role';
  END IF;
END;
$$;

BEGIN;

ALTER TABLE gerusa.credentials ADD COLUMN IF NOT EXISTS recovery_hash text;

INSERT INTO gerusa.schema_migrations (version)
VALUES ('0007_teacher_recovery')
ON CONFLICT (version) DO NOTHING;

GRANT SELECT, UPDATE ON gerusa.credentials TO gerusa;
COMMIT;
