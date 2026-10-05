-- Automatically provision every Supabase Auth identity into the KALLISTIS
-- identity table. The Auth UID remains the sole identity key.

CREATE OR REPLACE FUNCTION public.provision_kallistis_user_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO public.users (id, status, disabled_at)
    VALUES (NEW.id, 'active', NULL)
    ON CONFLICT (id) DO UPDATE
        SET status = 'active',
            disabled_at = NULL,
            updated_at = now();
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_kallistis_user_from_auth() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created_provision_kallistis_user ON auth.users;
CREATE TRIGGER on_auth_user_created_provision_kallistis_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.provision_kallistis_user_from_auth();

-- Backfill only Auth identities that already exist and have no KALLISTIS row.
-- This preserves each Auth UID and does not create Auth users.
INSERT INTO public.users (id, status, disabled_at)
SELECT au.id, 'active', NULL
  FROM auth.users au
  LEFT JOIN public.users pu ON pu.id = au.id
 WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
