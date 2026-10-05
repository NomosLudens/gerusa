-- Códice Google Drive EPUB metadata only: no tokens and no book binaries.
alter table public.livros
  add column if not exists google_drive_file_id text,
  add column if not exists google_drive_web_view_link text,
  add column if not exists google_drive_modified_time timestamptz;

alter table public.livros drop constraint if exists livros_armazenamento_origem_check;
alter table public.livros
  add constraint livros_armazenamento_origem_check
  check (armazenamento_origem in ('device', 'cloud-legacy', 'google-drive')) not valid;

update public.livros
set google_drive_file_id = metadata #>> '{drive,fileId}',
    google_drive_web_view_link = metadata #>> '{drive,webViewLink}',
    google_drive_modified_time = nullif(metadata #>> '{drive,modifiedTime}', '')::timestamptz
where armazenamento_origem = 'google-drive'
  and metadata ? 'drive';

create index if not exists livros_google_drive_file_idx
  on public.livros(user_id, google_drive_file_id)
  where google_drive_file_id is not null;

comment on column public.livros.google_drive_file_id is
  'Google Drive file id for EPUB metadata. Access tokens and EPUB bytes are not stored.';
comment on column public.livros.google_drive_web_view_link is
  'Google Drive web view link for display/navigation only.';
comment on column public.livros.google_drive_modified_time is
  'Google Drive modifiedTime copied as metadata for EPUB records.';
