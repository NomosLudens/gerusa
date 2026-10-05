-- ============================================================================
-- PR 2 — Retrocompatible Minimal Ledger
-- ============================================================================
-- Fundação mínima do K∧LINE Ledger / Mnemósine Ledger.
--
-- Regras deste arquivo:
-- - apenas objetos novos;
-- - sem backfill;
-- - sem dependência obrigatória para fluxos existentes;
-- - sem DROP/RENAME;
-- - retrocompatível por referência opcional a dados legados;
-- - append-only por RLS: usuários autenticados podem inserir e ler suas linhas,
--   mas não recebem policy de UPDATE/DELETE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kline_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    source_app text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    body text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kline_events_pkey PRIMARY KEY (id),
    CONSTRAINT kline_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT kline_events_event_type_not_blank CHECK (btrim(event_type) <> ''),
    CONSTRAINT kline_events_source_app_not_blank CHECK (btrim(source_app) <> '')
);

CREATE TABLE IF NOT EXISTS public.kline_event_refs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    ref_kind text DEFAULT 'legacy'::text NOT NULL,
    legacy_source_table text,
    legacy_source_id text,
    external_ref text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kline_event_refs_pkey PRIMARY KEY (id),
    CONSTRAINT kline_event_refs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.kline_events(id) ON DELETE CASCADE,
    CONSTRAINT kline_event_refs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT kline_event_refs_ref_kind_check CHECK (ref_kind = ANY (ARRAY['legacy'::text, 'external'::text, 'derived'::text])),
    CONSTRAINT kline_event_refs_target_present CHECK (
        (legacy_source_table IS NOT NULL AND legacy_source_id IS NOT NULL)
        OR external_ref IS NOT NULL
    )
);

CREATE TABLE IF NOT EXISTS public.kline_event_review_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewer_id uuid,
    note text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kline_event_review_state_pkey PRIMARY KEY (id),
    CONSTRAINT kline_event_review_state_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.kline_events(id) ON DELETE CASCADE,
    CONSTRAINT kline_event_review_state_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT kline_event_review_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT kline_event_review_state_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'archived'::text]))
);

CREATE INDEX IF NOT EXISTS kline_events_user_occurred_at_idx
    ON public.kline_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS kline_events_user_type_idx
    ON public.kline_events (user_id, event_type);

CREATE INDEX IF NOT EXISTS kline_event_refs_event_id_idx
    ON public.kline_event_refs (event_id);

CREATE INDEX IF NOT EXISTS kline_event_refs_legacy_source_idx
    ON public.kline_event_refs (legacy_source_table, legacy_source_id)
    WHERE legacy_source_table IS NOT NULL AND legacy_source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS kline_event_review_state_event_created_at_idx
    ON public.kline_event_review_state (event_id, created_at DESC);

ALTER TABLE public.kline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kline_event_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kline_event_review_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY kline_events_owner_select
    ON public.kline_events FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY kline_events_owner_insert
    ON public.kline_events FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY kline_event_refs_owner_select
    ON public.kline_event_refs FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1
            FROM public.kline_events e
            WHERE e.id = kline_event_refs.event_id
              AND e.user_id = auth.uid()
        )
    );

CREATE POLICY kline_event_refs_owner_insert
    ON public.kline_event_refs FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1
            FROM public.kline_events e
            WHERE e.id = kline_event_refs.event_id
              AND e.user_id = auth.uid()
        )
    );

CREATE POLICY kline_event_review_state_owner_select
    ON public.kline_event_review_state FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1
            FROM public.kline_events e
            WHERE e.id = kline_event_review_state.event_id
              AND e.user_id = auth.uid()
        )
    );

CREATE POLICY kline_event_review_state_owner_insert
    ON public.kline_event_review_state FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND (reviewer_id IS NULL OR reviewer_id = auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.kline_events e
            WHERE e.id = kline_event_review_state.event_id
              AND e.user_id = auth.uid()
        )
    );
