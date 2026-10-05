-- Administrative player access revocation without deleting historical identity data.
CREATE TABLE IF NOT EXISTS public.user_access_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    action text NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_access_events_action_check CHECK (action IN ('revoke', 'restore')),
    CONSTRAINT user_access_events_reason_check CHECK (reason IS NULL OR length(reason) <= 500)
);

CREATE INDEX IF NOT EXISTS user_access_events_user_idx
    ON public.user_access_events (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_player_access_status(
    p_actor_user_id uuid,
    p_target_user_id uuid,
    p_action text,
    p_reason text DEFAULT NULL
)
RETURNS TABLE(target_user_id uuid, access_status text, sessions_revoked integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_current_status text;
    v_sessions_revoked integer := 0;
    v_reason text := NULLIF(left(trim(coalesce(p_reason, '')), 500), '');
BEGIN
    IF p_actor_user_id IS NULL OR p_target_user_id IS NULL THEN
        RAISE EXCEPTION 'access identities are required' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.system_roles
         WHERE user_id = p_actor_user_id AND system_role = 'system_master'
    ) THEN
        RAISE EXCEPTION 'access admin forbidden' USING ERRCODE = '42501';
    END IF;
    IF p_actor_user_id = p_target_user_id THEN
        RAISE EXCEPTION 'self access change forbidden' USING ERRCODE = '42501';
    END IF;
    IF p_action NOT IN ('revoke', 'restore') THEN
        RAISE EXCEPTION 'invalid access action' USING ERRCODE = '22023';
    END IF;

    SELECT u.status
      INTO v_current_status
      FROM public.users u
     WHERE u.id = p_target_user_id
       AND NOT EXISTS (
         SELECT 1 FROM public.system_roles sr
          WHERE sr.user_id = u.id AND sr.system_role = 'system_master'
       )
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'player not found' USING ERRCODE = 'P0002';
    END IF;

    IF p_action = 'revoke' THEN
        UPDATE public.users
           SET status = 'disabled', disabled_at = coalesce(disabled_at, now()), updated_at = now()
         WHERE id = p_target_user_id;
        UPDATE public.sessions
           SET revoked_at = coalesce(revoked_at, now())
         WHERE user_id = p_target_user_id AND revoked_at IS NULL;
        GET DIAGNOSTICS v_sessions_revoked = ROW_COUNT;
        access_status := 'revoked';
    ELSE
        UPDATE public.users
           SET status = 'active', disabled_at = NULL, updated_at = now()
         WHERE id = p_target_user_id;
        access_status := 'active';
    END IF;

    INSERT INTO public.user_access_events (user_id, actor_user_id, action, reason)
    VALUES (p_target_user_id, p_actor_user_id, p_action, v_reason);

    target_user_id := p_target_user_id;
    sessions_revoked := v_sessions_revoked;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.set_player_access_status(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_player_access_status(uuid, uuid, text, text) TO kallistis;
