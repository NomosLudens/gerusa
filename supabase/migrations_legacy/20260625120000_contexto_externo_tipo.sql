alter table public.contexto_externo
  add column if not exists tipo text not null default 'identidade'
  check (tipo in ('identidade', 'memoria_relacional'));
