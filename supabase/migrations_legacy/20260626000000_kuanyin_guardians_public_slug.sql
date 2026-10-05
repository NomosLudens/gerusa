-- Guardiões do Negócio: entidade pública/admin para a presença Kuan-Yin.
-- Mantém o contexto comercial separado da identidade pública persistente.

create table if not exists public.kuanyin_guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  admin_user_id uuid references auth.users(id) on delete set null,
  business_context_id uuid not null references public.business_contexts(id) on delete cascade,
  public_slug text not null,
  status text not null default 'published' check (status in ('draft', 'published', 'suspended', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kuanyin_guardians_business_context_unique unique (business_context_id),
  constraint kuanyin_guardians_public_slug_unique unique (public_slug),
  constraint kuanyin_guardians_public_slug_format check (public_slug ~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$')
);

grant select, insert, update, delete on public.kuanyin_guardians to authenticated;
grant all on public.kuanyin_guardians to service_role;

alter table public.kuanyin_guardians enable row level security;

drop policy if exists "owner manages kuanyin_guardians" on public.kuanyin_guardians;
create policy "owner manages kuanyin_guardians" on public.kuanyin_guardians
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_kuanyin_guardians_user on public.kuanyin_guardians(user_id);
create index if not exists idx_kuanyin_guardians_status on public.kuanyin_guardians(status);

create trigger trg_kuanyin_guardians_updated
  before update on public.kuanyin_guardians
  for each row execute function public.touch_updated_at();

-- Backfill conservador: inclui sufixo curto do contexto para evitar colisões.
insert into public.kuanyin_guardians (user_id, business_context_id, public_slug, status)
select
  bc.user_id,
  bc.id,
  coalesce(
    nullif(trim(both '-' from lower(regexp_replace(coalesce(nullif(bc.nome, ''), 'guardiao'), '[^a-zA-Z0-9]+', '-', 'g'))), ''),
    'guardiao'
  ) || '-' || substr(bc.id::text, 1, 8),
  'published'
from public.business_contexts bc
where not exists (
  select 1 from public.kuanyin_guardians kg where kg.business_context_id = bc.id
)
on conflict do nothing;
