-- Conversas públicas persistidas da página do Guardião.
-- O cliente final continua sem login; o acesso público passa pelas server functions.

create table if not exists public.kuanyin_public_chat_threads (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.kuanyin_guardians(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  business_context_id uuid references public.business_contexts(id) on delete set null,
  visitor_name text,
  visitor_key text,
  status text not null default 'open' check (status in ('open', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, update on public.kuanyin_public_chat_threads to authenticated;
grant all on public.kuanyin_public_chat_threads to service_role;

alter table public.kuanyin_public_chat_threads enable row level security;

drop policy if exists "owner or admin reads public kuanyin threads" on public.kuanyin_public_chat_threads;
create policy "owner or admin reads public kuanyin threads" on public.kuanyin_public_chat_threads
  for select using (
    exists (
      select 1 from public.kuanyin_guardians kg
      where kg.id = kuanyin_public_chat_threads.guardian_id
        and (kg.user_id = auth.uid() or kg.admin_user_id = auth.uid())
    )
  );

drop policy if exists "owner or admin updates public kuanyin threads" on public.kuanyin_public_chat_threads;
create policy "owner or admin updates public kuanyin threads" on public.kuanyin_public_chat_threads
  for update using (
    exists (
      select 1 from public.kuanyin_guardians kg
      where kg.id = kuanyin_public_chat_threads.guardian_id
        and (kg.user_id = auth.uid() or kg.admin_user_id = auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.kuanyin_guardians kg
      where kg.id = kuanyin_public_chat_threads.guardian_id
        and (kg.user_id = auth.uid() or kg.admin_user_id = auth.uid())
    )
  );

create table if not exists public.kuanyin_public_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.kuanyin_public_chat_threads(id) on delete cascade,
  guardian_id uuid not null references public.kuanyin_guardians(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('visitor', 'kuanyin')),
  content text not null,
  created_at timestamptz not null default now()
);

grant select on public.kuanyin_public_chat_messages to authenticated;
grant all on public.kuanyin_public_chat_messages to service_role;

alter table public.kuanyin_public_chat_messages enable row level security;

drop policy if exists "owner or admin reads public kuanyin messages" on public.kuanyin_public_chat_messages;
create policy "owner or admin reads public kuanyin messages" on public.kuanyin_public_chat_messages
  for select using (
    exists (
      select 1 from public.kuanyin_guardians kg
      where kg.id = kuanyin_public_chat_messages.guardian_id
        and (kg.user_id = auth.uid() or kg.admin_user_id = auth.uid())
    )
  );

create trigger trg_kuanyin_public_chat_threads_updated
  before update on public.kuanyin_public_chat_threads
  for each row execute function public.touch_updated_at();

create index if not exists idx_kuanyin_public_threads_guardian_updated
  on public.kuanyin_public_chat_threads(guardian_id, updated_at desc);
create index if not exists idx_kuanyin_public_threads_user_updated
  on public.kuanyin_public_chat_threads(user_id, updated_at desc);
create index if not exists idx_kuanyin_public_threads_visitor
  on public.kuanyin_public_chat_threads(guardian_id, visitor_key) where visitor_key is not null;
create index if not exists idx_kuanyin_public_messages_thread_created
  on public.kuanyin_public_chat_messages(thread_id, created_at);
