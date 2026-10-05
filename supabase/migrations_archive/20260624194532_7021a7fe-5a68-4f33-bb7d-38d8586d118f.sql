
CREATE TYPE public.evento_tipo AS ENUM ('compromisso','aula','reuniao','evento','prazo','outro');

CREATE TABLE public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  tipo public.evento_tipo NOT NULL DEFAULT 'compromisso',
  inicio timestamptz NOT NULL,
  fim timestamptz,
  local text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own eventos" ON public.eventos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX eventos_user_inicio_idx ON public.eventos (user_id, inicio);
