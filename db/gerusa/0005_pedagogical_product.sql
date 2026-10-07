-- Minimal pedagogical extensions for the existing Gerusa/KALLISTIS identity,
-- mesa, campaign and chat substrate. This migration is Gerusa-database only.
DO $$
BEGIN
  IF current_database() <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa pedagogy migration in database %', current_database();
  END IF;
  IF current_user <> 'gerusa' THEN
    RAISE EXCEPTION 'Refusing Gerusa pedagogy migration for role %', current_user;
  END IF;
END;
$$;

BEGIN;

CREATE TABLE IF NOT EXISTS gerusa.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES gerusa.mesas(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES gerusa.campaigns(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  sheet jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, mesa_id)
);
CREATE INDEX IF NOT EXISTS gerusa_characters_mesa_idx ON gerusa.characters (mesa_id, owner_user_id);

CREATE TABLE IF NOT EXISTS gerusa.adventures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES gerusa.mesas(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES gerusa.campaigns(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  premise text NOT NULL DEFAULT '',
  pedagogical_objective text NOT NULL DEFAULT '',
  grammar_target text NOT NULL DEFAULT '',
  vocabulary jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 5 AND 240),
  tone text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT '',
  scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  npcs jsonb NOT NULL DEFAULT '[]'::jsonb,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  challenges jsonb NOT NULL DEFAULT '[]'::jsonb,
  english_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  supports jsonb NOT NULL DEFAULT '[]'::jsonb,
  conclusion text NOT NULL DEFAULT '',
  hook text NOT NULL DEFAULT '',
  suggested_task text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gerusa_adventures_context_idx
  ON gerusa.adventures (mesa_id, student_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS gerusa.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES gerusa.mesas(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES gerusa.campaigns(id) ON DELETE SET NULL,
  adventure_id uuid REFERENCES gerusa.adventures(id) ON DELETE SET NULL,
  assignment_id uuid,
  title text NOT NULL DEFAULT 'Aula de RPG',
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'completed', 'cancelled')),
  objective text NOT NULL DEFAULT '',
  grammar text NOT NULL DEFAULT '',
  vocabulary text NOT NULL DEFAULT '',
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 240),
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gerusa_lessons_context_idx
  ON gerusa.lessons (mesa_id, student_id, scheduled_at DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS gerusa.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL UNIQUE REFERENCES gerusa.lessons(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES gerusa.mesas(id) ON DELETE CASCADE,
  adventure_id uuid REFERENCES gerusa.adventures(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'closed')),
  current_scene_index integer NOT NULL DEFAULT 0 CHECK (current_scene_index >= 0),
  quick_notes text NOT NULL DEFAULT '',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'live' AND ended_at IS NULL) OR (status = 'closed' AND ended_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS gerusa.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES gerusa.mesas(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES gerusa.campaigns(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES gerusa.lessons(id) ON DELETE SET NULL,
  adventure_id uuid REFERENCES gerusa.adventures(id) ON DELETE SET NULL,
  task_type text NOT NULL DEFAULT 'writing' CHECK (task_type IN
    ('writing', 'reading', 'vocabulary', 'grammar', 'sentences', 'questions', 'quiz', 'story_continuation', 'character_diary')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  prompt text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'submitted', 'reviewed', 'archived')),
  due_at timestamptz,
  allow_resubmit boolean NOT NULL DEFAULT false,
  student_response text,
  submitted_at timestamptz,
  teacher_feedback text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gerusa_assignments_student_idx
  ON gerusa.assignments (student_id, status, due_at, created_at DESC);
CREATE INDEX IF NOT EXISTS gerusa_assignments_mesa_idx
  ON gerusa.assignments (mesa_id, status, updated_at DESC);
ALTER TABLE gerusa.lessons
  ADD CONSTRAINT gerusa_lessons_assignment_fk
  FOREIGN KEY (assignment_id) REFERENCES gerusa.assignments(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS gerusa.lesson_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES gerusa.users(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES gerusa.mesas(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES gerusa.lessons(id) ON DELETE CASCADE,
  live_session_id uuid REFERENCES gerusa.live_sessions(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN
    ('success', 'difficulty', 'new_vocabulary', 'recurring_error', 'observation', 'narrative', 'task_suggestion', 'progress')),
  skill text NOT NULL DEFAULT '',
  progress_status text CHECK (progress_status IS NULL OR progress_status IN
    ('emerging', 'developing', 'secure', 'not_observed')),
  observation text NOT NULL CHECK (length(trim(observation)) BETWEEN 1 AND 4000),
  evidence text NOT NULL DEFAULT '',
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gerusa_lesson_records_student_idx
  ON gerusa.lesson_records (student_id, created_at DESC, record_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  gerusa.characters, gerusa.adventures, gerusa.lessons, gerusa.live_sessions,
  gerusa.assignments, gerusa.lesson_records TO gerusa;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA gerusa TO gerusa;

INSERT INTO gerusa.schema_migrations (version)
VALUES ('0005_pedagogical_product')
ON CONFLICT (version) DO NOTHING;

COMMIT;
