DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kuanyin_appointments_user_id_fkey') THEN
    ALTER TABLE public.kuanyin_appointments ADD CONSTRAINT kuanyin_appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kuanyin_appointment_reminders_user_id_fkey') THEN
    ALTER TABLE public.kuanyin_appointment_reminders ADD CONSTRAINT kuanyin_appointment_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kuanyin_orders_user_id_fkey') THEN
    ALTER TABLE public.kuanyin_orders ADD CONSTRAINT kuanyin_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kuanyin_payments_user_id_fkey') THEN
    ALTER TABLE public.kuanyin_payments ADD CONSTRAINT kuanyin_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kuanyin_portal_tokens_user_id_fkey') THEN
    ALTER TABLE public.kuanyin_portal_tokens ADD CONSTRAINT kuanyin_portal_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kuanyin_integrity_logs_user_id_fkey') THEN
    ALTER TABLE public.kuanyin_integrity_logs ADD CONSTRAINT kuanyin_integrity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kuanyin_payments_order ON public.kuanyin_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_kuanyin_payments_appointment ON public.kuanyin_payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_kuanyin_appts_client ON public.kuanyin_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_kuanyin_appts_business ON public.kuanyin_appointments(business_context_id);
CREATE INDEX IF NOT EXISTS idx_kuanyin_orders_client ON public.kuanyin_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_kuanyin_orders_business ON public.kuanyin_orders(business_context_id);
CREATE INDEX IF NOT EXISTS idx_kpt_appointment ON public.kuanyin_portal_tokens(appointment_id);
CREATE INDEX IF NOT EXISTS idx_kpt_order ON public.kuanyin_portal_tokens(order_id);

ALTER TABLE public.kuanyin_clients ADD COLUMN IF NOT EXISTS linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_kuanyin_clients_linked_user ON public.kuanyin_clients(linked_user_id);

GRANT SELECT ON public.kuanyin_portal_tokens TO anon;
GRANT SELECT ON public.kuanyin_appointments TO anon;
GRANT SELECT ON public.kuanyin_orders TO anon;
GRANT SELECT ON public.business_contexts TO anon;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='kuanyin_portal_tokens' AND policyname='portal_token_anon_read') THEN
    CREATE POLICY portal_token_anon_read ON public.kuanyin_portal_tokens FOR SELECT TO anon USING (expires_at > now() AND revoked_at IS NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='kuanyin_appointments' AND policyname='appointment_anon_read_via_token') THEN
    CREATE POLICY appointment_anon_read_via_token ON public.kuanyin_appointments FOR SELECT TO anon USING (
      EXISTS (
        SELECT 1 FROM public.kuanyin_portal_tokens
        WHERE appointment_id = public.kuanyin_appointments.id
          AND expires_at > now()
          AND revoked_at IS NULL
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='kuanyin_orders' AND policyname='order_anon_read_via_token') THEN
    CREATE POLICY order_anon_read_via_token ON public.kuanyin_orders FOR SELECT TO anon USING (
      EXISTS (
        SELECT 1 FROM public.kuanyin_portal_tokens
        WHERE order_id = public.kuanyin_orders.id
          AND expires_at > now()
          AND revoked_at IS NULL
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_contexts' AND policyname='business_context_anon_read_via_token') THEN
    CREATE POLICY business_context_anon_read_via_token ON public.business_contexts FOR SELECT TO anon USING (
      EXISTS (
        SELECT 1 FROM public.kuanyin_appointments a
        JOIN public.kuanyin_portal_tokens t ON t.appointment_id = a.id
        WHERE a.business_context_id = public.business_contexts.id
          AND t.expires_at > now()
          AND t.revoked_at IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM public.kuanyin_orders o
        JOIN public.kuanyin_portal_tokens t ON t.order_id = o.id
        WHERE o.business_context_id = public.business_contexts.id
          AND t.expires_at > now()
          AND t.revoked_at IS NULL
      )
    );
  END IF;
END $$;