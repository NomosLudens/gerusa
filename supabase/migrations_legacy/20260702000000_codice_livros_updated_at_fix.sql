-- Fix: 20260630203000_codice_library_storage.sql cria o índice
-- livros_user_updated_idx sobre public.livros(user_id, updated_at desc),
-- mas nenhuma migration anterior adiciona a coluna updated_at via ALTER
-- TABLE — nem o CREATE TABLE original em 20260101000000_baseline.sql a
-- inclui. Se updated_at não existir por algum outro meio, aquele CREATE
-- INDEX falha.
--
-- Idempotente: seguro rodar em qualquer estado (coluna/trigger já
-- existentes ou não). Não apaga nem altera dados existentes.
alter table public.livros
  add column if not exists updated_at timestamptz not null default now();

-- livros é a única tabela com updated_at neste schema sem o trigger padrão
-- de auto-atualização usado em todas as outras (chat_threads, jardim_memorias,
-- camara_sessoes, etc.) — sem ele, updated_at nunca muda após o create,
-- o que esvazia o propósito do índice acima.
drop trigger if exists livros_touch_updated_at on public.livros;
create trigger livros_touch_updated_at
  before update on public.livros
  for each row execute function public.touch_updated_at();
