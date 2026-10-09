-- Public teacher registration and one-use student sign-up invitations.
DO $$
BEGIN
  IF current_database() <> 'gerusa' OR current_user <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa registration migration outside gerusa database/role';
  END IF;
END;
$$;

BEGIN;

CREATE TABLE IF NOT EXISTS gerusa.student_signup_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_digest text NOT NULL UNIQUE,
  mesa_id uuid NOT NULL REFERENCES gerusa.mesas(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  claimed_by uuid REFERENCES gerusa.users(id) ON DELETE SET NULL,
  CHECK (expires_at > created_at),
  CHECK ((claimed_at IS NULL AND claimed_by IS NULL) OR
         (claimed_at IS NOT NULL AND claimed_by IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS student_signup_invites_mesa_expiry_idx
  ON gerusa.student_signup_invites (mesa_id, expires_at)
  WHERE claimed_at IS NULL;

INSERT INTO gerusa.schema_migrations (version)
VALUES ('0010_public_registration')
ON CONFLICT (version) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON gerusa.student_signup_invites TO gerusa;
COMMIT;
