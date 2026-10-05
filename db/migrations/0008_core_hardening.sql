-- PR3 core hardening. Historical migrations remain immutable.
-- Thread writes always provide KALLISTIS identity explicitly; no legacy default remains.
ALTER TABLE public.chat_threads
    ALTER COLUMN surface DROP DEFAULT,
    ALTER COLUMN facet DROP DEFAULT;

-- Identity provisioning is an explicit administrative operation, never a web-runtime task.
REVOKE INSERT, UPDATE ON TABLE public.users FROM kallistis;
REVOKE INSERT, UPDATE ON TABLE public.credentials FROM kallistis;

-- The local runtime persists messages by INSERT and never updates them.
REVOKE UPDATE ON TABLE public.chat_messages FROM kallistis;
