BEGIN;

CREATE TABLE IF NOT EXISTS public.presence_regimes (
  mesa_id uuid NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  regime text NOT NULL DEFAULT 'green',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT presence_regimes_regime_check
    CHECK (regime IN ('green', 'yellow', 'blue', 'red')),
  CONSTRAINT presence_regimes_player_mesa_key UNIQUE (mesa_id, player_user_id)
);

CREATE INDEX IF NOT EXISTS presence_regimes_player_idx
  ON public.presence_regimes (player_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.presence_regimes TO kallistis;

COMMIT;
