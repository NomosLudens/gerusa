-- Totalidade Supabase clean baseline.
-- Prepares schema only: no reset, no imports, no personal data.

create extension if not exists pgcrypto;

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

do $$ begin create type public.chat_facet as enum ('kaline','kharis','kuanyin','klio'); exception when duplicate_object then null; end $$;
do $$ begin create type public.app_role as enum ('admin','user'); exception when duplicate_object then null; end $$;
do $$ begin create type public.evento_tipo as enum ('compromisso','aula','reuniao','evento','prazo','outro'); exception when duplicate_object then null; end $$;
do $$ begin create type public.semaforo_fisico as enum ('green','yellow','red','blue','neutral'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sessao_status as enum ('em_andamento','concluida','abandonada'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sinal_tipo as enum ('sono','energia','dor','humor','fome','estresse','outro'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sedimento_nivel as enum ('leve','medio','profundo'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sedimento_status as enum ('pendente','promovido','descartado'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  gender text,
  role text not null default 'user',
  assigned_facet text not null default 'kharis',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role public.app_role not null, created_at timestamptz not null default now());
create table if not exists public.workspace_members (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, member_id uuid not null references auth.users(id) on delete cascade, modules text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.workspace_invitations (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, email text not null, token text not null, modules text[] not null default '{}', status text not null default 'pending', expires_at timestamptz not null default (now() + interval '7 days'), accepted_at timestamptz, accepted_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.profile_initial_contexts (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, facet text not null, content text not null default '', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.chat_threads (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, surface text not null default 'geral', facet public.chat_facet not null default 'kharis', title text, last_sedimentado_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.chat_messages (id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.chat_threads(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role text not null, content text not null, derived_from text[] not null default '{}', created_at timestamptz not null default now());

create table if not exists public.jardim_memorias (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, title text not null, body text not null, category text not null default 'geral', tags text[] not null default '{}', source text, source_ref text, importance int not null default 3, ease numeric not null default 2.5, interval_days int not null default 1, review_count int not null default 0, last_reviewed_at timestamptz, next_review_at timestamptz not null default now(), archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
-- Shape espelha 20260629150000_memory_candidates_review.sql (fonte de verdade
-- usada pelo código: domain/source/content/reason/sensitivity, não
-- source_type/body/tags). create table if not exists é no-op se a tabela já
-- existir por uma migration incremental anterior; só importa para reset
-- feito só com esta baseline.
create table if not exists public.memory_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null default 'memory'
    check (domain in ('kaline', 'kharis', 'kuanyin', 'drive', 'memory')),
  source text not null default 'manual'
    check (source in ('chat', 'camara-do-eco', 'codice', 'registro-vivo', 'manual', 'system')),
  source_id uuid,
  title text not null,
  content text not null,
  reason text,
  sensitivity text not null default 'medium'
    check (sensitivity in ('low', 'medium', 'high')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'archived')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  approved_memory_id uuid references public.jardim_memorias(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.registro_vivo (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, kind text not null, body text not null, mood int, tags text[] not null default '{}', occurred_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.presenca_regimes (user_id uuid primary key references auth.users(id) on delete cascade, state text not null, updated_at timestamptz not null default now());
create table if not exists public.contexto_externo (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, titulo text not null, conteudo text not null, ativo boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.eventos (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, titulo text not null, descricao text, tipo public.evento_tipo not null default 'compromisso', inicio timestamptz not null, fim timestamptz, local text, created_at timestamptz not null default now());
create table if not exists public.sedimentos (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, thread_id uuid not null references public.chat_threads(id) on delete cascade, source_kind text not null default 'chat', source_ids text[] not null default '{}', hipotese text not null, resumo text, nivel public.sedimento_nivel not null default 'leve', status public.sedimento_status not null default 'pendente', confianca numeric not null default 0, promovido_para uuid, promovido_tipo text, revisado_at timestamptz, created_at timestamptz not null default now());

create table if not exists public.business_contexts (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, nome text not null, tipo text, tom_voz text, servicos jsonb not null default '[]'::jsonb, precos jsonb not null default '{}'::jsonb, regras_agenda jsonb not null default '{}'::jsonb, regras_escalonamento jsonb not null default '{}'::jsonb, limites_decisao jsonb not null default '{}'::jsonb, formas_pagamento jsonb not null default '{}'::jsonb, pix_chave text, observacoes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.kuanyin_guardians (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, admin_user_id uuid references auth.users(id) on delete set null, business_context_id uuid not null references public.business_contexts(id) on delete cascade, public_slug text not null unique, status text not null default 'active', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.kuanyin_clients (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, business_context_id uuid references public.business_contexts(id) on delete set null, linked_user_id uuid references auth.users(id) on delete set null, nome text not null, email text, telefone text, notas text, preferencias jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb, status text not null default 'active', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.kuanyin_appointments (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, business_context_id uuid references public.business_contexts(id) on delete set null, client_id uuid references public.kuanyin_clients(id) on delete set null, evento_id uuid references public.eventos(id) on delete set null, service_name text not null, starts_at timestamptz not null, ends_at timestamptz, price_cents int, notes text, status text not null default 'proposed', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.kuanyin_orders (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, business_context_id uuid references public.business_contexts(id) on delete set null, client_id uuid references public.kuanyin_clients(id) on delete set null, description text not null, items jsonb not null default '[]'::jsonb, price_cents int, status text not null default 'proposed', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.kuanyin_payments (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, appointment_id uuid references public.kuanyin_appointments(id) on delete set null, order_id uuid references public.kuanyin_orders(id) on delete set null, amount_cents int not null, method text, comprovante_ref text, fraud_alert_note text, status text not null default 'received_proof', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.kuanyin_public_chat_threads (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, guardian_id uuid not null references public.kuanyin_guardians(id) on delete cascade, business_context_id uuid references public.business_contexts(id) on delete set null, visitor_name text, visitor_key text, status text not null default 'open', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.kuanyin_public_chat_messages (id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.kuanyin_public_chat_threads(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, guardian_id uuid references public.kuanyin_guardians(id) on delete cascade, role text not null, content text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());

-- livros: shape completo reconstruído a partir das 7 migrations incrementais
-- que a alteraram, em ordem cronológica — 20260629120000 (engine de leitura
-- Códice: arquivo_nome/mime/ext, leitura_percentual/posicao,
-- ultimo_acesso_em, metadata), 20260629123000 (local-first:
-- armazenamento_origem, arquivo_local_nome/mime), 20260630190000 (import
-- Google Drive: google_drive_*), 20260630203000 e 20260701100000 (Storage
-- do Códice: storage_bucket/path, file_size, mime_type, origem),
-- 20260701090000 e 20260701110000 (só evoluem o CHECK de
-- armazenamento_origem — a versão abaixo já é a final, mais permissiva).
-- `updated_at` (+ trigger touch_updated_at) faltava nas migrations
-- incrementais até 20260701120000, apesar de 20260630203000 já criar um
-- índice sobre ela — corrigido em 20260702000000_codice_livros_updated_at_fix.sql.
create table if not exists public.livros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  autor text,
  arquivo_path text,
  arquivo_nome text,
  arquivo_mime text,
  arquivo_ext text,
  texto_extraido text,
  resumo text,
  infografico_url text,
  leitura_percentual numeric(5,2) not null default 0
    check (leitura_percentual >= 0 and leitura_percentual <= 100),
  leitura_posicao jsonb not null default '{}'::jsonb,
  ultimo_acesso_em timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  armazenamento_origem text not null default 'device'
    check (armazenamento_origem in ('device', 'cloud-legacy', 'google-drive', 'codice-books', 'supabase-storage')),
  arquivo_local_nome text,
  arquivo_local_mime text,
  google_drive_file_id text,
  google_drive_web_view_link text,
  google_drive_modified_time timestamptz,
  storage_bucket text,
  storage_path text,
  file_size bigint,
  mime_type text,
  origem text default 'upload',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint livros_codice_storage_path_shape check (
    storage_path is null or storage_path = user_id::text || '/' || id::text || '.epub'
  )
);
create index if not exists livros_user_updated_idx on public.livros(user_id, updated_at desc);
create index if not exists livros_user_ultimo_acesso_idx on public.livros(user_id, ultimo_acesso_em desc nulls last, created_at desc);
create index if not exists livros_storage_path_idx on public.livros(storage_bucket, storage_path);
create index if not exists livros_google_drive_file_idx on public.livros(user_id, google_drive_file_id) where google_drive_file_id is not null;
create table if not exists public.codice_margens (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, livro_id uuid references public.livros(id) on delete set null, trecho text, nota text not null, localizacao jsonb not null default '{}'::jsonb, tags text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.camara_sessoes (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, titulo text not null, modo text not null, status text not null default 'rascunho', texto_rapido text, analise jsonb, analise_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.camara_segmentos (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, sessao_id uuid not null references public.camara_sessoes(id) on delete cascade, ordem int not null, inicio_seg numeric not null, fim_seg numeric not null, audio_path text, transcricao text, status text not null default 'pending', erro text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.corpo_sinais (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, tipo public.sinal_tipo not null, intensidade int, nota text, registrado_em timestamptz not null default now(), created_at timestamptz not null default now());
create table if not exists public.treino_sessoes (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, template_id uuid, semaforo public.semaforo_fisico not null default 'neutral', status public.sessao_status not null default 'em_andamento', iniciada_em timestamptz not null default now(), encerrada_em timestamptz, duracao_segundos int, notas text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.treino_sessao_exercicios (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, sessao_id uuid not null references public.treino_sessoes(id) on delete cascade, nome text not null, grupo_muscular text, ordem int not null default 0, notas text, created_at timestamptz not null default now());
create table if not exists public.treino_series (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, sessao_exercicio_id uuid not null references public.treino_sessao_exercicios(id) on delete cascade, ordem int not null default 0, reps int, peso numeric, rir int, descanso_segundos int, concluida boolean not null default false, registrada_em timestamptz not null default now());

create table if not exists public.drive_vehicles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, apelido text not null, placa text, modelo text, ano int, foto_url text, ativo boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.drive_refuels (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, vehicle_id uuid not null references public.drive_vehicles(id) on delete cascade, ocorrido_em timestamptz not null default now(), km numeric not null, litros numeric not null, preco_litro numeric, total numeric, combustivel text not null default 'gasolina', posto text, observacao text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.drive_oil_changes (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, vehicle_id uuid not null references public.drive_vehicles(id) on delete cascade, ocorrido_em timestamptz not null default now(), km numeric not null, tipo_oleo text, durabilidade_km int not null default 10000, observacao text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.drive_expenses (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, vehicle_id uuid references public.drive_vehicles(id) on delete set null, ocorrido_em timestamptz not null default now(), categoria text not null, valor numeric not null, descricao text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.drive_trips (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, vehicle_id uuid not null references public.drive_vehicles(id) on delete cascade, iniciado_em timestamptz not null default now(), finalizado_em timestamptz, km_inicial numeric not null, km_final numeric, destino text, pedagio numeric, observacao text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.drive_docs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, vehicle_id uuid not null references public.drive_vehicles(id) on delete cascade, tipo text not null, vence_em date not null, observacao text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

-- Minimal grants/RLS/policies.
do $$
declare t text; has_user_id boolean; has_updated_at boolean;
begin
  foreach t in array array['profiles','user_roles','workspace_members','workspace_invitations','profile_initial_contexts','chat_threads','chat_messages','jardim_memorias','memory_candidates','registro_vivo','presenca_regimes','contexto_externo','eventos','sedimentos','business_contexts','kuanyin_guardians','kuanyin_clients','kuanyin_appointments','kuanyin_orders','kuanyin_payments','kuanyin_public_chat_threads','kuanyin_public_chat_messages','livros','codice_margens','camara_sessoes','camara_segmentos','corpo_sinais','treino_sessoes','treino_sessao_exercicios','treino_series','drive_vehicles','drive_refuels','drive_oil_changes','drive_expenses','drive_trips','drive_docs'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='user_id') into has_user_id;
    if t = 'profiles' then
      execute format('drop policy if exists %I on public.%I', t || '_own_rows', t);
      execute format('create policy %I on public.%I for all to authenticated using (auth.uid() = id) with check (auth.uid() = id)', t || '_own_rows', t);
    elsif t = 'workspace_members' then
      execute format('drop policy if exists %I on public.%I', t || '_own_rows', t);
      execute format('create policy %I on public.%I for all to authenticated using (auth.uid() = owner_id or auth.uid() = member_id) with check (auth.uid() = owner_id)', t || '_own_rows', t);
    elsif t = 'workspace_invitations' then
      execute format('drop policy if exists %I on public.%I', t || '_own_rows', t);
      execute format('create policy %I on public.%I for all to authenticated using (auth.uid() = owner_id or auth.uid() = accepted_by) with check (auth.uid() = owner_id)', t || '_own_rows', t);
    elsif has_user_id then
      execute format('drop policy if exists %I on public.%I', t || '_own_rows', t);
      execute format('create policy %I on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_own_rows', t);
    end if;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='updated_at') into has_updated_at;
    if has_updated_at then
      execute format('drop trigger if exists %I on public.%I', t || '_touch_updated_at', t);
      execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch_updated_at', t);
    end if;
  end loop;
end $$;

-- Public chat tables intentionally have no anon-wide policy; public surface must go through server/API ownership checks.

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists workspace_members_owner_id_idx on public.workspace_members(owner_id);
create index if not exists workspace_members_member_id_idx on public.workspace_members(member_id);
create index if not exists workspace_invitations_owner_id_idx on public.workspace_invitations(owner_id);
create index if not exists chat_threads_user_facet_idx on public.chat_threads(user_id, facet, created_at desc);
create index if not exists chat_messages_thread_id_idx on public.chat_messages(thread_id);
create index if not exists chat_messages_user_id_idx on public.chat_messages(user_id);
create index if not exists jardim_memorias_user_id_idx on public.jardim_memorias(user_id);
create index if not exists memory_candidates_user_status_idx on public.memory_candidates(user_id, status, created_at desc);
create index if not exists eventos_user_created_at_idx on public.eventos(user_id, created_at desc);
create index if not exists sedimentos_thread_id_idx on public.sedimentos(thread_id);
create index if not exists business_contexts_user_id_idx on public.business_contexts(user_id);
create index if not exists kuanyin_guardians_user_id_idx on public.kuanyin_guardians(user_id);
create index if not exists kuanyin_guardians_admin_user_id_idx on public.kuanyin_guardians(admin_user_id);
create index if not exists kuanyin_public_chat_threads_guardian_id_idx on public.kuanyin_public_chat_threads(guardian_id);
create index if not exists kuanyin_public_chat_messages_thread_id_idx on public.kuanyin_public_chat_messages(thread_id);
create index if not exists codice_margens_livro_id_idx on public.codice_margens(livro_id);
create index if not exists camara_segmentos_sessao_id_idx on public.camara_segmentos(sessao_id);
create index if not exists treino_sessao_exercicios_sessao_id_idx on public.treino_sessao_exercicios(sessao_id);
create index if not exists treino_series_sessao_exercicio_id_idx on public.treino_series(sessao_exercicio_id);
create index if not exists drive_refuels_vehicle_id_idx on public.drive_refuels(vehicle_id);
create index if not exists drive_oil_changes_vehicle_id_idx on public.drive_oil_changes(vehicle_id);
create index if not exists drive_expenses_vehicle_id_idx on public.drive_expenses(vehicle_id);
create index if not exists drive_trips_vehicle_id_idx on public.drive_trips(vehicle_id);
create index if not exists drive_docs_vehicle_id_idx on public.drive_docs(vehicle_id);
