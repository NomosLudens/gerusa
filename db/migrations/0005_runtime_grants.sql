-- Runtime privileges for the dedicated VM role.
-- The administrator must create role kallistis before applying this file.
-- No password or role creation belongs in the repository.

GRANT USAGE ON SCHEMA public TO kallistis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM kallistis;

GRANT SELECT ON TABLE public.users, public.credentials TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.sessions TO kallistis;
GRANT SELECT, UPDATE ON TABLE public.chat_threads TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.chat_messages TO kallistis;
GRANT SELECT, UPDATE ON TABLE public.memory_candidates TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.jardim_memorias TO kallistis;
GRANT SELECT, INSERT, UPDATE ON TABLE public.sedimentos TO kallistis;

GRANT EXECUTE ON FUNCTION public.approve_memory_candidate_atomic(
    uuid, uuid, text, text, text, text, text[], integer
) TO kallistis;
GRANT EXECUTE ON FUNCTION public.confirm_sediment_atomic(
    uuid, uuid, text, text, integer, text[]
) TO kallistis;
GRANT EXECUTE ON FUNCTION public.promote_sediment_batch_atomic(
    uuid, uuid, text, uuid[], text, text, numeric, text, text
) TO kallistis;
