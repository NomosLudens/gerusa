-- Rename live chat facet data from Kalisto to Klio.
-- This runs after the enum preparation migration so enum-backed columns can use 'klio'.

DO $$
DECLARE
  facet_type text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_threads'
      AND column_name = 'facet'
  ) THEN
    ALTER TABLE public.chat_threads
      ADD COLUMN facet text NOT NULL DEFAULT 'klio';
  END IF;

  SELECT udt_name
    INTO facet_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'chat_threads'
    AND column_name = 'facet';

  IF facet_type = 'chat_facet' THEN
    ALTER TABLE public.chat_threads
      ALTER COLUMN facet DROP DEFAULT;

    UPDATE public.chat_threads
      SET facet = 'klio'::public.chat_facet
      WHERE facet::text = 'kalisto';

    UPDATE public.chat_threads
      SET facet = 'klio'::public.chat_facet
      WHERE surface IN ('oab','leitor','plano','fichamento')
        AND facet::text NOT IN ('kaline','klio','kuanyin');

    ALTER TABLE public.chat_threads
      ALTER COLUMN facet SET DEFAULT 'klio'::public.chat_facet;
  ELSE
    UPDATE public.chat_threads
      SET facet = 'klio'
      WHERE facet = 'kalisto';

    UPDATE public.chat_threads
      SET facet = 'klio'
      WHERE surface IN ('oab','leitor','plano','fichamento')
        AND facet NOT IN ('kaline','klio','kuanyin');

    ALTER TABLE public.chat_threads
      ALTER COLUMN facet SET DEFAULT 'klio';
  END IF;
END $$;
