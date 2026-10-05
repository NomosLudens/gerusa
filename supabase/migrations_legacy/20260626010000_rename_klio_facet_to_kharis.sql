-- Renomeia o valor de enum 'klio' (que sempre representou a superfície de cuidado Kháris)
-- para 'kharis', encerrando a dívida semântica. ALTER TYPE ... RENAME VALUE roda dentro de
-- transação (PostgreSQL 10+) e atualiza automaticamente todas as linhas existentes de
-- chat_threads.facet que estavam como 'klio'.
ALTER TYPE public.chat_facet RENAME VALUE 'klio' TO 'kharis';

-- O default da coluna acompanha o rename do valor de enum, mas reescrevemos explicitamente
-- por clareza e para deixar o intento registrado.
ALTER TABLE public.chat_threads ALTER COLUMN facet SET DEFAULT 'kharis';

-- NOTA DE DÍVIDA TÉCNICA: o enum chat_facet ainda contém o valor legado 'clio'
-- (adicionado em 20260101000000_baseline.sql), que não é usado por nenhuma faceta.
-- O PostgreSQL não suporta remover valores de enum (não há ALTER TYPE ... DROP VALUE),
-- então ele permanece inerte e documentado aqui.
