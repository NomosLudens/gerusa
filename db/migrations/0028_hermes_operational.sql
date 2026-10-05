-- PR2: persist the selected response mode and bounded, user-owned mutation previews.
ALTER TABLE public.chat_threads
    ADD COLUMN IF NOT EXISTS response_mode text NOT NULL DEFAULT 'ASSISTENTE',
    ADD COLUMN IF NOT EXISTS roleplay_target_id text;

ALTER TABLE public.chat_threads
    DROP CONSTRAINT IF EXISTS chat_threads_response_mode_check;

ALTER TABLE public.chat_threads
    ADD CONSTRAINT chat_threads_response_mode_check
    CHECK (response_mode IN ('ASSISTENTE', 'MESTRE', 'NARRADOR', 'PERSONAGEM', 'NPC', 'COMPANHEIRO', 'REGRA', 'EDITORIAL'));

CREATE INDEX IF NOT EXISTS chat_threads_response_mode_idx
    ON public.chat_threads (user_id, response_mode, id);

CREATE TABLE IF NOT EXISTS public.chat_mutation_confirmations (
    id uuid PRIMARY KEY,
    operation_id uuid NOT NULL UNIQUE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    character_id text NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    operation text NOT NULL CHECK (operation = 'character_biography_update'),
    expected_version integer NOT NULL,
    before_biography text NOT NULL,
    next_biography text NOT NULL,
    status text NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'executing', 'confirmed', 'cancelled', 'expired')),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS chat_mutation_confirmations_user_status_idx
    ON public.chat_mutation_confirmations (user_id, status, expires_at);

GRANT SELECT, INSERT, UPDATE ON TABLE public.chat_mutation_confirmations TO kallistis;
