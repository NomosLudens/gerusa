
-- portal tokens (link público "Ver proposta")
CREATE TABLE public.kuanyin_portal_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('appointment','order')),
  appointment_id UUID REFERENCES public.kuanyin_appointments(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.kuanyin_orders(id) ON DELETE CASCADE,
  label TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kpt_target_present CHECK (
    (scope = 'appointment' AND appointment_id IS NOT NULL AND order_id IS NULL)
    OR (scope = 'order' AND order_id IS NOT NULL AND appointment_id IS NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kuanyin_portal_tokens TO authenticated;
GRANT ALL ON public.kuanyin_portal_tokens TO service_role;
ALTER TABLE public.kuanyin_portal_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpt_owner" ON public.kuanyin_portal_tokens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER touch_kpt BEFORE UPDATE ON public.kuanyin_portal_tokens FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_kpt_user ON public.kuanyin_portal_tokens(user_id, created_at DESC);

-- integrity logs (camada de integridade comercial)
CREATE TABLE public.kuanyin_integrity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  thread_id UUID,
  severity TEXT NOT NULL CHECK (severity IN ('info','warn','block')),
  category TEXT NOT NULL,
  note TEXT,
  excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kuanyin_integrity_logs TO authenticated;
GRANT ALL ON public.kuanyin_integrity_logs TO service_role;
ALTER TABLE public.kuanyin_integrity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kil_owner" ON public.kuanyin_integrity_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_kil_user ON public.kuanyin_integrity_logs(user_id, created_at DESC);
