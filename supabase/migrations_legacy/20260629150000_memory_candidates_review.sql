-- PR 9: fila explicita de candidatos a memoria.
-- Nada entra em jardim_memorias sem acao humana de aprovacao.

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

create index if not exists memory_candidates_user_status_idx
  on public.memory_candidates(user_id, status, created_at desc);
create index if not exists memory_candidates_user_domain_idx
  on public.memory_candidates(user_id, domain, created_at desc);
create index if not exists memory_candidates_source_idx
  on public.memory_candidates(source, source_id);
create index if not exists memory_candidates_metadata_gin_idx
  on public.memory_candidates using gin(metadata);

grant select, insert, update, delete on public.memory_candidates to authenticated;
grant all on public.memory_candidates to service_role;

alter table public.memory_candidates enable row level security;

drop policy if exists "memory candidates own rows" on public.memory_candidates;
create policy "memory candidates own rows"
  on public.memory_candidates for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists memory_candidates_touch on public.memory_candidates;
create trigger memory_candidates_touch
  before update on public.memory_candidates
  for each row execute function public.touch_updated_at();

comment on table public.memory_candidates is
  'Fila de candidatos a memoria. Itens aprovados criam registros em jardim_memorias.';
