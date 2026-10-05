-- Adiciona role + assigned_facet ao profiles para controle de acesso por faceta
alter table public.profiles
  add column if not exists role text not null default 'admin'
    check (role in ('admin', 'user')),
  add column if not exists assigned_facet text
    check (assigned_facet in ('kaline', 'kharis', 'kuanyin'));

-- Admin = usuário que não é membro de nenhum workspace (dono)
update public.profiles set role = 'admin'
  where id not in (
    select member_id from public.workspace_members
  );

-- User = membro convidado
update public.profiles set role = 'user'
  where role is null;

-- Para membros já convidados, inferir assigned_facet do primeiro módulo
update public.profiles p set assigned_facet = (
  select case
    when wm.modules && array['kuanyin'] then 'kuanyin'
    when wm.modules && array['kharis'] then 'kharis'
    else 'kaline'
  end
  from public.workspace_members wm
  where wm.member_id = p.id
  limit 1
) where p.role = 'user';