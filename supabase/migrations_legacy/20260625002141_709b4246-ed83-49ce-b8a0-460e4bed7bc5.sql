
-- Fase 1: Kuan-Yin como faceta comercial sobre Kaline

-- 1) business_contexts
CREATE TABLE public.business_contexts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT,
  servicos JSONB NOT NULL DEFAULT '[]'::jsonb,
  precos JSONB NOT NULL DEFAULT '{}'::jsonb,
  tom_voz TEXT,
  formas_pagamento JSONB NOT NULL DEFAULT '[]'::jsonb,
  pix_chave TEXT,
  regras_agenda JSONB NOT NULL DEFAULT '{}'::jsonb,
  limites_decisao JSONB NOT NULL DEFAULT '{}'::jsonb,
  regras_escalonamento JSONB NOT NULL DEFAULT '{}'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_contexts TO authenticated;
GRANT ALL ON public.business_contexts TO service_role;
ALTER TABLE public.business_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages business_contexts" ON public.business_contexts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_business_contexts_updated
  BEFORE UPDATE ON public.business_contexts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_business_contexts_user ON public.business_contexts(user_id);

-- 2) kuanyin_clients (prefixo evita colisão com nomes genéricos)
CREATE TABLE public.kuanyin_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_context_id UUID REFERENCES public.business_contexts(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  preferencias JSONB NOT NULL DEFAULT '{}'::jsonb,
  notas TEXT,
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect','confirmed','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kuanyin_clients TO authenticated;
GRANT ALL ON public.kuanyin_clients TO service_role;
ALTER TABLE public.kuanyin_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages kuanyin_clients" ON public.kuanyin_clients
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_kuanyin_clients_updated
  BEFORE UPDATE ON public.kuanyin_clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_kuanyin_clients_user ON public.kuanyin_clients(user_id);
CREATE INDEX idx_kuanyin_clients_business ON public.kuanyin_clients(business_context_id);

-- 3) faceta na thread (para o chat saber quando aplicar bloco Kuan-Yin)
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS facet TEXT NOT NULL DEFAULT 'kaline';
