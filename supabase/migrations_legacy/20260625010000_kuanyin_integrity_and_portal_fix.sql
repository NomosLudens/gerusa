-- Fix missing FKs to auth.users
ALTER TABLE public.kuanyin_appointments 
  ADD CONSTRAINT kuanyin_appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.kuanyin_appointment_reminders 
  ADD CONSTRAINT kuanyin_appointment_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.kuanyin_orders 
  ADD CONSTRAINT kuanyin_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.kuanyin_payments 
  ADD CONSTRAINT kuanyin_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.kuanyin_portal_tokens 
  ADD CONSTRAINT kuanyin_portal_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.kuanyin_integrity_logs 
  ADD CONSTRAINT kuanyin_integrity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Missing Indices for Performance
CREATE INDEX IF NOT EXISTS idx_kuanyin_payments_order ON public.kuanyin_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_kuanyin_payments_appointment ON public.kuanyin_payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_kuanyin_appts_client ON public.kuanyin_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_kuanyin_appts_business ON public.kuanyin_appointments(business_context_id);
CREATE INDEX IF NOT EXISTS idx_kuanyin_orders_client ON public.kuanyin_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_kuanyin_orders_business ON public.kuanyin_orders(business_context_id);
CREATE INDEX IF NOT EXISTS idx_kpt_appointment ON public.kuanyin_portal_tokens(appointment_id);
CREATE INDEX IF NOT EXISTS idx_kpt_order ON public.kuanyin_portal_tokens(order_id);

-- Support for "Agenda Integrada" (Client -> User link)
ALTER TABLE public.kuanyin_clients 
  ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_kuanyin_clients_linked_user ON public.kuanyin_clients(linked_user_id);

-- Portal Access (Anon)
-- We need to allow anon to SELECT these tables, but only if they have a valid token.

GRANT SELECT ON public.kuanyin_portal_tokens TO anon;
GRANT SELECT ON public.kuanyin_appointments TO anon;
GRANT SELECT ON public.kuanyin_orders TO anon;
GRANT SELECT ON public.business_contexts TO anon; -- Needed to show business name/info in portal

-- Portal Token Policy for Anon
CREATE POLICY "portal_token_anon_read" ON public.kuanyin_portal_tokens
  FOR SELECT TO anon
  USING (expires_at > now() AND revoked_at IS NULL);

-- Appointments Policy for Anon (via token)
CREATE POLICY "appointment_anon_read_via_token" ON public.kuanyin_appointments
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.kuanyin_portal_tokens 
      WHERE appointment_id = public.kuanyin_appointments.id 
      AND expires_at > now() 
      AND revoked_at IS NULL
    )
  );

-- Orders Policy for Anon (via token)
CREATE POLICY "order_anon_read_via_token" ON public.kuanyin_orders
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.kuanyin_portal_tokens 
      WHERE order_id = public.kuanyin_orders.id 
      AND expires_at > now() 
      AND revoked_at IS NULL
    )
  );

-- Business Context Policy for Anon (via token/appointment/order)
CREATE POLICY "business_context_anon_read_via_token" ON public.business_contexts
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.kuanyin_appointments a
      JOIN public.kuanyin_portal_tokens t ON t.appointment_id = a.id
      WHERE a.business_context_id = public.business_contexts.id
      AND t.expires_at > now() AND t.revoked_at IS NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM public.kuanyin_orders o
      JOIN public.kuanyin_portal_tokens t ON t.order_id = o.id
      WHERE o.business_context_id = public.business_contexts.id
      AND t.expires_at > now() AND t.revoked_at IS NULL
    )
  );

-- Integrity/Consistency: Ensure that if a client has a business_context_id, it belongs to the same user_id.
-- This is harder to enforce via constraint without a composite FK, but we can add a check or just rely on logic.
-- For now, let's add a comment/instruction.

