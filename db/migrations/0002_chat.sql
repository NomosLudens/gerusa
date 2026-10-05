-- KALLISTIS local chat contract. Identity authority is the backend session.

CREATE TABLE IF NOT EXISTS chat_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    surface text NOT NULL DEFAULT 'kaline',
    facet text NOT NULL DEFAULT 'kaline',
    title text,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_sedimentado_at timestamptz,
    CONSTRAINT chat_threads_surface_check CHECK (length(trim(surface)) > 0),
    CONSTRAINT chat_threads_facet_check CHECK (length(trim(facet)) > 0)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    derived_from uuid[] NOT NULL DEFAULT '{}',
    source_channel text,
    CONSTRAINT chat_messages_role_check CHECK (role IN ('user', 'assistant')),
    CONSTRAINT chat_messages_content_check CHECK (length(content) > 0)
);

CREATE INDEX IF NOT EXISTS chat_threads_user_created_idx
    ON chat_threads (user_id, created_at, id);
CREATE INDEX IF NOT EXISTS chat_messages_thread_created_idx
    ON chat_messages (thread_id, created_at, id);
CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx
    ON chat_messages (user_id, created_at, id);

-- End of chat foundation.
