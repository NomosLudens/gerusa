BEGIN;
CREATE TABLE IF NOT EXISTS public.mesa_responsible_masters (
  mesa_id uuid PRIMARY KEY REFERENCES public.mesas(id) ON DELETE CASCADE,
  master_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  assigned_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mesa_responsible_masters_master_idx ON public.mesa_responsible_masters (master_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mesa_responsible_masters TO kallistis;
COMMIT;
