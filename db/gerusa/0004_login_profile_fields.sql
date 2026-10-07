DO $$
BEGIN
  IF current_database() <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa migration in database %', current_database();
  END IF;
END;
$$;

BEGIN;

ALTER TABLE gerusa.users ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON gerusa.users (lower(email)) WHERE email IS NOT NULL;
ALTER TABLE gerusa.profiles
  ADD COLUMN IF NOT EXISTS pronouns text
    CHECK (pronouns IS NULL OR char_length(btrim(pronouns)) BETWEEN 1 AND 80);

INSERT INTO gerusa.schema_migrations (version)
VALUES ('0004_login_profile_fields')
ON CONFLICT (version) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON gerusa.users, gerusa.profiles TO gerusa;
COMMIT;
