do $$
begin
  alter type public.app_role add value 'member';
exception
  when duplicate_object then null;
end $$;
