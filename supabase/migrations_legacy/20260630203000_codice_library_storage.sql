-- Biblioteca Códice funcional: EPUB privado por usuário no Supabase Storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('codice-books', 'codice-books', false, 52428800, array['application/epub+zip']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.livros
  add column if not exists arquivo_nome text,
  add column if not exists arquivo_mime text,
  add column if not exists arquivo_ext text,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists armazenamento_origem text,
  add column if not exists file_size bigint,
  add column if not exists ultimo_acesso_em timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'livros_armazenamento_origem_check' and conrelid = 'public.livros'::regclass) then
    alter table public.livros drop constraint livros_armazenamento_origem_check;
  end if;
end $$;

create index if not exists livros_user_updated_idx on public.livros(user_id, updated_at desc);
create index if not exists livros_user_ultimo_acesso_idx on public.livros(user_id, ultimo_acesso_em desc);
create index if not exists livros_storage_path_idx on public.livros(storage_bucket, storage_path);

alter table public.livros enable row level security;
alter table public.codice_margens enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'livros' and policyname = 'livros_select_own') then
    create policy livros_select_own on public.livros for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'livros' and policyname = 'livros_insert_own') then
    create policy livros_insert_own on public.livros for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'livros' and policyname = 'livros_update_own') then
    create policy livros_update_own on public.livros for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'livros' and policyname = 'livros_delete_own') then
    create policy livros_delete_own on public.livros for delete to authenticated using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'codice_margens' and policyname = 'codice_margens_select_own') then
    create policy codice_margens_select_own on public.codice_margens for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'codice_margens' and policyname = 'codice_margens_insert_own') then
    create policy codice_margens_insert_own on public.codice_margens for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'codice_margens' and policyname = 'codice_margens_update_own') then
    create policy codice_margens_update_own on public.codice_margens for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'codice_margens' and policyname = 'codice_margens_delete_own') then
    create policy codice_margens_delete_own on public.codice_margens for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

drop policy if exists "own codice books" on storage.objects;
drop policy if exists "codice_books_select_own" on storage.objects;
drop policy if exists "codice_books_insert_own" on storage.objects;
drop policy if exists "codice_books_update_own" on storage.objects;
drop policy if exists "codice_books_delete_own" on storage.objects;

create policy "codice_books_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'codice-books' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "codice_books_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'codice-books' and (storage.foldername(name))[1] = auth.uid()::text and lower(right(name, 5)) = '.epub');

create policy "codice_books_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'codice-books' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'codice-books' and (storage.foldername(name))[1] = auth.uid()::text and lower(right(name, 5)) = '.epub');

create policy "codice_books_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'codice-books' and (storage.foldername(name))[1] = auth.uid()::text);
