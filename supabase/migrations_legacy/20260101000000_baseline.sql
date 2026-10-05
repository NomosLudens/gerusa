-- ==========================================================
-- K∧LINE V26 — Baseline schema (consolidated from 18 migrações)
-- Gerado em: 2026-06-24T23:00:57Z
-- Aplicar este único arquivo recria todo o estado do banco.
-- Histórico original preservado em supabase/migrations_archive/
-- ==========================================================


-- ---- 20260624192237_cfa936e8-c201-4457-9e9f-d76dc923c029.sql ----

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- JURISPRUDENCIA
CREATE TABLE public.jurisprudencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tribunal TEXT,
  numero TEXT,
  ementa TEXT,
  conteudo TEXT,
  fonte_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurisprudencia TO authenticated;
GRANT ALL ON public.jurisprudencia TO service_role;
ALTER TABLE public.jurisprudencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own jurisprudencia" ON public.jurisprudencia FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- LEGISLACAO
CREATE TABLE public.legislacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT,
  artigo TEXT,
  texto TEXT,
  fonte_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legislacao TO authenticated;
GRANT ALL ON public.legislacao TO service_role;
ALTER TABLE public.legislacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own legislacao" ON public.legislacao FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REUNIOES
CREATE TABLE public.reunioes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  audio_path TEXT,
  transcricao TEXT,
  resumo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reunioes TO authenticated;
GRANT ALL ON public.reunioes TO service_role;
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reunioes" ON public.reunioes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- LIVROS
CREATE TABLE public.livros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  autor TEXT,
  arquivo_path TEXT,
  texto_extraido TEXT,
  resumo TEXT,
  infografico_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.livros TO authenticated;
GRANT ALL ON public.livros TO service_role;
ALTER TABLE public.livros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own livros" ON public.livros FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CHAT THREADS
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface TEXT NOT NULL DEFAULT 'geral',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads" ON public.chat_threads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CHAT MESSAGES
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX chat_messages_thread_idx ON public.chat_messages(thread_id, created_at);


-- ---- 20260624192259_0e13d229-b60f-428a-a7e6-0a4682b4e2c8.sql ----
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ---- 20260624192333_2165ad43-784c-4e2f-aba9-ef5aad0f6008.sql ----

CREATE POLICY "own audio" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'reunioes-audio' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'reunioes-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own livros docs" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'livros-docs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'livros-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own infograficos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'infograficos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'infograficos' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ---- 20260624194430_f97680ec-dbae-4d97-b8a3-a17187d12760.sql ----
ALTER TABLE public.reunioes ADD COLUMN IF NOT EXISTS infografico_url text;

-- ---- 20260624194532_7021a7fe-5a68-4f33-bb7d-38d8586d118f.sql ----

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


-- ---- 20260624194902_29269a2c-e8df-4de4-8f79-6634192eecef.sql ----

CREATE TYPE public.chat_facet AS ENUM ('kaline','klio','kuanyin');

ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS facet public.chat_facet NOT NULL DEFAULT 'klio';

UPDATE public.chat_threads
  SET facet = 'klio'
  WHERE surface IN ('oab','leitor','plano','fichamento');

UPDATE public.chat_threads
  SET facet = 'kaline'
  WHERE surface NOT IN ('oab','leitor','plano','fichamento');

CREATE INDEX IF NOT EXISTS chat_threads_user_facet_idx
  ON public.chat_threads (user_id, facet, created_at DESC);


-- ---- 20260624200809_69e72d48-6969-4a35-b082-27b08ed90479.sql ----

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


-- ---- 20260624204335_70e6d1de-91e6-4ded-ad2c-d57e0e2d4fe5.sql ----
-- 1) Faceta clio
ALTER TYPE chat_facet ADD VALUE IF NOT EXISTS 'clio';

-- 2) Audience em eventos
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'self'
    CHECK (audience IN ('self','clio'));

CREATE INDEX IF NOT EXISTS eventos_user_audience_inicio_idx
  ON public.eventos (user_id, audience, inicio);

-- 3) Configuração do Clio
CREATE TABLE IF NOT EXISTS public.clio_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text,
  voice text NOT NULL DEFAULT 'alloy',
  speech_rate numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clio_settings TO authenticated;
GRANT ALL ON public.clio_settings TO service_role;

ALTER TABLE public.clio_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own clio settings"
  ON public.clio_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER clio_settings_touch
  BEFORE UPDATE ON public.clio_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---- 20260624205003_794fc466-6b7a-4386-9da3-918e6d79b7aa.sql ----
-- 1) Tabela de memória persistente do Clio
CREATE TABLE public.clio_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('perfil','pessoas','gostos','rotina','escola','saude','alerta','outro')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  importance SMALLINT NOT NULL DEFAULT 2 CHECK (importance BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clio_memory TO authenticated;
GRANT ALL ON public.clio_memory TO service_role;

ALTER TABLE public.clio_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages own clio memory"
  ON public.clio_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX clio_memory_user_idx ON public.clio_memory (user_id, importance DESC, updated_at DESC);

CREATE TRIGGER clio_memory_touch
  BEFORE UPDATE ON public.clio_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Retomada da última conversa
ALTER TABLE public.clio_settings
  ADD COLUMN IF NOT EXISTS current_thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- ---- 20260624205820_b42c7fce-bf6b-4fd9-8774-27376006230f.sql ----
-- ============================================================
-- 1) Roles
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin','member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

-- Todos os usuários existentes viram admin do próprio workspace
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
ON CONFLICT DO NOTHING;

-- Trigger de signup agora também cria o papel admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

-- ============================================================
-- 2) Workspace members (admin ←→ convidados + escopo de módulos)
-- ============================================================
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modules TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id),
  CHECK (owner_id <> member_id)
);
GRANT SELECT ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace member visibility" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR member_id = auth.uid());
CREATE TRIGGER workspace_members_touch BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX workspace_members_owner_idx ON public.workspace_members(owner_id);

-- Helpers ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_workspace_owner()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.workspace_members WHERE member_id = auth.uid() LIMIT 1),
    auth.uid()
  )
$$;

-- Dono sempre passa; membro precisa do módulo na lista
CREATE OR REPLACE FUNCTION public.can_access_workspace(_owner uuid, _module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT
    auth.uid() = _owner
    OR EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE owner_id = _owner
        AND member_id = auth.uid()
        AND _module = ANY(modules)
    )
$$;

-- ============================================================
-- 3) Invitations
-- ============================================================
CREATE TABLE public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  modules TEXT[] NOT NULL DEFAULT '{}',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invitations TO authenticated;
GRANT ALL ON public.workspace_invitations TO service_role;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages invites" ON public.workspace_invitations
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER workspace_invitations_touch BEFORE UPDATE ON public.workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX workspace_invitations_token_idx
  ON public.workspace_invitations(token) WHERE status='pending';

-- ============================================================
-- 4) RLS por módulo nas tabelas existentes
-- ============================================================
-- chat
DROP POLICY "own threads" ON public.chat_threads;
CREATE POLICY "workspace chat threads" ON public.chat_threads
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'chat'))
  WITH CHECK (public.can_access_workspace(user_id, 'chat'));

DROP POLICY "own messages" ON public.chat_messages;
CREATE POLICY "workspace chat messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'chat'))
  WITH CHECK (public.can_access_workspace(user_id, 'chat'));

-- agenda
DROP POLICY "own eventos" ON public.eventos;
CREATE POLICY "workspace eventos" ON public.eventos
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'agenda'))
  WITH CHECK (public.can_access_workspace(user_id, 'agenda'));

-- livros
DROP POLICY "own livros" ON public.livros;
CREATE POLICY "workspace livros" ON public.livros
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'livros'))
  WITH CHECK (public.can_access_workspace(user_id, 'livros'));

-- reunioes
DROP POLICY "own reunioes" ON public.reunioes;
CREATE POLICY "workspace reunioes" ON public.reunioes
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'reunioes'))
  WITH CHECK (public.can_access_workspace(user_id, 'reunioes'));

-- treinos (todas as 5 tabelas)
DROP POLICY "own treino_sessoes" ON public.treino_sessoes;
CREATE POLICY "workspace treino_sessoes" ON public.treino_sessoes
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'treinos'))
  WITH CHECK (public.can_access_workspace(user_id, 'treinos'));

DROP POLICY "own treino_templates" ON public.treino_templates;
CREATE POLICY "workspace treino_templates" ON public.treino_templates
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'treinos'))
  WITH CHECK (public.can_access_workspace(user_id, 'treinos'));

DROP POLICY "own treino_template_exercicios" ON public.treino_template_exercicios;
CREATE POLICY "workspace treino_template_exercicios" ON public.treino_template_exercicios
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'treinos'))
  WITH CHECK (public.can_access_workspace(user_id, 'treinos'));

DROP POLICY "own treino_sessao_exercicios" ON public.treino_sessao_exercicios;
CREATE POLICY "workspace treino_sessao_exercicios" ON public.treino_sessao_exercicios
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'treinos'))
  WITH CHECK (public.can_access_workspace(user_id, 'treinos'));

DROP POLICY "own treino_series" ON public.treino_series;
CREATE POLICY "workspace treino_series" ON public.treino_series
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'treinos'))
  WITH CHECK (public.can_access_workspace(user_id, 'treinos'));

DROP POLICY "own corpo_sinais" ON public.corpo_sinais;
CREATE POLICY "workspace corpo_sinais" ON public.corpo_sinais
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'treinos'))
  WITH CHECK (public.can_access_workspace(user_id, 'treinos'));

-- clio
DROP POLICY "owner manages own clio memory" ON public.clio_memory;
CREATE POLICY "workspace clio memory" ON public.clio_memory
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'clio'))
  WITH CHECK (public.can_access_workspace(user_id, 'clio'));

DROP POLICY "own clio settings" ON public.clio_settings;
CREATE POLICY "workspace clio settings" ON public.clio_settings
  FOR ALL TO authenticated
  USING (public.can_access_workspace(user_id, 'clio'))
  WITH CHECK (public.can_access_workspace(user_id, 'clio'));

-- profiles: cada um gerencia o próprio + leitura cruzada dentro do workspace
DROP POLICY "own profile" ON public.profiles;
CREATE POLICY "profiles - read same workspace" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (wm.owner_id = auth.uid() AND wm.member_id = profiles.id)
         OR (wm.member_id = auth.uid() AND wm.owner_id = profiles.id)
    )
  );
CREATE POLICY "profiles - manage own" ON public.profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---- 20260624205855_e97d84cb-edc6-4087-9306-7bb454ebc841.sql ----
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_workspace(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_workspace_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_workspace(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_workspace_owner() TO authenticated, service_role;

-- ---- 20260624210901_ac2212c4-b4fe-4980-99d9-9d7bb7f32627.sql ----

-- ============ REGISTRO VIVO ============
CREATE TABLE public.registro_vivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('nota','evento','sentimento','ideia','dor','ganho','sonho','pergunta')),
  body TEXT NOT NULL,
  mood SMALLINT CHECK (mood IS NULL OR (mood >= -3 AND mood <= 3)),
  tags TEXT[] NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX registro_vivo_user_occurred_idx ON public.registro_vivo (user_id, occurred_at DESC);
CREATE INDEX registro_vivo_user_kind_idx ON public.registro_vivo (user_id, kind);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registro_vivo TO authenticated;
GRANT ALL ON public.registro_vivo TO service_role;
ALTER TABLE public.registro_vivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registro_vivo workspace access"
  ON public.registro_vivo FOR ALL
  USING (public.can_access_workspace(user_id, 'agenda'))
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER registro_vivo_touch BEFORE UPDATE ON public.registro_vivo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ JARDIM (memórias com repetição espaçada) ============
CREATE TABLE public.jardim_memorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT,
  source_ref UUID,
  category TEXT NOT NULL DEFAULT 'geral',
  tags TEXT[] NOT NULL DEFAULT '{}',
  importance SMALLINT NOT NULL DEFAULT 2 CHECK (importance BETWEEN 1 AND 3),
  ease NUMERIC NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 1,
  review_count INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX jardim_user_due_idx ON public.jardim_memorias (user_id, next_review_at) WHERE archived_at IS NULL;
CREATE INDEX jardim_user_created_idx ON public.jardim_memorias (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jardim_memorias TO authenticated;
GRANT ALL ON public.jardim_memorias TO service_role;
ALTER TABLE public.jardim_memorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jardim workspace access"
  ON public.jardim_memorias FOR ALL
  USING (public.can_access_workspace(user_id, 'agenda'))
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER jardim_touch BEFORE UPDATE ON public.jardim_memorias
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ CORPUS JURÍDICO CURADO ============
CREATE TABLE public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('constituicao','codigo','lei','decreto','sumula','tema','enunciado','outro')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  jurisdicao TEXT NOT NULL DEFAULT 'federal',
  ano INTEGER,
  numero TEXT,
  status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente','revogado','em_revisao','bloqueado')),
  source_url TEXT,
  editorial_notes TEXT,
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX legal_documents_kind_status_idx ON public.legal_documents (kind, status);
CREATE INDEX legal_documents_slug_idx ON public.legal_documents (slug);
GRANT SELECT ON public.legal_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_documents TO service_role;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal_documents read for authenticated"
  ON public.legal_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "legal_documents admin write"
  ON public.legal_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER legal_documents_touch BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.legal_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.legal_chunks(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('titulo','capitulo','secao','artigo','paragrafo','inciso','alinea')),
  path TEXT NOT NULL,
  ordinal INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente','revogado','em_revisao','bloqueado','alterado_recentemente')),
  revised_at TIMESTAMPTZ,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX legal_chunks_doc_path_idx ON public.legal_chunks (document_id, ordinal);
CREATE INDEX legal_chunks_text_trgm_idx ON public.legal_chunks USING GIN (to_tsvector('portuguese', text));
GRANT SELECT ON public.legal_chunks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_chunks TO service_role;
ALTER TABLE public.legal_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal_chunks read for authenticated"
  ON public.legal_chunks FOR SELECT TO authenticated USING (true);
CREATE POLICY "legal_chunks admin write"
  ON public.legal_chunks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER legal_chunks_touch BEFORE UPDATE ON public.legal_chunks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ---- 20260624215103_12b9cf74-b2cc-4ccb-abcf-650029308cad.sql ----
DROP TABLE IF EXISTS public.clio_memory CASCADE;
DROP TABLE IF EXISTS public.clio_settings CASCADE;
DROP INDEX IF EXISTS public.eventos_user_audience_inicio_idx;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS audience;

-- ---- 20260624215240_a612dd42-c5e2-46a6-aeff-40a7b6316341.sql ----
CREATE POLICY "avatares own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatares own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatares own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatares own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
DROP POLICY IF EXISTS "own profile write" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "own profile write" ON public.profiles FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---- 20260624220212_d170d851-83e1-45e0-b8b9-2ba362b1cdd2.sql ----

CREATE TABLE public.camara_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  modo text NOT NULL CHECK (modo IN ('audio','texto')),
  status text NOT NULL DEFAULT 'gravando' CHECK (status IN ('gravando','finalizado')),
  texto_rapido text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camara_sessoes TO authenticated;
GRANT ALL ON public.camara_sessoes TO service_role;
ALTER TABLE public.camara_sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camara_sessoes own" ON public.camara_sessoes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER camara_sessoes_touch BEFORE UPDATE ON public.camara_sessoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.camara_segmentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES public.camara_sessoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  inicio_seg int NOT NULL,
  fim_seg int NOT NULL,
  audio_path text,
  transcricao text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','transcribed','failed')),
  erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camara_segmentos TO authenticated;
GRANT ALL ON public.camara_segmentos TO service_role;
ALTER TABLE public.camara_segmentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camara_segmentos own" ON public.camara_segmentos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX camara_segmentos_sessao_idx ON public.camara_segmentos(sessao_id, ordem);
CREATE TRIGGER camara_segmentos_touch BEFORE UPDATE ON public.camara_segmentos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "camara_audio own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'camara-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "camara_audio own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'camara-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "camara_audio own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'camara-audio' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ---- 20260624220631_5826d534-bfa7-48b4-9d67-2b33ab21f293.sql ----

ALTER TABLE public.camara_sessoes
  ADD COLUMN IF NOT EXISTS analise jsonb,
  ADD COLUMN IF NOT EXISTS analise_at timestamptz;


-- ---- 20260624222311_62d6351e-70c3-44e4-9c6b-b0f2623bfc97.sql ----
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sedimento_nivel') then
    create type public.sedimento_nivel as enum (
      'iconic', 'echoic', 'short_term', 'working',
      'prospective', 'episodic', 'semantic', 'procedural'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'sedimento_status') then
    create type public.sedimento_status as enum (
      'rascunho', 'em_revisao', 'confirmado', 'descartado'
    );
  end if;
end$$;

create table if not exists public.sedimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  nivel public.sedimento_nivel not null default 'short_term',
  status public.sedimento_status not null default 'em_revisao',
  source_kind text not null default 'chat_message',
  source_ids uuid[] not null default '{}',
  hipotese text not null,
  resumo text,
  confianca smallint not null default 1,
  promovido_para uuid,
  promovido_tipo text,
  created_at timestamptz not null default now(),
  revisado_at timestamptz
);

create index if not exists sedimentos_user_thread_idx
  on public.sedimentos (user_id, thread_id, created_at desc);
create index if not exists sedimentos_status_idx
  on public.sedimentos (user_id, status);
create index if not exists sedimentos_source_ids_gin
  on public.sedimentos using gin (source_ids);

grant select, insert, update, delete on public.sedimentos to authenticated;
grant all on public.sedimentos to service_role;

alter table public.sedimentos enable row level security;

create policy "sedimentos: own rows"
  on public.sedimentos
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.chat_messages
  add column if not exists derived_from uuid[] not null default '{}';

alter table public.chat_threads
  add column if not exists last_sedimentado_at timestamptz;

-- ---- 20260624223202_1304a523-08c5-4330-9f15-c8a0b1e450f5.sql ----

-- VEHICLES
CREATE TABLE public.drive_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apelido TEXT NOT NULL,
  modelo TEXT,
  ano INT,
  placa TEXT,
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_vehicles TO authenticated;
GRANT ALL ON public.drive_vehicles TO service_role;
ALTER TABLE public.drive_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_vehicles owner" ON public.drive_vehicles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REFUELS
CREATE TABLE public.drive_refuels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  km INT NOT NULL,
  litros NUMERIC(8,3) NOT NULL,
  combustivel TEXT NOT NULL DEFAULT 'gasolina',
  preco_litro NUMERIC(8,3),
  total NUMERIC(10,2),
  posto TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_refuels TO authenticated;
GRANT ALL ON public.drive_refuels TO service_role;
ALTER TABLE public.drive_refuels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_refuels owner" ON public.drive_refuels FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_drive_refuels_vehicle ON public.drive_refuels(vehicle_id, ocorrido_em DESC);

-- OIL CHANGES
CREATE TABLE public.drive_oil_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  km INT NOT NULL,
  durabilidade_km INT NOT NULL DEFAULT 10000,
  tipo_oleo TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_oil_changes TO authenticated;
GRANT ALL ON public.drive_oil_changes TO service_role;
ALTER TABLE public.drive_oil_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_oil_changes owner" ON public.drive_oil_changes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_drive_oil_vehicle ON public.drive_oil_changes(vehicle_id, ocorrido_em DESC);

-- EXPENSES
CREATE TABLE public.drive_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  categoria TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_expenses TO authenticated;
GRANT ALL ON public.drive_expenses TO service_role;
ALTER TABLE public.drive_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_expenses owner" ON public.drive_expenses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_drive_expenses_user ON public.drive_expenses(user_id, ocorrido_em DESC);

-- TRIPS
CREATE TABLE public.drive_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  destino TEXT,
  km_inicial INT NOT NULL,
  km_final INT,
  pedagio NUMERIC(10,2),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_trips TO authenticated;
GRANT ALL ON public.drive_trips TO service_role;
ALTER TABLE public.drive_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_trips owner" ON public.drive_trips FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PARKINGS
CREATE TABLE public.drive_parkings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  local TEXT NOT NULL,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  custo NUMERIC(10,2),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_parkings TO authenticated;
GRANT ALL ON public.drive_parkings TO service_role;
ALTER TABLE public.drive_parkings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_parkings owner" ON public.drive_parkings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DOCS
CREATE TABLE public.drive_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  vence_em DATE NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_docs TO authenticated;
GRANT ALL ON public.drive_docs TO service_role;
ALTER TABLE public.drive_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_docs owner" ON public.drive_docs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE TRIGGER trg_drive_vehicles_upd BEFORE UPDATE ON public.drive_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_refuels_upd BEFORE UPDATE ON public.drive_refuels
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_oil_upd BEFORE UPDATE ON public.drive_oil_changes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_expenses_upd BEFORE UPDATE ON public.drive_expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_trips_upd BEFORE UPDATE ON public.drive_trips
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_parkings_upd BEFORE UPDATE ON public.drive_parkings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_docs_upd BEFORE UPDATE ON public.drive_docs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

