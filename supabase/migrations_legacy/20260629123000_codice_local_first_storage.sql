-- Códice local-first storage policy.
-- From this point on, the app stores original book files and extracted reading
-- text on the user's device. Supabase keeps only the authenticated record and
-- derived artifacts such as summaries, fichamentos, margins and progress.

alter table public.livros
  add column if not exists armazenamento_origem text not null default 'device',
  add column if not exists arquivo_local_nome text,
  add column if not exists arquivo_local_mime text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'livros_armazenamento_origem_check'
      and conrelid = 'public.livros'::regclass
  ) then
    alter table public.livros
      add constraint livros_armazenamento_origem_check
      check (armazenamento_origem in ('device', 'cloud-legacy')) not valid;
  end if;

  begin
    alter table public.livros validate constraint livros_armazenamento_origem_check;
  exception when others then
    null;
  end;
end $$;

comment on column public.livros.armazenamento_origem is
  'Códice storage mode. New Códice uploads use device: original file and extracted text stay on the user device.';
comment on column public.livros.arquivo_path is
  'Legacy cloud object path. New Códice local-first uploads leave this null.';
comment on column public.livros.texto_extraido is
  'Legacy extracted text. New Códice local-first uploads leave this null; only derived summaries/fichamentos/margins are stored in Supabase.';
comment on column public.livros.arquivo_local_nome is
  'Original local filename for display only; the file itself remains on device storage.';
comment on column public.livros.arquivo_local_mime is
  'Original local MIME type for display only; the file itself remains on device storage.';

create index if not exists livros_user_armazenamento_idx
  on public.livros(user_id, armazenamento_origem, created_at desc);
