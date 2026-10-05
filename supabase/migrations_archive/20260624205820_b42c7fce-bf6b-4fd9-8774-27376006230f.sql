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