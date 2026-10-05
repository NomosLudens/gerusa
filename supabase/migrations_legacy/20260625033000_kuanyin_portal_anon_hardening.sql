-- Harden the Kuan-Yin public portal surface.
--
-- The portal is served through server functions that validate the UUID token and
-- then use the service role client for the narrow read/write required by that
-- token. Direct anon SELECT grants are broader than that flow needs, so remove
-- them to avoid exposing valid token rows or portal targets through the public
-- Supabase API.

DROP POLICY IF EXISTS portal_token_anon_read ON public.kuanyin_portal_tokens;
DROP POLICY IF EXISTS appointment_anon_read_via_token ON public.kuanyin_appointments;
DROP POLICY IF EXISTS order_anon_read_via_token ON public.kuanyin_orders;
DROP POLICY IF EXISTS business_context_anon_read_via_token ON public.business_contexts;

REVOKE SELECT ON public.kuanyin_portal_tokens FROM anon;
REVOKE SELECT ON public.kuanyin_appointments FROM anon;
REVOKE SELECT ON public.kuanyin_orders FROM anon;
REVOKE SELECT ON public.business_contexts FROM anon;
