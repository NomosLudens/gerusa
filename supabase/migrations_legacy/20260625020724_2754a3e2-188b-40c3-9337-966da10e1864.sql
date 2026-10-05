create table if not exists public.contexto_externo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  conteudo text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contexto_externo_user_ativo_idx
  on public.contexto_externo(user_id, ativo, updated_at desc);

grant select, insert, update, delete on public.contexto_externo to authenticated;
grant all on public.contexto_externo to service_role;

alter table public.contexto_externo enable row level security;

create policy "owner can read contexto externo"
  on public.contexto_externo for select
  to authenticated
  using (auth.uid() = user_id);

create policy "owner can insert contexto externo"
  on public.contexto_externo for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "owner can update contexto externo"
  on public.contexto_externo for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner can delete contexto externo"
  on public.contexto_externo for delete
  to authenticated
  using (auth.uid() = user_id);