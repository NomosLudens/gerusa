-- Códice/Klio reading engine support.
-- The public HTML remains a visual surface; authenticated React routes use these
-- tables/buckets through the existing Supabase client and RLS policies.

-- Keep legacy livros rows, but add enough metadata for Códice routing,
-- reader progress and future conversion pipelines.
alter table public.livros
  add column if not exists arquivo_nome text,
  add column if not exists arquivo_mime text,
  add column if not exists arquivo_ext text,
  add column if not exists leitura_percentual numeric(5,2) not null default 0,
  add column if not exists leitura_posicao jsonb not null default '{}'::jsonb,
  add column if not exists ultimo_acesso_em timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'livros_leitura_percentual_range'
      and conrelid = 'public.livros'::regclass
  ) then
    alter table public.livros
      add constraint livros_leitura_percentual_range
      check (leitura_percentual >= 0 and leitura_percentual <= 100) not valid;
  end if;

  begin
    alter table public.livros validate constraint livros_leitura_percentual_range;
  exception when others then
    -- Existing data should not block deployment; future writes are protected.
    null;
  end;
end $$;

create index if not exists livros_user_ultimo_acesso_idx
  on public.livros(user_id, ultimo_acesso_em desc nulls last, created_at desc);

create index if not exists livros_metadata_gin_idx
  on public.livros using gin(metadata);

-- Margem: authenticated note/highlight layer for Códice. It is deliberately
-- outside the public HTML and protected with the same workspace access model
-- used by the preserved livros engine.
create table if not exists public.codice_margens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  livro_id uuid references public.livros(id) on delete cascade,
  trecho text,
  nota text not null,
  localizacao jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.codice_margens to authenticated;
grant all on public.codice_margens to service_role;

alter table public.codice_margens enable row level security;

drop policy if exists "workspace codice margens" on public.codice_margens;
create policy "workspace codice margens" on public.codice_margens
  for all to authenticated
  using (public.can_access_workspace(user_id, 'livros'))
  with check (public.can_access_workspace(user_id, 'livros'));

drop trigger if exists touch_codice_margens on public.codice_margens;
create trigger touch_codice_margens
  before update on public.codice_margens
  for each row execute function public.touch_updated_at();

create index if not exists codice_margens_user_livro_idx
  on public.codice_margens(user_id, livro_id, created_at desc);

create index if not exists codice_margens_localizacao_gin_idx
  on public.codice_margens using gin(localizacao);

create index if not exists codice_margens_tags_gin_idx
  on public.codice_margens using gin(tags);

-- Allow Códice uploads to include EPUB/Markdown/HTML while preserving the
-- private bucket and owner-folder storage policies declared in the baseline.
update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct mime order by mime)
  from unnest(
    coalesce(allowed_mime_types, '{}'::text[])
    || array[
      'application/epub+zip',
      'application/xhtml+xml',
      'text/html',
      'text/markdown',
      'text/plain'
    ]::text[]
  ) as mime
)
where id = 'livros-docs';
