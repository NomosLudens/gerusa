
-- ─── kuanyin_appointments ───────────────────────────────────────────────
CREATE TABLE public.kuanyin_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.kuanyin_clients(id) ON DELETE SET NULL,
  business_context_id UUID REFERENCES public.business_contexts(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','confirmed','cancelled','completed')),
  notes TEXT,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kuanyin_appointments TO authenticated;
GRANT ALL ON public.kuanyin_appointments TO service_role;
ALTER TABLE public.kuanyin_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kuanyin_appointments_owner" ON public.kuanyin_appointments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER touch_kuanyin_appointments BEFORE UPDATE ON public.kuanyin_appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_kuanyin_appts_user_starts ON public.kuanyin_appointments(user_id, starts_at);

-- ─── kuanyin_appointment_reminders ──────────────────────────────────────
CREATE TABLE public.kuanyin_appointment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  appointment_id UUID NOT NULL REFERENCES public.kuanyin_appointments(id) ON DELETE CASCADE,
  send_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kuanyin_appointment_reminders TO authenticated;
GRANT ALL ON public.kuanyin_appointment_reminders TO service_role;
ALTER TABLE public.kuanyin_appointment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kuanyin_reminders_owner" ON public.kuanyin_appointment_reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER touch_kuanyin_reminders BEFORE UPDATE ON public.kuanyin_appointment_reminders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── kuanyin_orders ─────────────────────────────────────────────────────
CREATE TABLE public.kuanyin_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.kuanyin_clients(id) ON DELETE SET NULL,
  business_context_id UUID REFERENCES public.business_contexts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','proposed','confirmed','cancelled','delivered')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kuanyin_orders TO authenticated;
GRANT ALL ON public.kuanyin_orders TO service_role;
ALTER TABLE public.kuanyin_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kuanyin_orders_owner" ON public.kuanyin_orders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER touch_kuanyin_orders BEFORE UPDATE ON public.kuanyin_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_kuanyin_orders_user ON public.kuanyin_orders(user_id, created_at DESC);

-- ─── kuanyin_payments ───────────────────────────────────────────────────
CREATE TABLE public.kuanyin_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.kuanyin_orders(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.kuanyin_appointments(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  method TEXT,
  comprovante_ref TEXT,
  status TEXT NOT NULL DEFAULT 'received_proof' CHECK (status IN ('received_proof','verified','rejected','pending')),
  fraud_alert_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kuanyin_payments TO authenticated;
GRANT ALL ON public.kuanyin_payments TO service_role;
ALTER TABLE public.kuanyin_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kuanyin_payments_owner" ON public.kuanyin_payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER touch_kuanyin_payments BEFORE UPDATE ON public.kuanyin_payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_kuanyin_payments_user ON public.kuanyin_payments(user_id, created_at DESC);
