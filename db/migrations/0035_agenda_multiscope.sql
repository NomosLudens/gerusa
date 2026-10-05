-- Gate 7: normalize the existing Agenda into the four product scopes.
-- Existing INDIVIDUAL rows are private events owned by their creator.
UPDATE public.agenda_events
   SET scope_type = 'PRIVATE',
       mesa_id = NULL,
       target_user_id = created_by
 WHERE scope_type = 'INDIVIDUAL';

ALTER TABLE public.agenda_events
  DROP CONSTRAINT IF EXISTS agenda_events_scope_type_check,
  DROP CONSTRAINT IF EXISTS agenda_events_scope_target_check;

ALTER TABLE public.agenda_events
  ADD CONSTRAINT agenda_events_scope_type_check CHECK (
    scope_type IN ('PRIVATE','MESA','GLOBAL','PLAYER')
  ),
  ADD CONSTRAINT agenda_events_scope_target_check CHECK (
    (scope_type = 'PRIVATE' AND mesa_id IS NULL AND target_user_id = created_by)
    OR (scope_type = 'MESA' AND mesa_id IS NOT NULL AND target_user_id IS NULL)
    OR (scope_type = 'GLOBAL' AND mesa_id IS NULL AND target_user_id IS NULL)
    OR (scope_type = 'PLAYER' AND mesa_id IS NOT NULL AND target_user_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS agenda_events_player_target_idx
  ON public.agenda_events (target_user_id, mesa_id, inicio);
