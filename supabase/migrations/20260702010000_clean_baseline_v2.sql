-- ============================================================================
-- Kaline Totalidade — Baseline única e idempotente para deploy novo
-- ============================================================================
-- Consolida as 39 migrations incrementais anteriores (agora em
-- supabase/migrations_legacy/) num único arquivo, para provisionar um
-- Supabase NOVO do zero. Não é para rodar contra o projeto de produção
-- atual (que já tem tudo isto aplicado via as migrations legadas — o
-- histórico de migrations do Supabase é rastreado no servidor, não pelos
-- arquivos locais).
--
-- Construído por leitura + validação empírica: as 39 migrations legadas
-- foram replayadas do zero contra um Postgres 16 real (com stubs mínimos
-- de auth.users/auth.uid() e storage.buckets/storage.objects), o schema
-- resultante foi extraído via pg_dump e cruzado contra
-- src/integrations/supabase/types.ts (gerado do projeto real). Isso
-- corrigiu enums que estavam errados numa tentativa anterior de baseline
-- única (app_role, chat_facet, sedimento_nivel, sedimento_status — o
-- último em especial sustenta a sedimentação e tinha valores totalmente
-- fictícios antes desta reconstrução).
--
-- Mudança deliberada em relação à produção atual: profiles.role e o
-- bootstrap de user_roles em handle_new_user() foram ENDURECIDOS. Hoje em
-- produção todo signup vira admin (profiles.role default 'admin' +
-- handle_new_user() sempre insere user_roles='admin'). Aqui, só o
-- PRIMEIRO usuário criado no projeto vira admin; qualquer signup seguinte
-- nasce role='user' e sem entrada em user_roles. Decisão explícita do
-- dono do projeto — não é assim que a produção atual se comporta.
-- ============================================================================

create extension if not exists pgcrypto;

-- As funções abaixo referenciam tabelas criadas mais adiante neste mesmo
-- arquivo (ex.: can_access_workspace referencia workspace_members). Sem
-- isto, o Postgres valida a existência das tabelas na CRIAÇÃO da função
-- (não só na execução) e a migration falha por ordem. Mesma prática do
-- pg_dump em dumps de schema real.
SET check_function_bodies = false;

-- ============================================================================
-- 1) Tipos enum
-- ============================================================================
-- app_role: papel GLOBAL usado por user_roles/has_role() — vocabulário
-- diferente de profiles.role (que é texto simples 'admin'/'user', ver mais
-- abaixo). Não confundir os dois sistemas.
do $$ begin create type public.app_role as enum ('admin', 'member'); exception when duplicate_object then null; end $$;
do $$ begin create type public.chat_facet as enum ('kaline', 'kharis', 'kuanyin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.evento_tipo as enum ('compromisso', 'aula', 'reuniao', 'evento', 'prazo', 'outro'); exception when duplicate_object then null; end $$;
do $$ begin create type public.semaforo_fisico as enum ('green', 'yellow', 'red', 'blue', 'neutral'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sessao_status as enum ('em_andamento', 'concluida', 'abandonada'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sinal_tipo as enum ('sono', 'energia', 'dor', 'humor', 'fome', 'estresse', 'outro'); exception when duplicate_object then null; end $$;
-- Taxonomia de memória (Atkinson-Shiffrin) usada pelo pipeline de sedimentação
-- (src/lib/sedimentar.functions.ts, const NIVEIS) — confirmado byte a byte
-- contra o código antes de escrever esta linha.
do $$ begin create type public.sedimento_nivel as enum ('iconic', 'echoic', 'short_term', 'working', 'prospective', 'episodic', 'semantic', 'procedural'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sedimento_status as enum ('rascunho', 'em_revisao', 'confirmado', 'descartado'); exception when duplicate_object then null; end $$;

-- ============================================================================
-- 2) Funções
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_workspace_owner()
returns uuid language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select owner_id from public.workspace_members where member_id = auth.uid() limit 1),
    auth.uid()
  )
$$;

create or replace function public.can_access_workspace(_owner uuid, _module text)
returns boolean language sql stable security definer set search_path = public
as $$
  select
    auth.uid() = _owner
    or exists (
      select 1 from public.workspace_members
      where owner_id = _owner
        and member_id = auth.uid()
        and _module = any(modules)
    )
$$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Bootstrap de signup ENDURECIDO: só o primeiro usuário do projeto vira
-- admin (profiles.role='admin' + user_roles=('admin')). Todo signup
-- seguinte nasce profiles.role='user' (default da coluna) e sem entrada em
-- user_roles — precisa de promoção manual e explícita depois.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  is_first_user boolean;
begin
  select not exists (select 1 from public.profiles) into is_first_user;

  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    case when is_first_user then 'admin' else 'user' end
  );

  if is_first_user then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 3) Tabelas (ordem respeita dependências de FK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    gender text,
    role text DEFAULT 'user'::text NOT NULL,
    assigned_facet text,
    initial_surface text DEFAULT 'chat'::text NOT NULL,
    CONSTRAINT profiles_assigned_facet_check CHECK ((assigned_facet = ANY (ARRAY['kaline'::text, 'kharis'::text, 'kuanyin'::text, 'klio'::text]))),
    CONSTRAINT profiles_gender_check CHECK ((gender = ANY (ARRAY['feminino'::text, 'masculino'::text, 'neutro'::text]))),
    CONSTRAINT profiles_initial_surface_check CHECK ((initial_surface = ANY (ARRAY['chat'::text, 'kaline_presente'::text]))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'user'::text]))),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    member_id uuid NOT NULL,
    modules text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workspace_members_check CHECK ((owner_id <> member_id)),
    CONSTRAINT workspace_members_pkey PRIMARY KEY (id),
    CONSTRAINT workspace_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT workspace_members_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    email text NOT NULL,
    modules text[] DEFAULT '{}'::text[] NOT NULL,
    token text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    accepted_by uuid,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workspace_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text]))),
    CONSTRAINT workspace_invitations_pkey PRIMARY KEY (id),
    CONSTRAINT workspace_invitations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.profile_initial_contexts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_by uuid NOT NULL,
    treatment_name text,
    main_goal text,
    tone text,
    important_context text,
    limits_and_cautions text,
    response_preferences text,
    admin_notes text,
    initial_seeds text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profile_initial_contexts_pkey PRIMARY KEY (id),
    CONSTRAINT profile_initial_contexts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT profile_initial_contexts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_roles_pkey PRIMARY KEY (id),
    CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.chat_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    surface text DEFAULT 'geral'::text NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    facet public.chat_facet DEFAULT 'kharis'::public.chat_facet NOT NULL,
    last_sedimentado_at timestamp with time zone,
    CONSTRAINT chat_threads_pkey PRIMARY KEY (id),
    CONSTRAINT chat_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    derived_from uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
    CONSTRAINT chat_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.jardim_memorias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    source text,
    source_ref uuid,
    category text DEFAULT 'geral'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    importance smallint DEFAULT 2 NOT NULL,
    ease numeric DEFAULT 2.5 NOT NULL,
    interval_days integer DEFAULT 1 NOT NULL,
    review_count integer DEFAULT 0 NOT NULL,
    next_review_at timestamp with time zone DEFAULT now() NOT NULL,
    last_reviewed_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT jardim_memorias_importance_check CHECK (((importance >= 1) AND (importance <= 3))),
    CONSTRAINT jardim_memorias_pkey PRIMARY KEY (id),
    CONSTRAINT jardim_memorias_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.memory_candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    domain text DEFAULT 'memory'::text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    source_id uuid,
    title text NOT NULL,
    content text NOT NULL,
    reason text,
    sensitivity text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    approved_memory_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT memory_candidates_domain_check CHECK ((domain = ANY (ARRAY['kaline'::text, 'kharis'::text, 'kuanyin'::text, 'drive'::text, 'memory'::text]))),
    CONSTRAINT memory_candidates_sensitivity_check CHECK ((sensitivity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT memory_candidates_source_check CHECK ((source = ANY (ARRAY['chat'::text, 'camara-do-eco'::text, 'codice'::text, 'registro-vivo'::text, 'manual'::text, 'system'::text]))),
    CONSTRAINT memory_candidates_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'archived'::text]))),
    CONSTRAINT memory_candidates_pkey PRIMARY KEY (id),
    CONSTRAINT memory_candidates_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id),
    CONSTRAINT memory_candidates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.registro_vivo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    body text NOT NULL,
    mood smallint,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT registro_vivo_kind_check CHECK ((kind = ANY (ARRAY['nota'::text, 'evento'::text, 'sentimento'::text, 'ideia'::text, 'dor'::text, 'ganho'::text, 'sonho'::text, 'pergunta'::text]))),
    CONSTRAINT registro_vivo_mood_check CHECK (((mood IS NULL) OR ((mood >= '-3'::integer) AND (mood <= 3)))),
    CONSTRAINT registro_vivo_pkey PRIMARY KEY (id),
    CONSTRAINT registro_vivo_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.presenca_regimes (
    user_id uuid NOT NULL,
    state text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT presenca_regimes_state_check CHECK ((state = ANY (ARRAY['green'::text, 'yellow'::text, 'blue'::text, 'red'::text]))),
    CONSTRAINT presenca_regimes_pkey PRIMARY KEY (user_id),
    CONSTRAINT presenca_regimes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.contexto_externo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    titulo text NOT NULL,
    conteudo text NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tipo text DEFAULT 'identidade'::text NOT NULL,
    CONSTRAINT contexto_externo_tipo_check CHECK ((tipo = ANY (ARRAY['identidade'::text, 'memoria_relacional'::text]))),
    CONSTRAINT contexto_externo_pkey PRIMARY KEY (id),
    CONSTRAINT contexto_externo_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.eventos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    titulo text NOT NULL,
    descricao text,
    tipo public.evento_tipo DEFAULT 'compromisso'::public.evento_tipo NOT NULL,
    inicio timestamp with time zone NOT NULL,
    fim timestamp with time zone,
    local text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT eventos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.sedimentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    thread_id uuid NOT NULL,
    nivel public.sedimento_nivel DEFAULT 'short_term'::public.sedimento_nivel NOT NULL,
    status public.sedimento_status DEFAULT 'em_revisao'::public.sedimento_status NOT NULL,
    source_kind text DEFAULT 'chat_message'::text NOT NULL,
    source_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    hipotese text NOT NULL,
    resumo text,
    confianca smallint DEFAULT 1 NOT NULL,
    promovido_para uuid,
    promovido_tipo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revisado_at timestamp with time zone,
    CONSTRAINT sedimentos_pkey PRIMARY KEY (id),
    CONSTRAINT sedimentos_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    CONSTRAINT sedimentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.business_contexts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    nome text NOT NULL,
    tipo text,
    servicos jsonb DEFAULT '[]'::jsonb NOT NULL,
    precos jsonb DEFAULT '{}'::jsonb NOT NULL,
    tom_voz text,
    formas_pagamento jsonb DEFAULT '[]'::jsonb NOT NULL,
    pix_chave text,
    regras_agenda jsonb DEFAULT '{}'::jsonb NOT NULL,
    limites_decisao jsonb DEFAULT '{}'::jsonb NOT NULL,
    regras_escalonamento jsonb DEFAULT '{}'::jsonb NOT NULL,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_contexts_pkey PRIMARY KEY (id),
    CONSTRAINT business_contexts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kuanyin_guardians (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    admin_user_id uuid,
    business_context_id uuid NOT NULL,
    public_slug text NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kuanyin_guardians_public_slug_format CHECK ((public_slug ~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$'::text)),
    CONSTRAINT kuanyin_guardians_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'suspended'::text, 'archived'::text]))),
    CONSTRAINT kuanyin_guardians_pkey PRIMARY KEY (id),
    CONSTRAINT kuanyin_guardians_public_slug_key UNIQUE (public_slug),
    CONSTRAINT kuanyin_guardians_business_context_id_fkey FOREIGN KEY (business_context_id) REFERENCES public.business_contexts(id) ON DELETE CASCADE,
    CONSTRAINT kuanyin_guardians_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kuanyin_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    business_context_id uuid,
    nome text NOT NULL,
    telefone text,
    email text,
    preferencias jsonb DEFAULT '{}'::jsonb NOT NULL,
    notas text,
    status text DEFAULT 'prospect'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    linked_user_id uuid,
    CONSTRAINT kuanyin_clients_status_check CHECK ((status = ANY (ARRAY['prospect'::text, 'confirmed'::text, 'archived'::text]))),
    CONSTRAINT kuanyin_clients_pkey PRIMARY KEY (id),
    CONSTRAINT kuanyin_clients_business_context_id_fkey FOREIGN KEY (business_context_id) REFERENCES public.business_contexts(id) ON DELETE SET NULL,
    CONSTRAINT kuanyin_clients_linked_user_id_fkey FOREIGN KEY (linked_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT kuanyin_clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kuanyin_appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid,
    business_context_id uuid,
    service_name text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone,
    price_cents integer,
    status text DEFAULT 'proposed'::text NOT NULL,
    notes text,
    evento_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kuanyin_appointments_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text]))),
    CONSTRAINT kuanyin_appointments_pkey PRIMARY KEY (id),
    CONSTRAINT kuanyin_appointments_business_context_id_fkey FOREIGN KEY (business_context_id) REFERENCES public.business_contexts(id) ON DELETE SET NULL,
    CONSTRAINT kuanyin_appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.kuanyin_clients(id) ON DELETE SET NULL,
    CONSTRAINT kuanyin_appointments_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id) ON DELETE SET NULL,
    CONSTRAINT kuanyin_appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kuanyin_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid,
    business_context_id uuid,
    description text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    price_cents integer,
    status text DEFAULT 'draft'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kuanyin_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'proposed'::text, 'confirmed'::text, 'cancelled'::text, 'delivered'::text]))),
    CONSTRAINT kuanyin_orders_pkey PRIMARY KEY (id),
    CONSTRAINT kuanyin_orders_business_context_id_fkey FOREIGN KEY (business_context_id) REFERENCES public.business_contexts(id) ON DELETE SET NULL,
    CONSTRAINT kuanyin_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.kuanyin_clients(id) ON DELETE SET NULL,
    CONSTRAINT kuanyin_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kuanyin_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    appointment_id uuid,
    amount_cents integer NOT NULL,
    method text,
    comprovante_ref text,
    status text DEFAULT 'received_proof'::text NOT NULL,
    fraud_alert_note text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kuanyin_payments_status_check CHECK ((status = ANY (ARRAY['received_proof'::text, 'verified'::text, 'rejected'::text, 'pending'::text]))),
    CONSTRAINT kuanyin_payments_pkey PRIMARY KEY (id),
    CONSTRAINT kuanyin_payments_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.kuanyin_appointments(id) ON DELETE SET NULL,
    CONSTRAINT kuanyin_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.kuanyin_orders(id) ON DELETE SET NULL,
    CONSTRAINT kuanyin_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kuanyin_appointment_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    appointment_id uuid NOT NULL,
    send_at timestamp with time zone NOT NULL,
    channel text DEFAULT 'manual'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kuanyin_appointment_reminders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT kuanyin_appointment_reminders_pkey PRIMARY KEY (id),
    CONSTRAINT kuanyin_appointment_reminders_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.kuanyin_appointments(id) ON DELETE CASCADE,
    CONSTRAINT kuanyin_appointment_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kuanyin_integrity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    thread_id uuid,
    severity text NOT NULL,
    category text NOT NULL,
    note text,
    excerpt text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kuanyin_integrity_logs_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warn'::text, 'block'::text]))),
    CONSTRAINT kuanyin_integrity_logs_pkey PRIMARY KEY (id),
    CONSTRAINT kuanyin_integrity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kuanyin_portal_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    scope text NOT NULL,
    appointment_id uuid,
    order_id uuid,
    label text,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kpt_target_present CHECK ((((scope = 'appointment'::text) AND (appointment_id IS NOT NULL) AND (order_id IS NULL)) OR ((scope = 'order'::text) AND (order_id IS NOT NULL) AND (appointment_id IS NULL)))),
    CONSTRAINT kuanyin_portal_tokens_scope_check CHECK ((scope = ANY (ARRAY['appointment'::text, 'order'::text]))),
    CONSTRAINT kuanyin_portal_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT kuanyin_portal_tokens_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.kuanyin_appointments(id) ON DELETE CASCADE,
    CONSTRAINT kuanyin_portal_tokens_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.kuanyin_orders(id) ON DELETE CASCADE,
    CONSTRAINT kuanyin_portal_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kuanyin_public_chat_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guardian_id uuid NOT NULL,
    user_id uuid NOT NULL,
    business_context_id uuid,
    visitor_name text,
    visitor_key text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kuanyin_public_chat_threads_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'archived'::text]))),
    CONSTRAINT kuanyin_public_chat_threads_pkey PRIMARY KEY (id),
    CONSTRAINT kuanyin_public_chat_threads_business_context_id_fkey FOREIGN KEY (business_context_id) REFERENCES public.business_contexts(id) ON DELETE SET NULL,
    CONSTRAINT kuanyin_public_chat_threads_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES public.kuanyin_guardians(id) ON DELETE CASCADE,
    CONSTRAINT kuanyin_public_chat_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kuanyin_public_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    guardian_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kuanyin_public_chat_messages_role_check CHECK ((role = ANY (ARRAY['visitor'::text, 'kuanyin'::text]))),
    CONSTRAINT kuanyin_public_chat_messages_pkey PRIMARY KEY (id),
    CONSTRAINT kuanyin_public_chat_messages_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES public.kuanyin_guardians(id) ON DELETE CASCADE,
    CONSTRAINT kuanyin_public_chat_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.kuanyin_public_chat_threads(id) ON DELETE CASCADE,
    CONSTRAINT kuanyin_public_chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- livros: shape reconstruído a partir de 7 migrations legadas (armazenamento
-- de EPUB no Storage do Códice, local-first, import do Google Drive). O
-- constraint de armazenamento_origem usa a versão final/mais permissiva.
CREATE TABLE IF NOT EXISTS public.livros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    titulo text NOT NULL,
    autor text,
    arquivo_path text,
    texto_extraido text,
    resumo text,
    infografico_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    arquivo_nome text,
    arquivo_mime text,
    arquivo_ext text,
    leitura_percentual numeric(5,2) DEFAULT 0 NOT NULL,
    leitura_posicao jsonb DEFAULT '{}'::jsonb NOT NULL,
    ultimo_acesso_em timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    armazenamento_origem text DEFAULT 'device'::text NOT NULL,
    arquivo_local_nome text,
    arquivo_local_mime text,
    google_drive_file_id text,
    google_drive_web_view_link text,
    google_drive_modified_time timestamp with time zone,
    storage_bucket text,
    storage_path text,
    file_size bigint,
    mime_type text,
    origem text DEFAULT 'upload'::text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT livros_codice_storage_path_shape CHECK (((storage_path IS NULL) OR (storage_path = ((((user_id)::text || '/'::text) || (id)::text) || '.epub'::text)))),
    CONSTRAINT livros_leitura_percentual_range CHECK (((leitura_percentual >= (0)::numeric) AND (leitura_percentual <= (100)::numeric))),
    CONSTRAINT livros_armazenamento_origem_check CHECK ((armazenamento_origem = ANY (ARRAY['device'::text, 'cloud-legacy'::text, 'google-drive'::text, 'codice-books'::text, 'supabase-storage'::text]))),
    CONSTRAINT livros_pkey PRIMARY KEY (id),
    CONSTRAINT livros_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.codice_margens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    livro_id uuid,
    trecho text,
    nota text NOT NULL,
    localizacao jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT codice_margens_pkey PRIMARY KEY (id),
    CONSTRAINT codice_margens_livro_id_fkey FOREIGN KEY (livro_id) REFERENCES public.livros(id) ON DELETE SET NULL,
    CONSTRAINT codice_margens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.camara_sessoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    titulo text NOT NULL,
    modo text NOT NULL,
    status text DEFAULT 'gravando'::text NOT NULL,
    texto_rapido text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    analise jsonb,
    analise_at timestamp with time zone,
    CONSTRAINT camara_sessoes_modo_check CHECK ((modo = ANY (ARRAY['audio'::text, 'texto'::text]))),
    CONSTRAINT camara_sessoes_status_check CHECK ((status = ANY (ARRAY['gravando'::text, 'finalizado'::text]))),
    CONSTRAINT camara_sessoes_pkey PRIMARY KEY (id),
    CONSTRAINT camara_sessoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.camara_segmentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sessao_id uuid NOT NULL,
    user_id uuid NOT NULL,
    ordem integer NOT NULL,
    inicio_seg integer NOT NULL,
    fim_seg integer NOT NULL,
    audio_path text,
    transcricao text,
    status text DEFAULT 'queued'::text NOT NULL,
    erro text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT camara_segmentos_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'processing'::text, 'transcribed'::text, 'failed'::text]))),
    CONSTRAINT camara_segmentos_pkey PRIMARY KEY (id),
    CONSTRAINT camara_segmentos_sessao_id_fkey FOREIGN KEY (sessao_id) REFERENCES public.camara_sessoes(id) ON DELETE CASCADE,
    CONSTRAINT camara_segmentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.corpo_sinais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tipo public.sinal_tipo NOT NULL,
    intensidade integer,
    nota text,
    registrado_em timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT corpo_sinais_intensidade_check CHECK (((intensidade >= 0) AND (intensidade <= 10))),
    CONSTRAINT corpo_sinais_pkey PRIMARY KEY (id),
    CONSTRAINT corpo_sinais_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.treino_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    nome text NOT NULL,
    descricao text,
    dias_semana integer[] DEFAULT '{}'::integer[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT treino_templates_pkey PRIMARY KEY (id),
    CONSTRAINT treino_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.treino_template_exercicios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_id uuid NOT NULL,
    nome text NOT NULL,
    grupo_muscular text,
    series_alvo integer,
    reps_alvo text,
    ordem integer DEFAULT 0 NOT NULL,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT treino_template_exercicios_pkey PRIMARY KEY (id),
    CONSTRAINT treino_template_exercicios_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.treino_templates(id) ON DELETE CASCADE,
    CONSTRAINT treino_template_exercicios_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.treino_sessoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_id uuid,
    iniciada_em timestamp with time zone DEFAULT now() NOT NULL,
    encerrada_em timestamp with time zone,
    duracao_segundos integer,
    semaforo public.semaforo_fisico DEFAULT 'neutral'::public.semaforo_fisico NOT NULL,
    status public.sessao_status DEFAULT 'em_andamento'::public.sessao_status NOT NULL,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT treino_sessoes_pkey PRIMARY KEY (id),
    CONSTRAINT treino_sessoes_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.treino_templates(id) ON DELETE SET NULL,
    CONSTRAINT treino_sessoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.treino_sessao_exercicios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sessao_id uuid NOT NULL,
    nome text NOT NULL,
    grupo_muscular text,
    ordem integer DEFAULT 0 NOT NULL,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT treino_sessao_exercicios_pkey PRIMARY KEY (id),
    CONSTRAINT treino_sessao_exercicios_sessao_id_fkey FOREIGN KEY (sessao_id) REFERENCES public.treino_sessoes(id) ON DELETE CASCADE,
    CONSTRAINT treino_sessao_exercicios_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.treino_series (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sessao_exercicio_id uuid NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    peso numeric(6,2),
    reps integer,
    rir integer,
    descanso_segundos integer,
    concluida boolean DEFAULT false NOT NULL,
    registrada_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT treino_series_pkey PRIMARY KEY (id),
    CONSTRAINT treino_series_sessao_exercicio_id_fkey FOREIGN KEY (sessao_exercicio_id) REFERENCES public.treino_sessao_exercicios(id) ON DELETE CASCADE,
    CONSTRAINT treino_series_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.drive_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    apelido text NOT NULL,
    modelo text,
    ano integer,
    placa text,
    foto_url text,
    ativo boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drive_vehicles_pkey PRIMARY KEY (id),
    CONSTRAINT drive_vehicles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.drive_refuels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    ocorrido_em timestamp with time zone DEFAULT now() NOT NULL,
    km integer NOT NULL,
    litros numeric(8,3) NOT NULL,
    combustivel text DEFAULT 'gasolina'::text NOT NULL,
    preco_litro numeric(8,3),
    total numeric(10,2),
    posto text,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drive_refuels_pkey PRIMARY KEY (id),
    CONSTRAINT drive_refuels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT drive_refuels_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.drive_vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.drive_oil_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    ocorrido_em timestamp with time zone DEFAULT now() NOT NULL,
    km integer NOT NULL,
    durabilidade_km integer DEFAULT 10000 NOT NULL,
    tipo_oleo text,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drive_oil_changes_pkey PRIMARY KEY (id),
    CONSTRAINT drive_oil_changes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT drive_oil_changes_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.drive_vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.drive_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid,
    ocorrido_em timestamp with time zone DEFAULT now() NOT NULL,
    categoria text NOT NULL,
    valor numeric(10,2) NOT NULL,
    descricao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drive_expenses_pkey PRIMARY KEY (id),
    CONSTRAINT drive_expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT drive_expenses_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.drive_vehicles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.drive_trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    iniciado_em timestamp with time zone DEFAULT now() NOT NULL,
    finalizado_em timestamp with time zone,
    destino text,
    km_inicial integer NOT NULL,
    km_final integer,
    pedagio numeric(10,2),
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drive_trips_pkey PRIMARY KEY (id),
    CONSTRAINT drive_trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT drive_trips_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.drive_vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.drive_docs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    tipo text NOT NULL,
    vence_em date NOT NULL,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drive_docs_pkey PRIMARY KEY (id),
    CONSTRAINT drive_docs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT drive_docs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.drive_vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.drive_parkings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid,
    local text NOT NULL,
    iniciado_em timestamp with time zone DEFAULT now() NOT NULL,
    finalizado_em timestamp with time zone,
    expira_em timestamp with time zone,
    custo numeric(10,2),
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drive_parkings_pkey PRIMARY KEY (id),
    CONSTRAINT drive_parkings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT drive_parkings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.drive_vehicles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.legal_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    jurisdicao text DEFAULT 'federal'::text NOT NULL,
    ano integer,
    numero text,
    status text DEFAULT 'vigente'::text NOT NULL,
    source_url text,
    editorial_notes text,
    imported_by uuid,
    imported_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT legal_documents_kind_check CHECK ((kind = ANY (ARRAY['constituicao'::text, 'codigo'::text, 'lei'::text, 'decreto'::text, 'sumula'::text, 'tema'::text, 'enunciado'::text, 'outro'::text]))),
    CONSTRAINT legal_documents_status_check CHECK ((status = ANY (ARRAY['vigente'::text, 'revogado'::text, 'em_revisao'::text, 'bloqueado'::text]))),
    CONSTRAINT legal_documents_pkey PRIMARY KEY (id),
    CONSTRAINT legal_documents_slug_key UNIQUE (slug),
    CONSTRAINT legal_documents_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.legal_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    parent_id uuid,
    level text NOT NULL,
    path text NOT NULL,
    ordinal integer DEFAULT 0 NOT NULL,
    text text NOT NULL,
    status text DEFAULT 'vigente'::text NOT NULL,
    revised_at timestamp with time zone,
    source_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT legal_chunks_level_check CHECK ((level = ANY (ARRAY['titulo'::text, 'capitulo'::text, 'secao'::text, 'artigo'::text, 'paragrafo'::text, 'inciso'::text, 'alinea'::text]))),
    CONSTRAINT legal_chunks_status_check CHECK ((status = ANY (ARRAY['vigente'::text, 'revogado'::text, 'em_revisao'::text, 'bloqueado'::text, 'alterado_recentemente'::text]))),
    CONSTRAINT legal_chunks_pkey PRIMARY KEY (id),
    CONSTRAINT legal_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    CONSTRAINT legal_chunks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.legal_chunks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.jurisprudencia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tribunal text,
    numero text,
    ementa text,
    conteudo text,
    fonte_url text,
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT jurisprudencia_pkey PRIMARY KEY (id),
    CONSTRAINT jurisprudencia_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.legislacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    titulo text NOT NULL,
    tipo text,
    artigo text,
    texto text,
    fonte_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT legislacao_pkey PRIMARY KEY (id),
    CONSTRAINT legislacao_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.reunioes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    titulo text NOT NULL,
    audio_path text,
    transcricao text,
    resumo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    infografico_url text,
    CONSTRAINT reunioes_pkey PRIMARY KEY (id),
    CONSTRAINT reunioes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================================
-- 4) Índices essenciais (não duplica os automáticos de PK/UNIQUE)
-- ============================================================================
CREATE INDEX IF NOT EXISTS business_contexts_user_id_idx ON public.business_contexts(user_id);
CREATE INDEX IF NOT EXISTS camara_segmentos_sessao_idx ON public.camara_segmentos(sessao_id, ordem);
CREATE INDEX IF NOT EXISTS chat_messages_thread_idx ON public.chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_threads_user_facet_idx ON public.chat_threads(user_id, facet, created_at DESC);
CREATE INDEX IF NOT EXISTS codice_margens_user_livro_idx ON public.codice_margens(user_id, livro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS codice_margens_localizacao_gin_idx ON public.codice_margens USING gin(localizacao);
CREATE INDEX IF NOT EXISTS codice_margens_tags_gin_idx ON public.codice_margens USING gin(tags);
CREATE INDEX IF NOT EXISTS contexto_externo_user_ativo_idx ON public.contexto_externo(user_id, ativo, updated_at DESC);
CREATE INDEX IF NOT EXISTS corpo_sinais_user_data_idx ON public.corpo_sinais(user_id, registrado_em DESC);
CREATE INDEX IF NOT EXISTS drive_docs_vehicle_id_idx ON public.drive_docs(vehicle_id);
CREATE INDEX IF NOT EXISTS drive_expenses_user_idx ON public.drive_expenses(user_id, ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS drive_expenses_vehicle_id_idx ON public.drive_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS drive_oil_changes_vehicle_idx ON public.drive_oil_changes(vehicle_id, ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS drive_refuels_vehicle_idx ON public.drive_refuels(vehicle_id, ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS drive_trips_vehicle_id_idx ON public.drive_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS eventos_user_created_at_idx ON public.eventos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS eventos_user_inicio_idx ON public.eventos(user_id, inicio);
CREATE INDEX IF NOT EXISTS jardim_user_created_idx ON public.jardim_memorias(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jardim_user_due_idx ON public.jardim_memorias(user_id, next_review_at) WHERE (archived_at IS NULL);
CREATE INDEX IF NOT EXISTS kuanyin_appts_business_idx ON public.kuanyin_appointments(business_context_id);
CREATE INDEX IF NOT EXISTS kuanyin_appts_client_idx ON public.kuanyin_appointments(client_id);
CREATE INDEX IF NOT EXISTS kuanyin_appts_user_starts_idx ON public.kuanyin_appointments(user_id, starts_at);
CREATE INDEX IF NOT EXISTS kuanyin_clients_business_idx ON public.kuanyin_clients(business_context_id);
CREATE INDEX IF NOT EXISTS kuanyin_clients_linked_user_idx ON public.kuanyin_clients(linked_user_id);
CREATE INDEX IF NOT EXISTS kuanyin_clients_user_idx ON public.kuanyin_clients(user_id);
CREATE INDEX IF NOT EXISTS kuanyin_guardians_admin_idx ON public.kuanyin_guardians(admin_user_id);
CREATE INDEX IF NOT EXISTS kuanyin_guardians_status_idx ON public.kuanyin_guardians(status);
CREATE INDEX IF NOT EXISTS kuanyin_guardians_user_idx ON public.kuanyin_guardians(user_id);
CREATE INDEX IF NOT EXISTS kuanyin_integrity_logs_user_idx ON public.kuanyin_integrity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kuanyin_orders_business_idx ON public.kuanyin_orders(business_context_id);
CREATE INDEX IF NOT EXISTS kuanyin_orders_client_idx ON public.kuanyin_orders(client_id);
CREATE INDEX IF NOT EXISTS kuanyin_orders_user_idx ON public.kuanyin_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kuanyin_payments_appointment_idx ON public.kuanyin_payments(appointment_id);
CREATE INDEX IF NOT EXISTS kuanyin_payments_order_idx ON public.kuanyin_payments(order_id);
CREATE INDEX IF NOT EXISTS kuanyin_payments_user_idx ON public.kuanyin_payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kuanyin_portal_tokens_appointment_idx ON public.kuanyin_portal_tokens(appointment_id);
CREATE INDEX IF NOT EXISTS kuanyin_portal_tokens_order_idx ON public.kuanyin_portal_tokens(order_id);
CREATE INDEX IF NOT EXISTS kuanyin_portal_tokens_user_idx ON public.kuanyin_portal_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kuanyin_public_messages_thread_idx ON public.kuanyin_public_chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS kuanyin_public_threads_guardian_idx ON public.kuanyin_public_chat_threads(guardian_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS kuanyin_public_threads_user_idx ON public.kuanyin_public_chat_threads(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS kuanyin_public_threads_visitor_idx ON public.kuanyin_public_chat_threads(guardian_id, visitor_key) WHERE (visitor_key IS NOT NULL);
CREATE INDEX IF NOT EXISTS legal_chunks_doc_path_idx ON public.legal_chunks(document_id, ordinal);
CREATE INDEX IF NOT EXISTS legal_documents_kind_status_idx ON public.legal_documents(kind, status);
CREATE INDEX IF NOT EXISTS livros_metadata_gin_idx ON public.livros USING gin(metadata);
CREATE INDEX IF NOT EXISTS livros_storage_path_idx ON public.livros(storage_bucket, storage_path);
CREATE INDEX IF NOT EXISTS livros_user_armazenamento_idx ON public.livros(user_id, armazenamento_origem, created_at DESC);
CREATE INDEX IF NOT EXISTS livros_user_ultimo_acesso_idx ON public.livros(user_id, ultimo_acesso_em DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS livros_google_drive_file_idx ON public.livros(user_id, google_drive_file_id) WHERE (google_drive_file_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS memory_candidates_metadata_gin_idx ON public.memory_candidates USING gin(metadata);
CREATE INDEX IF NOT EXISTS memory_candidates_source_idx ON public.memory_candidates(source, source_id);
CREATE INDEX IF NOT EXISTS memory_candidates_user_domain_idx ON public.memory_candidates(user_id, domain, created_at DESC);
CREATE INDEX IF NOT EXISTS memory_candidates_user_status_idx ON public.memory_candidates(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS registro_vivo_user_kind_idx ON public.registro_vivo(user_id, kind);
CREATE INDEX IF NOT EXISTS registro_vivo_user_occurred_idx ON public.registro_vivo(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS sedimentos_source_ids_gin_idx ON public.sedimentos USING gin(source_ids);
CREATE INDEX IF NOT EXISTS sedimentos_status_idx ON public.sedimentos(user_id, status);
CREATE INDEX IF NOT EXISTS sedimentos_user_thread_idx ON public.sedimentos(user_id, thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS treino_series_sessao_exercicio_idx ON public.treino_series(sessao_exercicio_id);
CREATE INDEX IF NOT EXISTS treino_series_user_idx ON public.treino_series(user_id);
CREATE INDEX IF NOT EXISTS treino_sessao_exercicios_sessao_idx ON public.treino_sessao_exercicios(sessao_id);
CREATE INDEX IF NOT EXISTS treino_sessao_exercicios_user_idx ON public.treino_sessao_exercicios(user_id);
CREATE INDEX IF NOT EXISTS treino_sessoes_user_data_idx ON public.treino_sessoes(user_id, iniciada_em DESC);
CREATE INDEX IF NOT EXISTS treino_template_exercicios_template_idx ON public.treino_template_exercicios(template_id);
CREATE INDEX IF NOT EXISTS treino_template_exercicios_user_idx ON public.treino_template_exercicios(user_id);
CREATE INDEX IF NOT EXISTS treino_templates_user_idx ON public.treino_templates(user_id);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS workspace_invitations_owner_id_idx ON public.workspace_invitations(owner_id);
CREATE INDEX IF NOT EXISTS workspace_invitations_token_idx ON public.workspace_invitations(token) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS workspace_members_member_id_idx ON public.workspace_members(member_id);
CREATE INDEX IF NOT EXISTS workspace_members_owner_id_idx ON public.workspace_members(owner_id);

-- ============================================================================
-- 5) Triggers touch_updated_at (uma por tabela com coluna updated_at)
-- ============================================================================
DROP TRIGGER IF EXISTS business_contexts_touch_updated_at ON public.business_contexts;
CREATE TRIGGER business_contexts_touch_updated_at BEFORE UPDATE ON public.business_contexts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS camara_segmentos_touch_updated_at ON public.camara_segmentos;
CREATE TRIGGER camara_segmentos_touch_updated_at BEFORE UPDATE ON public.camara_segmentos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS camara_sessoes_touch_updated_at ON public.camara_sessoes;
CREATE TRIGGER camara_sessoes_touch_updated_at BEFORE UPDATE ON public.camara_sessoes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS codice_margens_touch_updated_at ON public.codice_margens;
CREATE TRIGGER codice_margens_touch_updated_at BEFORE UPDATE ON public.codice_margens FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS contexto_externo_touch_updated_at ON public.contexto_externo;
CREATE TRIGGER contexto_externo_touch_updated_at BEFORE UPDATE ON public.contexto_externo FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS drive_docs_touch_updated_at ON public.drive_docs;
CREATE TRIGGER drive_docs_touch_updated_at BEFORE UPDATE ON public.drive_docs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS drive_expenses_touch_updated_at ON public.drive_expenses;
CREATE TRIGGER drive_expenses_touch_updated_at BEFORE UPDATE ON public.drive_expenses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS drive_oil_changes_touch_updated_at ON public.drive_oil_changes;
CREATE TRIGGER drive_oil_changes_touch_updated_at BEFORE UPDATE ON public.drive_oil_changes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS drive_parkings_touch_updated_at ON public.drive_parkings;
CREATE TRIGGER drive_parkings_touch_updated_at BEFORE UPDATE ON public.drive_parkings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS drive_refuels_touch_updated_at ON public.drive_refuels;
CREATE TRIGGER drive_refuels_touch_updated_at BEFORE UPDATE ON public.drive_refuels FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS drive_trips_touch_updated_at ON public.drive_trips;
CREATE TRIGGER drive_trips_touch_updated_at BEFORE UPDATE ON public.drive_trips FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS drive_vehicles_touch_updated_at ON public.drive_vehicles;
CREATE TRIGGER drive_vehicles_touch_updated_at BEFORE UPDATE ON public.drive_vehicles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS jardim_memorias_touch_updated_at ON public.jardim_memorias;
CREATE TRIGGER jardim_memorias_touch_updated_at BEFORE UPDATE ON public.jardim_memorias FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS kuanyin_appointment_reminders_touch_updated_at ON public.kuanyin_appointment_reminders;
CREATE TRIGGER kuanyin_appointment_reminders_touch_updated_at BEFORE UPDATE ON public.kuanyin_appointment_reminders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS kuanyin_appointments_touch_updated_at ON public.kuanyin_appointments;
CREATE TRIGGER kuanyin_appointments_touch_updated_at BEFORE UPDATE ON public.kuanyin_appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS kuanyin_clients_touch_updated_at ON public.kuanyin_clients;
CREATE TRIGGER kuanyin_clients_touch_updated_at BEFORE UPDATE ON public.kuanyin_clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS kuanyin_guardians_touch_updated_at ON public.kuanyin_guardians;
CREATE TRIGGER kuanyin_guardians_touch_updated_at BEFORE UPDATE ON public.kuanyin_guardians FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS kuanyin_orders_touch_updated_at ON public.kuanyin_orders;
CREATE TRIGGER kuanyin_orders_touch_updated_at BEFORE UPDATE ON public.kuanyin_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS kuanyin_payments_touch_updated_at ON public.kuanyin_payments;
CREATE TRIGGER kuanyin_payments_touch_updated_at BEFORE UPDATE ON public.kuanyin_payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS kuanyin_portal_tokens_touch_updated_at ON public.kuanyin_portal_tokens;
CREATE TRIGGER kuanyin_portal_tokens_touch_updated_at BEFORE UPDATE ON public.kuanyin_portal_tokens FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS kuanyin_public_chat_threads_touch_updated_at ON public.kuanyin_public_chat_threads;
CREATE TRIGGER kuanyin_public_chat_threads_touch_updated_at BEFORE UPDATE ON public.kuanyin_public_chat_threads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS legal_chunks_touch_updated_at ON public.legal_chunks;
CREATE TRIGGER legal_chunks_touch_updated_at BEFORE UPDATE ON public.legal_chunks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS legal_documents_touch_updated_at ON public.legal_documents;
CREATE TRIGGER legal_documents_touch_updated_at BEFORE UPDATE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS livros_touch_updated_at ON public.livros;
CREATE TRIGGER livros_touch_updated_at BEFORE UPDATE ON public.livros FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS memory_candidates_touch_updated_at ON public.memory_candidates;
CREATE TRIGGER memory_candidates_touch_updated_at BEFORE UPDATE ON public.memory_candidates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS presenca_regimes_touch_updated_at ON public.presenca_regimes;
CREATE TRIGGER presenca_regimes_touch_updated_at BEFORE UPDATE ON public.presenca_regimes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS profile_initial_contexts_touch_updated_at ON public.profile_initial_contexts;
CREATE TRIGGER profile_initial_contexts_touch_updated_at BEFORE UPDATE ON public.profile_initial_contexts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS registro_vivo_touch_updated_at ON public.registro_vivo;
CREATE TRIGGER registro_vivo_touch_updated_at BEFORE UPDATE ON public.registro_vivo FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS treino_sessoes_touch_updated_at ON public.treino_sessoes;
CREATE TRIGGER treino_sessoes_touch_updated_at BEFORE UPDATE ON public.treino_sessoes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS treino_templates_touch_updated_at ON public.treino_templates;
CREATE TRIGGER treino_templates_touch_updated_at BEFORE UPDATE ON public.treino_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS workspace_invitations_touch_updated_at ON public.workspace_invitations;
CREATE TRIGGER workspace_invitations_touch_updated_at BEFORE UPDATE ON public.workspace_invitations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS workspace_members_touch_updated_at ON public.workspace_members;
CREATE TRIGGER workspace_members_touch_updated_at BEFORE UPDATE ON public.workspace_members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- 6) RLS: enable em todas as 47 tabelas
-- ============================================================================
ALTER TABLE public.business_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_segmentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codice_margens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contexto_externo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corpo_sinais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_oil_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_parkings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_refuels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jardim_memorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisprudencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuanyin_appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuanyin_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuanyin_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuanyin_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuanyin_integrity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuanyin_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuanyin_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuanyin_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuanyin_public_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuanyin_public_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presenca_regimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_initial_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_vivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treino_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treino_sessao_exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treino_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treino_template_exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treino_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7) RLS: policies owner-only (auth.uid() = user_id, sem workspace)
-- ============================================================================
DROP POLICY IF EXISTS business_contexts_own_rows ON public.business_contexts;
CREATE POLICY business_contexts_own_rows ON public.business_contexts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS camara_segmentos_own_rows ON public.camara_segmentos;
CREATE POLICY camara_segmentos_own_rows ON public.camara_segmentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS camara_sessoes_own_rows ON public.camara_sessoes;
CREATE POLICY camara_sessoes_own_rows ON public.camara_sessoes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS contexto_externo_own_rows ON public.contexto_externo;
CREATE POLICY contexto_externo_own_rows ON public.contexto_externo FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS drive_docs_own_rows ON public.drive_docs;
CREATE POLICY drive_docs_own_rows ON public.drive_docs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS drive_expenses_own_rows ON public.drive_expenses;
CREATE POLICY drive_expenses_own_rows ON public.drive_expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS drive_oil_changes_own_rows ON public.drive_oil_changes;
CREATE POLICY drive_oil_changes_own_rows ON public.drive_oil_changes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS drive_parkings_own_rows ON public.drive_parkings;
CREATE POLICY drive_parkings_own_rows ON public.drive_parkings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS drive_refuels_own_rows ON public.drive_refuels;
CREATE POLICY drive_refuels_own_rows ON public.drive_refuels FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS drive_trips_own_rows ON public.drive_trips;
CREATE POLICY drive_trips_own_rows ON public.drive_trips FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS drive_vehicles_own_rows ON public.drive_vehicles;
CREATE POLICY drive_vehicles_own_rows ON public.drive_vehicles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jurisprudencia_own_rows ON public.jurisprudencia;
CREATE POLICY jurisprudencia_own_rows ON public.jurisprudencia FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS kuanyin_appointment_reminders_own_rows ON public.kuanyin_appointment_reminders;
CREATE POLICY kuanyin_appointment_reminders_own_rows ON public.kuanyin_appointment_reminders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS kuanyin_appointments_own_rows ON public.kuanyin_appointments;
CREATE POLICY kuanyin_appointments_own_rows ON public.kuanyin_appointments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS kuanyin_clients_own_rows ON public.kuanyin_clients;
CREATE POLICY kuanyin_clients_own_rows ON public.kuanyin_clients FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS kuanyin_integrity_logs_own_rows ON public.kuanyin_integrity_logs;
CREATE POLICY kuanyin_integrity_logs_own_rows ON public.kuanyin_integrity_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS kuanyin_orders_own_rows ON public.kuanyin_orders;
CREATE POLICY kuanyin_orders_own_rows ON public.kuanyin_orders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS kuanyin_payments_own_rows ON public.kuanyin_payments;
CREATE POLICY kuanyin_payments_own_rows ON public.kuanyin_payments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS kuanyin_portal_tokens_own_rows ON public.kuanyin_portal_tokens;
CREATE POLICY kuanyin_portal_tokens_own_rows ON public.kuanyin_portal_tokens FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS legislacao_own_rows ON public.legislacao;
CREATE POLICY legislacao_own_rows ON public.legislacao FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS memory_candidates_own_rows ON public.memory_candidates;
CREATE POLICY memory_candidates_own_rows ON public.memory_candidates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS presenca_regimes_own_rows ON public.presenca_regimes;
CREATE POLICY presenca_regimes_own_rows ON public.presenca_regimes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS sedimentos_own_rows ON public.sedimentos;
CREATE POLICY sedimentos_own_rows ON public.sedimentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_roles_own_rows ON public.user_roles;
CREATE POLICY user_roles_own_rows ON public.user_roles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8) RLS: policies workspace-shared (leitura e escrita para membros liberados)
-- ============================================================================
DROP POLICY IF EXISTS chat_messages_workspace_access ON public.chat_messages;
CREATE POLICY chat_messages_workspace_access ON public.chat_messages FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'chat')) WITH CHECK (public.can_access_workspace(user_id, 'chat'));
DROP POLICY IF EXISTS chat_threads_workspace_access ON public.chat_threads;
CREATE POLICY chat_threads_workspace_access ON public.chat_threads FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'chat')) WITH CHECK (public.can_access_workspace(user_id, 'chat'));
DROP POLICY IF EXISTS codice_margens_workspace_access ON public.codice_margens;
CREATE POLICY codice_margens_workspace_access ON public.codice_margens FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'livros')) WITH CHECK (public.can_access_workspace(user_id, 'livros'));
DROP POLICY IF EXISTS corpo_sinais_workspace_access ON public.corpo_sinais;
CREATE POLICY corpo_sinais_workspace_access ON public.corpo_sinais FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'treinos')) WITH CHECK (public.can_access_workspace(user_id, 'treinos'));
DROP POLICY IF EXISTS eventos_workspace_access ON public.eventos;
CREATE POLICY eventos_workspace_access ON public.eventos FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'agenda')) WITH CHECK (public.can_access_workspace(user_id, 'agenda'));
DROP POLICY IF EXISTS livros_workspace_access ON public.livros;
CREATE POLICY livros_workspace_access ON public.livros FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'livros')) WITH CHECK (public.can_access_workspace(user_id, 'livros'));
DROP POLICY IF EXISTS reunioes_workspace_access ON public.reunioes;
CREATE POLICY reunioes_workspace_access ON public.reunioes FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'reunioes')) WITH CHECK (public.can_access_workspace(user_id, 'reunioes'));
DROP POLICY IF EXISTS treino_series_workspace_access ON public.treino_series;
CREATE POLICY treino_series_workspace_access ON public.treino_series FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'treinos')) WITH CHECK (public.can_access_workspace(user_id, 'treinos'));
DROP POLICY IF EXISTS treino_sessao_exercicios_workspace_access ON public.treino_sessao_exercicios;
CREATE POLICY treino_sessao_exercicios_workspace_access ON public.treino_sessao_exercicios FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'treinos')) WITH CHECK (public.can_access_workspace(user_id, 'treinos'));
DROP POLICY IF EXISTS treino_sessoes_workspace_access ON public.treino_sessoes;
CREATE POLICY treino_sessoes_workspace_access ON public.treino_sessoes FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'treinos')) WITH CHECK (public.can_access_workspace(user_id, 'treinos'));
DROP POLICY IF EXISTS treino_template_exercicios_workspace_access ON public.treino_template_exercicios;
CREATE POLICY treino_template_exercicios_workspace_access ON public.treino_template_exercicios FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'treinos')) WITH CHECK (public.can_access_workspace(user_id, 'treinos'));
DROP POLICY IF EXISTS treino_templates_workspace_access ON public.treino_templates;
CREATE POLICY treino_templates_workspace_access ON public.treino_templates FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'treinos')) WITH CHECK (public.can_access_workspace(user_id, 'treinos'));

-- ============================================================================
-- 9) RLS: workspace lê, só dono escreve (jardim_memorias, registro_vivo)
-- ============================================================================
DROP POLICY IF EXISTS jardim_memorias_workspace_read_owner_write ON public.jardim_memorias;
CREATE POLICY jardim_memorias_workspace_read_owner_write ON public.jardim_memorias FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'agenda')) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS registro_vivo_workspace_read_owner_write ON public.registro_vivo;
CREATE POLICY registro_vivo_workspace_read_owner_write ON public.registro_vivo FOR ALL TO authenticated USING (public.can_access_workspace(user_id, 'agenda')) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 10) RLS: policies especiais (assimétricas ou com lógica própria)
-- ============================================================================
-- profiles: leitura própria + de quem está no mesmo workspace; escrita só própria.
DROP POLICY IF EXISTS profiles_read_own_and_workspace ON public.profiles;
CREATE POLICY profiles_read_own_and_workspace ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE (wm.owner_id = auth.uid() AND wm.member_id = profiles.id)
       OR (wm.member_id = auth.uid() AND wm.owner_id = profiles.id)
  ));
DROP POLICY IF EXISTS profiles_write_own ON public.profiles;
CREATE POLICY profiles_write_own ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- kuanyin_guardians: dono OU admin_user_id (guardião gerido por outra conta).
DROP POLICY IF EXISTS kuanyin_guardians_owner_or_admin ON public.kuanyin_guardians;
CREATE POLICY kuanyin_guardians_owner_or_admin ON public.kuanyin_guardians FOR ALL TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = admin_user_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = admin_user_id);

-- kuanyin_public_chat_threads / messages: dono da thread (visitante anônimo
-- grava via service role, não authenticated) + leitura/edição pelo
-- guardião (owner ou admin) via join.
DROP POLICY IF EXISTS kuanyin_public_chat_threads_own_rows ON public.kuanyin_public_chat_threads;
CREATE POLICY kuanyin_public_chat_threads_own_rows ON public.kuanyin_public_chat_threads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS kuanyin_public_chat_threads_guardian_read ON public.kuanyin_public_chat_threads;
CREATE POLICY kuanyin_public_chat_threads_guardian_read ON public.kuanyin_public_chat_threads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kuanyin_guardians kg WHERE kg.id = kuanyin_public_chat_threads.guardian_id AND (kg.user_id = auth.uid() OR kg.admin_user_id = auth.uid())));
DROP POLICY IF EXISTS kuanyin_public_chat_threads_guardian_update ON public.kuanyin_public_chat_threads;
CREATE POLICY kuanyin_public_chat_threads_guardian_update ON public.kuanyin_public_chat_threads FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kuanyin_guardians kg WHERE kg.id = kuanyin_public_chat_threads.guardian_id AND (kg.user_id = auth.uid() OR kg.admin_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.kuanyin_guardians kg WHERE kg.id = kuanyin_public_chat_threads.guardian_id AND (kg.user_id = auth.uid() OR kg.admin_user_id = auth.uid())));

DROP POLICY IF EXISTS kuanyin_public_chat_messages_own_rows ON public.kuanyin_public_chat_messages;
CREATE POLICY kuanyin_public_chat_messages_own_rows ON public.kuanyin_public_chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS kuanyin_public_chat_messages_guardian_read ON public.kuanyin_public_chat_messages;
CREATE POLICY kuanyin_public_chat_messages_guardian_read ON public.kuanyin_public_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kuanyin_guardians kg WHERE kg.id = kuanyin_public_chat_messages.guardian_id AND (kg.user_id = auth.uid() OR kg.admin_user_id = auth.uid())));

-- workspace_invitations: dono OU quem aceitou vê; só dono escreve.
DROP POLICY IF EXISTS workspace_invitations_visibility ON public.workspace_invitations;
CREATE POLICY workspace_invitations_visibility ON public.workspace_invitations FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = accepted_by);
DROP POLICY IF EXISTS workspace_invitations_owner_write ON public.workspace_invitations;
CREATE POLICY workspace_invitations_owner_write ON public.workspace_invitations FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- workspace_members: dono OU membro vê; só dono escreve/remove.
DROP POLICY IF EXISTS workspace_members_visibility ON public.workspace_members;
CREATE POLICY workspace_members_visibility ON public.workspace_members FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR member_id = auth.uid());
DROP POLICY IF EXISTS workspace_members_owner_write ON public.workspace_members;
CREATE POLICY workspace_members_owner_write ON public.workspace_members FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- profile_initial_contexts: admin (via user_roles) OU o próprio usuário.
DROP POLICY IF EXISTS profile_initial_contexts_admin_or_own ON public.profile_initial_contexts;
CREATE POLICY profile_initial_contexts_admin_or_own ON public.profile_initial_contexts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- legal_documents / legal_chunks: leitura para todo autenticado, escrita só admin.
DROP POLICY IF EXISTS legal_documents_read_all ON public.legal_documents;
CREATE POLICY legal_documents_read_all ON public.legal_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS legal_documents_admin_write ON public.legal_documents;
CREATE POLICY legal_documents_admin_write ON public.legal_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS legal_chunks_read_all ON public.legal_chunks;
CREATE POLICY legal_chunks_read_all ON public.legal_chunks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS legal_chunks_admin_write ON public.legal_chunks;
CREATE POLICY legal_chunks_admin_write ON public.legal_chunks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 11) Storage: buckets (config final observada no schema real)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('reunioes-audio', 'reunioes-audio', false, 26214400, ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']::text[]),
  ('livros-docs', 'livros-docs', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/epub+zip', 'application/xhtml+xml', 'text/html', 'text/markdown', 'text/plain']::text[]),
  ('infograficos', 'infograficos', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]),
  ('avatares', 'avatares', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]),
  ('camara-audio', 'camara-audio', false, 26214400, ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']::text[]),
  ('codice-books', 'codice-books', false, 104857600, ARRAY['application/epub+zip', 'application/epub']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================================
-- 12) Storage: policies (todas seguem o padrão {user_id}/... no path)
-- ============================================================================
DROP POLICY IF EXISTS reunioes_audio_own ON storage.objects;
CREATE POLICY reunioes_audio_own ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'reunioes-audio' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'reunioes-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS livros_docs_own ON storage.objects;
CREATE POLICY livros_docs_own ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'livros-docs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'livros-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS infograficos_own ON storage.objects;
CREATE POLICY infograficos_own ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'infograficos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'infograficos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS avatares_own ON storage.objects;
CREATE POLICY avatares_own ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatares' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatares' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS camara_audio_own ON storage.objects;
CREATE POLICY camara_audio_own ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'camara-audio' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'camara-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- codice-books exige extensão .epub no path, além do prefixo {user_id}/.
DROP POLICY IF EXISTS codice_books_select_own ON storage.objects;
CREATE POLICY codice_books_select_own ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'codice-books' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS codice_books_insert_own ON storage.objects;
CREATE POLICY codice_books_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'codice-books' AND (storage.foldername(name))[1] = auth.uid()::text AND lower(right(name, 5)) = '.epub');
DROP POLICY IF EXISTS codice_books_update_own ON storage.objects;
CREATE POLICY codice_books_update_own ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'codice-books' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'codice-books' AND (storage.foldername(name))[1] = auth.uid()::text AND lower(right(name, 5)) = '.epub');
DROP POLICY IF EXISTS codice_books_delete_own ON storage.objects;
CREATE POLICY codice_books_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'codice-books' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- 13) Grants
-- ============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','workspace_members','workspace_invitations','profile_initial_contexts',
    'user_roles','chat_threads','chat_messages','jardim_memorias','memory_candidates','registro_vivo',
    'presenca_regimes','contexto_externo','eventos','sedimentos','business_contexts','kuanyin_guardians',
    'kuanyin_clients','kuanyin_appointments','kuanyin_orders','kuanyin_payments','kuanyin_appointment_reminders',
    'kuanyin_integrity_logs','kuanyin_portal_tokens','kuanyin_public_chat_threads','kuanyin_public_chat_messages',
    'livros','codice_margens','camara_sessoes','camara_segmentos','corpo_sinais','treino_templates',
    'treino_template_exercicios','treino_sessoes','treino_sessao_exercicios','treino_series','drive_vehicles',
    'drive_refuels','drive_oil_changes','drive_expenses','drive_trips','drive_docs','drive_parkings',
    'legal_documents','legal_chunks','jurisprudencia','legislacao','reunioes']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.can_access_workspace(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_workspace(uuid, text) TO authenticated, service_role;

-- ============================================================================
-- 14) Trigger de signup (auth.users -> handle_new_user)
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
