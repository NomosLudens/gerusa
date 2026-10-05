-- Local Handoff Ledger contract for the Revisao panel.
CREATE TABLE IF NOT EXISTS public.kline_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    source_app text NOT NULL,
    title text,
    body text,
    payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    occurred_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.kline_event_review_state (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES public.kline_events(id) ON DELETE CASCADE,
    status text NOT NULL,
    reviewer_id uuid NOT NULL REFERENCES public.users(id),
    note text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT kline_event_review_state_status_check CHECK (status IN ('approved', 'rejected', 'archived'))
);
CREATE INDEX IF NOT EXISTS kline_events_handoff_user_idx
    ON public.kline_events (user_id, event_type, occurred_at DESC, created_at DESC, id);
CREATE INDEX IF NOT EXISTS kline_event_review_state_event_idx
    ON public.kline_event_review_state (user_id, event_id, created_at DESC, id);
GRANT SELECT ON TABLE public.kline_events TO kallistis;
GRANT SELECT, INSERT ON TABLE public.kline_event_review_state TO kallistis;
