-- A reserva precisa existir antes do modelo e do envio ao Telegram.
alter table public.telegram_dialogues
  alter column kaline_message_id drop not null;

do $$
begin
  if exists (
    select chat_id, user_id, thread_id
    from public.telegram_dialogues
    where status in ('open', 'processing')
    group by chat_id, user_id, thread_id
    having count(*) > 1
  ) then
    raise exception
      'telegram_dialogues active duplicates detected; reconcile manually before creating the unique index';
  end if;
end
$$;

create unique index telegram_dialogues_one_active_per_scope
  on public.telegram_dialogues (chat_id, user_id, thread_id)
  where status in ('open', 'processing');
