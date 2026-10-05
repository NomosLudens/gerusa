-- Hardening da presença pública Kuan-Yin.
-- 1) Backfills antigos deixam de publicar automaticamente.
-- 2) Presença pública exige publicação explícita pelo Guardião/admin.
-- 3) Evita deleção direta por usuários autenticados; arquivamento deve ser via status.
-- 4) Mantém histórico básico da última mudança de status em metadata.

update public.kuanyin_guardians
set
  status = 'draft',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'auto_unpublished_at', now(),
    'auto_unpublished_reason', 'migration_publication_requires_explicit_review'
  )
where status = 'published'
  and not (coalesce(metadata, '{}'::jsonb) ? 'explicitly_published_at')
  and not (coalesce(metadata, '{}'::jsonb) ? 'last_status_change');

revoke delete on public.kuanyin_guardians from authenticated;

drop policy if exists "owner or admin manages kuanyin_guardians" on public.kuanyin_guardians;
create policy "owner or admin manages kuanyin_guardians" on public.kuanyin_guardians
  for all using (
    auth.uid() = user_id
    or auth.uid() = admin_user_id
  ) with check (
    auth.uid() = user_id
    or auth.uid() = admin_user_id
  );

-- A policy acima ainda cobre DELETE para owners/admin caso algum grant futuro libere.
-- O revoke garante que o client autenticado normal não apague presenças; use status='archived'.
