-- Permite que o admin do workspace gerencie Guardiões vinculados aos seus convidados.

update public.kuanyin_guardians kg
set admin_user_id = wm.owner_id
from public.workspace_members wm
where kg.user_id = wm.member_id
  and 'kuanyin' = any(wm.modules)
  and kg.admin_user_id is distinct from wm.owner_id;

drop policy if exists "owner manages kuanyin_guardians" on public.kuanyin_guardians;
create policy "owner or admin manages kuanyin_guardians" on public.kuanyin_guardians
  for all using (
    auth.uid() = user_id
    or auth.uid() = admin_user_id
  ) with check (
    auth.uid() = user_id
    or auth.uid() = admin_user_id
  );

create index if not exists idx_kuanyin_guardians_admin on public.kuanyin_guardians(admin_user_id);
