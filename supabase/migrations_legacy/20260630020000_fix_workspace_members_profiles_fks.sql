-- Corrige relações esperadas pelo PostgREST/Supabase na aba Perfis.
-- workspace_members.owner_id/member_id devem apontar para public.profiles(id)
-- para permitir joins como profiles!workspace_members_member_id_fkey.

alter table public.workspace_members
  drop constraint if exists workspace_members_member_id_fkey;

alter table public.workspace_members
  add constraint workspace_members_member_id_fkey
  foreign key (member_id)
  references public.profiles(id)
  on delete cascade;

alter table public.workspace_members
  drop constraint if exists workspace_members_owner_id_fkey;

alter table public.workspace_members
  add constraint workspace_members_owner_id_fkey
  foreign key (owner_id)
  references public.profiles(id)
  on delete cascade;

notify pgrst, 'reload schema';
