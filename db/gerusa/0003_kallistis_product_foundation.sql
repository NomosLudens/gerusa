-- Adapted KALLISTIS identity and campaign substrate for the isolated Gerusa DB.
-- Keep the established gerusa.* names so the existing local-core repositories
-- can be reused without introducing parallel teacher/student tables.
DO $$
BEGIN
  IF current_database() <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa migration in database %', current_database();
  END IF;
END;
$$;

BEGIN;

CREATE TABLE IF NOT EXISTS gerusa.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  CHECK ((status = 'active' AND disabled_at IS NULL) OR
         (status = 'disabled' AND disabled_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS gerusa.credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE CASCADE,
  credential_lookup_digest text NOT NULL UNIQUE,
  credential_hash text NOT NULL CHECK (length(credential_hash) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS credentials_user_id_idx ON gerusa.credentials (user_id);

CREATE TABLE IF NOT EXISTS gerusa.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE CASCADE,
  token_digest text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS sessions_user_active_idx
  ON gerusa.sessions (user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS gerusa.profiles (
  id uuid PRIMARY KEY REFERENCES gerusa.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  gender text CHECK (gender IS NULL OR gender IN ('feminino', 'masculino', 'neutro')),
  treatment_type text CHECK (treatment_type IS NULL OR treatment_type IN
    ('ele_dele', 'ela_dela', 'elu_delu', 'use_name', 'not_informed', 'other')),
  treatment_custom text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gerusa.system_roles (
  user_id uuid PRIMARY KEY REFERENCES gerusa.users(id) ON DELETE CASCADE,
  system_role text NOT NULL CHECK (system_role IN ('system_master')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gerusa.mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gerusa.mesa_members (
  mesa_id uuid NOT NULL REFERENCES gerusa.mesas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'jogador' CHECK (member_role IN ('mestre', 'jogador')),
  membership_status text NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active', 'invited', 'left')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mesa_id, user_id)
);
CREATE INDEX IF NOT EXISTS mesa_members_user_idx ON gerusa.mesa_members (user_id, membership_status);

CREATE TABLE IF NOT EXISTS gerusa.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES gerusa.users(id) ON DELETE CASCADE,
  general_community boolean NOT NULL DEFAULT false,
  guest_player text NOT NULL DEFAULT 'ask_first' CHECK (guest_player IN ('yes', 'ask_first', 'no')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gerusa.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id uuid NOT NULL REFERENCES gerusa.mesas(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaigns_mesa_status_idx
  ON gerusa.campaigns (mesa_id, status, created_at, id);

ALTER TABLE gerusa.conversations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES gerusa.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS mesa_id uuid REFERENCES gerusa.mesas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS conversations_owner_updated_idx
  ON gerusa.conversations (user_id, updated_at DESC, id);

CREATE TABLE IF NOT EXISTS gerusa.mesa_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_digest text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES gerusa.mesas(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS mesa_invites_user_idx ON gerusa.mesa_invites (user_id, expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  gerusa.users, gerusa.credentials, gerusa.sessions, gerusa.profiles,
  gerusa.system_roles, gerusa.mesas, gerusa.mesa_members, gerusa.user_preferences,
  gerusa.campaigns, gerusa.mesa_invites TO gerusa;
GRANT USAGE ON SCHEMA gerusa TO gerusa;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA gerusa TO gerusa;

INSERT INTO gerusa.schema_migrations (version)
VALUES ('0003_kallistis_product_foundation')
ON CONFLICT (version) DO NOTHING;

COMMIT;
