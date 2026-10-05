
-- ============ REGISTRO VIVO ============
CREATE TABLE public.registro_vivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('nota','evento','sentimento','ideia','dor','ganho','sonho','pergunta')),
  body TEXT NOT NULL,
  mood SMALLINT CHECK (mood IS NULL OR (mood >= -3 AND mood <= 3)),
  tags TEXT[] NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX registro_vivo_user_occurred_idx ON public.registro_vivo (user_id, occurred_at DESC);
CREATE INDEX registro_vivo_user_kind_idx ON public.registro_vivo (user_id, kind);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registro_vivo TO authenticated;
GRANT ALL ON public.registro_vivo TO service_role;
ALTER TABLE public.registro_vivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registro_vivo workspace access"
  ON public.registro_vivo FOR ALL
  USING (public.can_access_workspace(user_id, 'agenda'))
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER registro_vivo_touch BEFORE UPDATE ON public.registro_vivo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ JARDIM (memórias com repetição espaçada) ============
CREATE TABLE public.jardim_memorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT,
  source_ref UUID,
  category TEXT NOT NULL DEFAULT 'geral',
  tags TEXT[] NOT NULL DEFAULT '{}',
  importance SMALLINT NOT NULL DEFAULT 2 CHECK (importance BETWEEN 1 AND 3),
  ease NUMERIC NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 1,
  review_count INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX jardim_user_due_idx ON public.jardim_memorias (user_id, next_review_at) WHERE archived_at IS NULL;
CREATE INDEX jardim_user_created_idx ON public.jardim_memorias (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jardim_memorias TO authenticated;
GRANT ALL ON public.jardim_memorias TO service_role;
ALTER TABLE public.jardim_memorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jardim workspace access"
  ON public.jardim_memorias FOR ALL
  USING (public.can_access_workspace(user_id, 'agenda'))
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER jardim_touch BEFORE UPDATE ON public.jardim_memorias
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ CORPUS JURÍDICO CURADO ============
CREATE TABLE public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('constituicao','codigo','lei','decreto','sumula','tema','enunciado','outro')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  jurisdicao TEXT NOT NULL DEFAULT 'federal',
  ano INTEGER,
  numero TEXT,
  status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente','revogado','em_revisao','bloqueado')),
  source_url TEXT,
  editorial_notes TEXT,
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX legal_documents_kind_status_idx ON public.legal_documents (kind, status);
CREATE INDEX legal_documents_slug_idx ON public.legal_documents (slug);
GRANT SELECT ON public.legal_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_documents TO service_role;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal_documents read for authenticated"
  ON public.legal_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "legal_documents admin write"
  ON public.legal_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER legal_documents_touch BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.legal_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.legal_chunks(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('titulo','capitulo','secao','artigo','paragrafo','inciso','alinea')),
  path TEXT NOT NULL,
  ordinal INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente','revogado','em_revisao','bloqueado','alterado_recentemente')),
  revised_at TIMESTAMPTZ,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX legal_chunks_doc_path_idx ON public.legal_chunks (document_id, ordinal);
CREATE INDEX legal_chunks_text_trgm_idx ON public.legal_chunks USING GIN (to_tsvector('portuguese', text));
GRANT SELECT ON public.legal_chunks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_chunks TO service_role;
ALTER TABLE public.legal_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal_chunks read for authenticated"
  ON public.legal_chunks FOR SELECT TO authenticated USING (true);
CREATE POLICY "legal_chunks admin write"
  ON public.legal_chunks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER legal_chunks_touch BEFORE UPDATE ON public.legal_chunks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
