BEGIN;

ALTER TABLE public.community_chat_messages
    ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS community_chat_messages_active_idx
    ON public.community_chat_messages (archived_at, created_at, id);

GRANT SELECT, INSERT, UPDATE ON TABLE public.community_chat_messages TO kallistis;

COMMIT;
