-- Username + PIN accounts and first-run setup for the existing Gerusa identity model.
DO $$
BEGIN
  IF current_database() <> 'gerusa' OR current_user <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa account migration outside gerusa database/role';
  END IF;
END;
$$;

BEGIN;

ALTER TABLE gerusa.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS age_years smallint CHECK (age_years IS NULL OR age_years BETWEEN 5 AND 120),
  ADD COLUMN IF NOT EXISTS teacher_note text CHECK (teacher_note IS NULL OR char_length(teacher_note) <= 2000);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON gerusa.profiles (lower(username)) WHERE username IS NOT NULL;

ALTER TABLE gerusa.credentials ADD COLUMN IF NOT EXISTS login_identifier_digest text;
CREATE UNIQUE INDEX IF NOT EXISTS credentials_login_identifier_digest_idx
  ON gerusa.credentials (login_identifier_digest) WHERE login_identifier_digest IS NOT NULL AND revoked_at IS NULL;

INSERT INTO gerusa.schema_migrations (version)
VALUES ('0006_product_accounts')
ON CONFLICT (version) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON gerusa.users, gerusa.profiles, gerusa.credentials,
  gerusa.sessions, gerusa.system_roles, gerusa.mesas, gerusa.mesa_members, gerusa.campaigns TO gerusa;
COMMIT;
