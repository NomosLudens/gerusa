-- Keep stored procedures from inheriting a caller-controlled search_path.
-- public is not writable by anon/authenticated in the production project.
ALTER FUNCTION public.approve_memory_candidate_atomic(
  uuid, uuid, text, text, text, text, text[], integer
) SET search_path = public, pg_temp;

ALTER FUNCTION public.confirm_sediment_atomic(
  uuid, uuid, text, text, integer, text[]
) SET search_path = public, pg_temp;

ALTER FUNCTION public.promote_sediment_batch_atomic(
  uuid, uuid, text, uuid[], text, text, numeric, text, text
) SET search_path = public, pg_temp;

ALTER FUNCTION public.prevent_character_event_mutation()
  SET search_path = public, pg_temp;
