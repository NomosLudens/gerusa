-- Adiciona 'klio' como assigned_facet válido
-- Altera o CHECK constraint existente para incluir 'klio'
alter table public.profiles
  drop constraint if exists profiles_assigned_facet_check;

alter table public.profiles
  add constraint profiles_assigned_facet_check
  check (assigned_facet in ('kaline', 'kharis', 'kuanyin', 'klio'));