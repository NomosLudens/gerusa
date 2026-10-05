
-- Enums
CREATE TYPE public.semaforo_fisico AS ENUM ('green','yellow','red','blue','neutral');
CREATE TYPE public.sessao_status AS ENUM ('em_andamento','concluida','abandonada');
CREATE TYPE public.sinal_tipo AS ENUM ('sono','energia','dor','humor','fome','estresse','outro');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- treino_templates
CREATE TABLE public.treino_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  dias_semana int[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treino_templates TO authenticated;
GRANT ALL ON public.treino_templates TO service_role;
ALTER TABLE public.treino_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own treino_templates" ON public.treino_templates FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_treino_templates_updated BEFORE UPDATE ON public.treino_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_treino_templates_user ON public.treino_templates(user_id);

-- treino_template_exercicios
CREATE TABLE public.treino_template_exercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.treino_templates(id) ON DELETE CASCADE,
  nome text NOT NULL,
  grupo_muscular text,
  series_alvo int,
  reps_alvo text,
  ordem int NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treino_template_exercicios TO authenticated;
GRANT ALL ON public.treino_template_exercicios TO service_role;
ALTER TABLE public.treino_template_exercicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own treino_template_exercicios" ON public.treino_template_exercicios FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_tte_template ON public.treino_template_exercicios(template_id);
CREATE INDEX idx_tte_user ON public.treino_template_exercicios(user_id);

-- treino_sessoes
CREATE TABLE public.treino_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.treino_templates(id) ON DELETE SET NULL,
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  encerrada_em timestamptz,
  duracao_segundos int,
  semaforo public.semaforo_fisico NOT NULL DEFAULT 'neutral',
  status public.sessao_status NOT NULL DEFAULT 'em_andamento',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treino_sessoes TO authenticated;
GRANT ALL ON public.treino_sessoes TO service_role;
ALTER TABLE public.treino_sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own treino_sessoes" ON public.treino_sessoes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_treino_sessoes_updated BEFORE UPDATE ON public.treino_sessoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_treino_sessoes_user_data ON public.treino_sessoes(user_id, iniciada_em DESC);

-- treino_sessao_exercicios
CREATE TABLE public.treino_sessao_exercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sessao_id uuid NOT NULL REFERENCES public.treino_sessoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  grupo_muscular text,
  ordem int NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treino_sessao_exercicios TO authenticated;
GRANT ALL ON public.treino_sessao_exercicios TO service_role;
ALTER TABLE public.treino_sessao_exercicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own treino_sessao_exercicios" ON public.treino_sessao_exercicios FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_tse_sessao ON public.treino_sessao_exercicios(sessao_id);
CREATE INDEX idx_tse_user ON public.treino_sessao_exercicios(user_id);

-- treino_series
CREATE TABLE public.treino_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sessao_exercicio_id uuid NOT NULL REFERENCES public.treino_sessao_exercicios(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  peso numeric(6,2),
  reps int,
  rir int,
  descanso_segundos int,
  concluida boolean NOT NULL DEFAULT false,
  registrada_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treino_series TO authenticated;
GRANT ALL ON public.treino_series TO service_role;
ALTER TABLE public.treino_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own treino_series" ON public.treino_series FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_treino_series_sx ON public.treino_series(sessao_exercicio_id);
CREATE INDEX idx_treino_series_user ON public.treino_series(user_id);

-- corpo_sinais
CREATE TABLE public.corpo_sinais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo public.sinal_tipo NOT NULL,
  intensidade int CHECK (intensidade BETWEEN 0 AND 10),
  nota text,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corpo_sinais TO authenticated;
GRANT ALL ON public.corpo_sinais TO service_role;
ALTER TABLE public.corpo_sinais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own corpo_sinais" ON public.corpo_sinais FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_corpo_sinais_user_data ON public.corpo_sinais(user_id, registrado_em DESC);
