-- Códice: keep existing rows safe while enforcing the origins used by current writers.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('codice-books', 'codice-books', false, 104857600, array['application/epub+zip']::text[])
on conflict (id) do update set
  public = false,
  file_size_limit = greatest(coalesce(storage.buckets.file_size_limit, 0), excluded.file_size_limit),
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.livros drop constraint if exists livros_armazenamento_origem_check;

alter table public.livros
  add constraint livros_armazenamento_origem_check
  check (armazenamento_origem in ('device', 'cloud-legacy', 'google-drive', 'codice-books', 'supabase-storage')) not valid;
