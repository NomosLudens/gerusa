-- Migração idempotente para controle de estado da Câmara da Travessia (Kaline <-> Khora)
CREATE TABLE IF NOT EXISTS public.telegram_dialogues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  kaline_message_id bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'processing', 'completed', 'failed')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processing_at timestamptz,
  completed_at timestamptz,
  error_code text,
  CONSTRAINT telegram_dialogues_chat_kaline_msg_unique UNIQUE (chat_id, kaline_message_id)
);

alter table public.telegram_dialogues
  add column if not exists processing_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists error_code text;

CREATE INDEX IF NOT EXISTS idx_telegram_dialogues_lookup 
  ON public.telegram_dialogues(chat_id, kaline_message_id, status);

ALTER TABLE public.telegram_dialogues ENABLE ROW LEVEL SECURITY;
