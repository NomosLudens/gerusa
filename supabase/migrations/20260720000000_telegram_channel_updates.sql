CREATE TABLE IF NOT EXISTS public.telegram_channel_updates (
  update_id bigint PRIMARY KEY,
  telegram_user_id bigint NOT NULL,
  telegram_chat_id bigint NOT NULL,
  supabase_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_message_id uuid NULL UNIQUE,
  assistant_message_id uuid NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('processing', 'responded', 'failed')),
  telegram_response_message_id bigint NULL,
  error_code text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_channel_updates ENABLE ROW LEVEL SECURITY;
