alter table public.chat_messages
  add column if not exists source_channel text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chat_messages_source_channel_check'
      and conrelid = 'public.chat_messages'::regclass
  ) then
    alter table public.chat_messages
      add constraint chat_messages_source_channel_check
      check (source_channel is null or source_channel in ('C01', 'C02', 'C03'));
  end if;
end $$;
