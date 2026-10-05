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