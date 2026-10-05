-- KALLISTIS character lifecycle. PostgreSQL kallistis only.
-- The authenticated user is the owner and the initial reviewer capability.

CREATE TABLE IF NOT EXISTS public.characters (
  id text PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  master_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',
  ruleset text NOT NULL,
  name text NOT NULL DEFAULT '',
  player_name text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  mechanical_fingerprint text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  archived_at timestamptz,
  CONSTRAINT characters_status_check CHECK (status IN ('draft','submitted','approved','rejected','archived')),
  CONSTRAINT characters_version_positive CHECK (version >= 1),
  CONSTRAINT characters_snapshot_object CHECK (jsonb_typeof(snapshot) = 'object')
);
CREATE INDEX IF NOT EXISTS characters_owner_updated_idx ON public.characters (owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS characters_master_status_idx ON public.characters (master_user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.character_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id text NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  reason text NOT NULL DEFAULT 'save',
  actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT character_versions_version_positive CHECK (version >= 1),
  CONSTRAINT character_versions_snapshot_object CHECK (jsonb_typeof(snapshot) = 'object'),
  UNIQUE (character_id, version)
);
CREATE INDEX IF NOT EXISTS character_versions_character_idx ON public.character_versions (character_id, version DESC);

CREATE TABLE IF NOT EXISTS public.character_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id text NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version_before integer,
  version_after integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT character_events_payload_object CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX IF NOT EXISTS character_events_character_idx ON public.character_events (character_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.character_progression_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id text NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  trail_id text NOT NULL,
  from_marco integer NOT NULL,
  to_marco integer NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  note text NOT NULL DEFAULT '',
  requested_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  authorized_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  applied_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  authorized_at timestamptz,
  started_at timestamptz,
  applied_at timestamptz,
  CONSTRAINT character_progression_status_check CHECK (status IN ('requested','authorized','in_progress','applied','cancelled','rejected')),
  CONSTRAINT character_progression_marco_check CHECK (from_marco BETWEEN 1 AND 9 AND to_marco = from_marco + 1 AND to_marco BETWEEN 2 AND 10)
);
CREATE INDEX IF NOT EXISTS character_progression_character_idx ON public.character_progression_requests (character_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS character_progression_one_active_idx ON public.character_progression_requests (character_id, trail_id) WHERE status IN ('requested','authorized','in_progress');
CREATE UNIQUE INDEX IF NOT EXISTS character_progression_one_applied_idx ON public.character_progression_requests (character_id, trail_id, from_marco, to_marco) WHERE status = 'applied';

CREATE TABLE IF NOT EXISTS public.character_creation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id text NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT character_creation_message_role_check CHECK (role IN ('user','assistant')),
  CONSTRAINT character_creation_message_content_check CHECK (length(content) BETWEEN 1 AND 12000)
);
CREATE INDEX IF NOT EXISTS character_creation_messages_character_idx ON public.character_creation_messages (character_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.prevent_character_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'character_events_immutable';
END;
$$;
DROP TRIGGER IF EXISTS character_events_immutable_trigger ON public.character_events;
CREATE TRIGGER character_events_immutable_trigger
  BEFORE UPDATE OR DELETE ON public.character_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_character_event_mutation();

REVOKE ALL ON TABLE public.characters, public.character_versions, public.character_events,
  public.character_progression_requests, public.character_creation_messages FROM kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.characters TO kallistis;
GRANT SELECT, INSERT ON TABLE public.character_versions TO kallistis;
GRANT SELECT, INSERT ON TABLE public.character_events TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.character_progression_requests TO kallistis;
GRANT SELECT, INSERT ON TABLE public.character_creation_messages TO kallistis;
