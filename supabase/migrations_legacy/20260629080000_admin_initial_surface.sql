-- Adiciona coluna initial_surface para o admin escolher a tela inicial
alter table public.profiles
add column if not exists initial_surface text not null default 'chat';

-- Valores permitidos: 'chat' ou 'kaline_presente'
alter table public.profiles
add constraint profiles_initial_surface_check
check (initial_surface in ('chat', 'kaline_presente'));