-- Keep Códice EPUB uploads compatible with existing metadata writers.
alter table public.livros drop constraint if exists livros_armazenamento_origem_check;

alter table public.livros
  add constraint livros_armazenamento_origem_check
  check (armazenamento_origem in ('device', 'cloud-legacy', 'google-drive', 'codice-books', 'supabase-storage')) not valid;

alter table public.livros validate constraint livros_armazenamento_origem_check;
