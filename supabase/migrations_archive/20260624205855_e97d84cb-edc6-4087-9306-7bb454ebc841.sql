REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_workspace(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_workspace_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_workspace(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_workspace_owner() TO authenticated, service_role;