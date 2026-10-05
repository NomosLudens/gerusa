-- Biblioteca Códice: EPUBs privados no Supabase Storage.
-- O arquivo original fica no bucket privado; public.livros guarda apenas metadados.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'codice-books',
  'codice-books',
  false,
  104857600,
  array['application/epub+zip']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.livros
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists origem text default 'upload',
  add column if not exists ultimo_acesso_em timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'livros_armazenamento_origem_check'
      and conrelid = 'public.livros'::regclass
  ) then
    alter table public.livros
      drop constraint livros_armazenamento_origem_check;
  end if;

  alter table public.livros
    add constraint livros_armazenamento_origem_check
    check (armazenamento_origem in ('device', 'cloud-legacy', 'codice-books')) not valid;

  begin
    alter table public.livros validate constraint livros_armazenamento_origem_check;
  exception when others then
    null;
  end;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'livros_codice_storage_path_shape'
      and conrelid = 'public.livros'::regclass
  ) then
    alter table public.livros
      add constraint livros_codice_storage_path_shape
      check (
        storage_path is null
        or storage_path = user_id::text || '/' || id::text || '.epub'
      ) not valid;
  end if;

  begin
    alter table public.livros validate constraint livros_codice_storage_path_shape;
  exception when others then
    null;
  end;
end $$;

create index if not exists livros_user_codice_books_idx
  on public.livros(user_id, storage_bucket, ultimo_acesso_em desc nulls last, created_at desc);

drop policy if exists "own codice books" on storage.objects;
create policy "own codice books" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'codice-books'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'codice-books'
    and auth.uid()::text = (storage.foldername(name))[1]
    and lower(right(name, 5)) = '.epub'
  );

comment on column public.livros.storage_bucket is
  'Bucket privado onde o EPUB original do Códice foi salvo. Principal: codice-books.';
comment on column public.livros.storage_path is
  'Caminho privado do EPUB no bucket, no formato {user_id}/{book_id}.epub.';
comment on column public.livros.mime_type is
  'MIME declarado no upload do arquivo original.';
comment on column public.livros.file_size is
  'Tamanho em bytes do arquivo original.';
comment on column public.livros.origem is
  'Origem funcional do registro. Para Biblioteca Códice, upload.';
