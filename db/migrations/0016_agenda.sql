-- KALLISTIS Agenda local core. Mesa remains nullable until a canonical local
-- campaign/membership model is proven; no provisional membership is created.
CREATE TABLE IF NOT EXISTS public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scope_type text NOT NULL DEFAULT 'INDIVIDUAL',
  mesa_id text,
  target_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'compromisso',
  inicio timestamptz NOT NULL,
  fim timestamptz,
  local text,
  source_type text,
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_events_scope_type_check CHECK (scope_type IN ('GLOBAL','MESA','INDIVIDUAL')),
  CONSTRAINT agenda_events_scope_target_check CHECK (
    (scope_type = 'GLOBAL' AND mesa_id IS NULL AND target_user_id IS NULL)
    OR (scope_type = 'MESA' AND mesa_id IS NOT NULL AND target_user_id IS NULL)
    OR (scope_type = 'INDIVIDUAL' AND mesa_id IS NULL AND target_user_id IS NOT NULL)
  ),
  CONSTRAINT agenda_events_type_check CHECK (tipo IN ('compromisso','aula','reuniao','evento','prazo','outro')),
  CONSTRAINT agenda_events_time_check CHECK (fim IS NULL OR fim > inicio),
  CONSTRAINT agenda_events_title_check CHECK (length(btrim(titulo)) BETWEEN 1 AND 160),
  CONSTRAINT agenda_events_source_ref_check CHECK (source_ref IS NULL OR source_type IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS agenda_events_visible_individual_idx ON public.agenda_events (target_user_id, inicio);
CREATE INDEX IF NOT EXISTS agenda_events_scope_date_idx ON public.agenda_events (scope_type, mesa_id, inicio);
CREATE INDEX IF NOT EXISTS agenda_events_creator_idx ON public.agenda_events (created_by, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS agenda_events_source_unique_idx ON public.agenda_events (source_type, source_ref)
  WHERE source_type IS NOT NULL AND source_ref IS NOT NULL;
REVOKE ALL ON TABLE public.agenda_events FROM kallistis;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agenda_events TO kallistis;
