-- Allow the authenticated application runtime to invoke its user-scoped delete
-- operation without granting DELETE through the public Data API roles.
GRANT DELETE ON TABLE public.registro_vivo TO kallistis;
