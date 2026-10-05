-- Persistent human-first Chat Geral.
-- KALLISTIS responses are stored as separate assistant rows and are created
-- only by the application when the current human message explicitly mentions
-- @kallistis.

CREATE TABLE IF NOT EXISTS public.community_chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT community_chat_messages_role_check CHECK (role IN ('human', 'kallistis')),
    CONSTRAINT community_chat_messages_content_check CHECK (length(trim(content)) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS community_chat_messages_created_idx
    ON public.community_chat_messages (created_at, id);

GRANT SELECT, INSERT ON TABLE public.community_chat_messages TO kallistis;
