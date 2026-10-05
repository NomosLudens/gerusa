-- KALLISTIS security hardening and recovery identity repair.
-- RLS remains intentionally unchanged; the Worker is the current auth boundary.

-- The Worker calls this function through the internal runtime role. It does not
-- need SECURITY DEFINER because that role already owns the required DELETE grant.
ALTER FUNCTION public.delete_registro_vivo(uuid, uuid)
    SECURITY INVOKER;
ALTER FUNCTION public.delete_registro_vivo(uuid, uuid)
    SET search_path = pg_catalog, public;
REVOKE EXECUTE ON FUNCTION public.delete_registro_vivo(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_registro_vivo(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_registro_vivo(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_registro_vivo(uuid, uuid) TO kallistis;

-- The Auth user is the only trusted source for this identity. The old local
-- owner row is retained but disabled; its system_master authorization moves to
-- the confirmed Auth UID without inventing profile or credential data.
DO $$
DECLARE
    v_new_uid uuid := '88ed06e0-772e-47eb-ae2a-c920aaa197fe'::uuid;
    v_old_uid uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_new_uid) THEN
        RAISE EXCEPTION 'confirmed Auth UID is missing: %', v_new_uid;
    END IF;

    INSERT INTO public.users (id, status, disabled_at)
    VALUES (v_new_uid, 'active', NULL)
    ON CONFLICT (id) DO UPDATE
        SET status = 'active', disabled_at = NULL, updated_at = now();

    SELECT pu.id
      INTO v_old_uid
      FROM public.users pu
      JOIN public.system_roles sr ON sr.user_id = pu.id
     WHERE sr.system_role = 'system_master'
       AND pu.id <> v_new_uid
       AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id)
     ORDER BY pu.created_at
     LIMIT 1;

    IF v_old_uid IS NOT NULL THEN
        INSERT INTO public.system_roles (user_id, system_role)
        SELECT v_new_uid, sr.system_role
          FROM public.system_roles sr
         WHERE sr.user_id = v_old_uid
        ON CONFLICT (user_id) DO NOTHING;

        DELETE FROM public.system_roles WHERE user_id = v_old_uid;
        UPDATE public.users
           SET status = 'disabled',
               disabled_at = coalesce(disabled_at, now()),
               updated_at = now()
         WHERE id = v_old_uid;
    ELSE
        INSERT INTO public.system_roles (user_id, system_role)
        VALUES (v_new_uid, 'system_master')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END
$$;
