-- Tabela para contexto inicial definido pelo admin para cada usuário
create table if not exists public.profile_initial_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  treatment_name text,
  main_goal text,
  tone text,
  important_context text,
  limits_and_cautions text,
  response_preferences text,
  admin_notes text,
  initial_seeds text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table public.profile_initial_contexts enable row level security;

-- Admin owner vê/gerencia todos os contextos
create policy "admin manages initial contexts" on public.profile_initial_contexts
  for all to authenticated
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
    or user_id = auth.uid()
  );

grant select, insert, update, delete on public.profile_initial_contexts to authenticated;
grant all on public.profile_initial_contexts to service_role;