-- Remove o valor legado 'clio' do enum chat_facet.
--
-- Contexto: 'clio' foi adicionado em 20260624204335 / baseline (linha 330) como
-- faceta separada e nunca chegou a ser usado por nenhuma superfície. A faceta de
-- estudo virou Klio (absorvida pela Kaline) e a renomeação klio->kharis
-- (20260626010000) deixou 'clio' inerte. O PostgreSQL não suporta
-- ALTER TYPE ... DROP VALUE, então recriamos o enum sem o valor morto.
--
-- A única coluna que usa chat_facet é public.chat_threads.facet. Nenhuma linha
-- usa 'clio'; ainda assim, reatribuímos defensivamente qualquer linha residual
-- para 'kaline' antes da troca de tipo.
--
-- Tudo roda dentro de uma transação (migração única). A troca via
-- RENAME TYPE + CREATE TYPE + ALTER COLUMN ... USING reconstrói o índice
-- chat_threads_user_facet_idx automaticamente.

DO $$
BEGIN
  -- Só age se o valor legado ainda existir e o tipo for o enum esperado.
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'chat_facet'
      AND e.enumlabel = 'clio'
  ) THEN
    -- Defensivo: nenhuma linha deve estar em 'clio', mas garantimos antes da troca.
    UPDATE public.chat_threads
      SET facet = 'kaline'::public.chat_facet
      WHERE facet::text = 'clio';

    -- Solta o default para permitir a troca de tipo da coluna.
    ALTER TABLE public.chat_threads
      ALTER COLUMN facet DROP DEFAULT;

    -- Recria o enum sem 'clio'.
    ALTER TYPE public.chat_facet RENAME TO chat_facet_legacy;
    CREATE TYPE public.chat_facet AS ENUM ('kaline', 'kharis', 'kuanyin');

    -- Migra a coluna para o novo tipo (cast via texto; todos os valores existem).
    ALTER TABLE public.chat_threads
      ALTER COLUMN facet TYPE public.chat_facet
      USING facet::text::public.chat_facet;

    -- Restaura o default vigente (kharis).
    ALTER TABLE public.chat_threads
      ALTER COLUMN facet SET DEFAULT 'kharis'::public.chat_facet;

    -- Remove o tipo antigo agora sem dependências.
    DROP TYPE public.chat_facet_legacy;
  END IF;
END $$;
