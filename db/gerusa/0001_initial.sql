-- Gerusa's first PostgreSQL migration.
-- Apply only after connecting to a dedicated database named `gerusa`.
-- This is a prepared reference; Gate 01's runtime does not connect to PostgreSQL.
-- This file intentionally does not create roles, set passwords, or grant public access.

DO $$
BEGIN
  IF current_database() <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa migration in database %', current_database();
  END IF;
END;
$$;

BEGIN;

CREATE SCHEMA IF NOT EXISTS gerusa;
REVOKE ALL ON SCHEMA gerusa FROM PUBLIC;

CREATE TABLE IF NOT EXISTS gerusa.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gerusa.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text CHECK (title IS NULL OR length(title) <= 200),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gerusa.messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES gerusa.conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'gerusa')),
  content text NOT NULL CHECK (length(btrim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_order_idx
  ON gerusa.messages (conversation_id, created_at, id);

INSERT INTO gerusa.schema_migrations (version)
VALUES ('0001_initial')
ON CONFLICT (version) DO NOTHING;

COMMIT;
