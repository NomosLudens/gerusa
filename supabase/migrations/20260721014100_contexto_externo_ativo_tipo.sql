-- Garante a existência e as restrições de ativo.
-- Adiciona/garante tipo.
-- Corrige o drift entre produção, migrations e tipos versionados.

alter table public.contexto_externo
  add column if not exists ativo boolean,
  add column if not exists tipo text;

update public.contexto_externo
set ativo = true
where ativo is null;

update public.contexto_externo
set tipo = 'identidade'
where tipo is null;

alter table public.contexto_externo
  alter column ativo set default true,
  alter column ativo set not null,
  alter column tipo set default 'identidade',
  alter column tipo set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contexto_externo_tipo_check'
      and conrelid = 'public.contexto_externo'::regclass
  ) then
    alter table public.contexto_externo
      add constraint contexto_externo_tipo_check
      check (tipo in ('identidade', 'memoria_relacional'));
  end if;
end
$$;
