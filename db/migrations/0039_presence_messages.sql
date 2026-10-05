BEGIN;

CREATE TABLE IF NOT EXISTS public.presence_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  master_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT presence_messages_body_length_check
    CHECK (char_length(body) BETWEEN 1 AND 2000),
  CONSTRAINT presence_messages_distinct_participants
    CHECK (player_user_id <> master_user_id)
);

CREATE INDEX IF NOT EXISTS presence_messages_thread_idx
  ON public.presence_messages (player_user_id, master_user_id, created_at, id);
