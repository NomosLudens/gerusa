BEGIN;

ALTER TABLE public.mesa_live_session_events
  ADD COLUMN IF NOT EXISTS revealed_at timestamptz,
  ADD COLUMN IF NOT EXISTS revealed_by_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS media_asset_id text;

COMMIT;
