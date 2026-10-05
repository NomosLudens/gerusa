
CREATE TABLE public.camara_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  modo text NOT NULL CHECK (modo IN ('audio','texto')),
  status text NOT NULL DEFAULT 'gravando' CHECK (status IN ('gravando','finalizado')),
  texto_rapido text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camara_sessoes TO authenticated;
GRANT ALL ON public.camara_sessoes TO service_role;
ALTER TABLE public.camara_sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camara_sessoes own" ON public.camara_sessoes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER camara_sessoes_touch BEFORE UPDATE ON public.camara_sessoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.camara_segmentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES public.camara_sessoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  inicio_seg int NOT NULL,
  fim_seg int NOT NULL,
  audio_path text,
  transcricao text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','transcribed','failed')),
  erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camara_segmentos TO authenticated;
GRANT ALL ON public.camara_segmentos TO service_role;
ALTER TABLE public.camara_segmentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camara_segmentos own" ON public.camara_segmentos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX camara_segmentos_sessao_idx ON public.camara_segmentos(sessao_id, ordem);
CREATE TRIGGER camara_segmentos_touch BEFORE UPDATE ON public.camara_segmentos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "camara_audio own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'camara-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "camara_audio own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'camara-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "camara_audio own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'camara-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
