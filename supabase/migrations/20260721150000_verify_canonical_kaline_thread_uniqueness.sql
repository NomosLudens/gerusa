-- Operação segura: corrija duplicidades manualmente antes de reaplicar índices.
-- Diagnóstico: select user_id, surface, count(*) from public.chat_threads
-- where facet = 'kaline' and surface in ('kaline', 'telegram_dialogue')
-- group by user_id, surface having count(*) > 1;
do $$
begin
  if exists (
    select 1
    from public.chat_threads
    where facet = 'kaline' and surface in ('kaline', 'telegram_dialogue')
    group by user_id, surface
    having count(*) > 1
  ) then
    raise exception 'canonical Kaline thread duplicates detected; reconcile manually before creating indexes';
  end if;
end $$;

create unique index if not exists chat_threads_one_private_kaline_per_user
  on public.chat_threads (user_id)
  where facet = 'kaline' and surface = 'kaline';

create unique index if not exists chat_threads_one_dialogue_kaline_per_user
  on public.chat_threads (user_id)
  where facet = 'kaline' and surface = 'telegram_dialogue';
