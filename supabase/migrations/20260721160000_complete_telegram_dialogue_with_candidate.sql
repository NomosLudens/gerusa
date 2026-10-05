alter table public.telegram_dialogues
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists thread_id uuid references public.chat_threads(id) on delete cascade,
  add column if not exists final_assistant_message_id uuid references public.chat_messages(id) on delete restrict;

create unique index if not exists telegram_dialogues_one_final_assistant_message
  on public.telegram_dialogues (final_assistant_message_id)
  where final_assistant_message_id is not null;

create index if not exists telegram_dialogues_user_id_idx
  on public.telegram_dialogues (user_id);

create index if not exists telegram_dialogues_thread_id_idx
  on public.telegram_dialogues (thread_id);

create or replace function public.complete_telegram_dialogue_with_candidate(
  p_dialogue_id uuid,
  p_user_id uuid,
  p_thread_id uuid,
  p_assistant_message_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_candidate_id uuid;
  v_synthesis text;
  v_dialogue_user_id uuid;
  v_dialogue_thread_id uuid;
  v_final_assistant_message_id uuid;
  v_already_completed boolean := false;
begin
  select status, user_id, thread_id, final_assistant_message_id
  into v_status, v_dialogue_user_id, v_dialogue_thread_id, v_final_assistant_message_id
  from public.telegram_dialogues
  where id = p_dialogue_id
  for update;

  if not found then
    raise exception 'telegram dialogue not found' using errcode = 'P0002';
  end if;

  if v_dialogue_user_id is distinct from p_user_id
    or v_dialogue_thread_id is distinct from p_thread_id
  then
    raise exception 'telegram dialogue ownership mismatch' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.chat_threads
    where id = p_thread_id
      and user_id = p_user_id
      and facet = 'kaline'
      and surface = 'telegram_dialogue'
  ) then
    raise exception 'telegram dialogue ownership mismatch' using errcode = '42501';
  end if;

  select content
  into v_synthesis
  from public.chat_messages
  where id = p_assistant_message_id
    and thread_id = p_thread_id
    and user_id = p_user_id
    and role = 'assistant'
    and source_channel = 'C03';

  if not found then
    raise exception 'final assistant message not found' using errcode = 'P0002';
  end if;

  if v_status = 'completed' then
    if v_final_assistant_message_id is distinct from p_assistant_message_id then
      raise exception 'telegram dialogue final message mismatch' using errcode = 'P0004';
    end if;
    v_already_completed := true;
  elsif v_status = 'processing' then
    update public.telegram_dialogues
    set status = 'completed',
        completed_at = now(),
        error_code = null,
        final_assistant_message_id = p_assistant_message_id
    where id = p_dialogue_id;
  else
    raise exception 'telegram dialogue is not processing' using errcode = 'P0004';
  end if;

  insert into public.sedimentos (
    user_id,
    thread_id,
    nivel,
    status,
    source_kind,
    source_ids,
    hipotese,
    resumo,
    confianca
  ) values (
    p_user_id,
    p_thread_id,
    'short_term',
    'em_revisao',
    'telegram_dialogue_final',
    array[p_assistant_message_id::text],
    v_synthesis,
    v_synthesis,
    1
  )
  on conflict (user_id, thread_id, source_kind, (source_ids[1]))
    where source_kind = 'telegram_dialogue_final'
      and cardinality(source_ids) = 1
  do nothing
  returning id into v_candidate_id;

  if v_candidate_id is null then
    select id
    into v_candidate_id
    from public.sedimentos
    where user_id = p_user_id
      and thread_id = p_thread_id
      and source_kind = 'telegram_dialogue_final'
      and source_ids = array[p_assistant_message_id::text]
    limit 1;
  end if;

  if v_candidate_id is null then
    raise exception 'final dialogue candidate unavailable' using errcode = 'P0004';
  end if;

  return jsonb_build_object(
    'dialogue_id', p_dialogue_id,
    'candidate_id', v_candidate_id,
    'already_completed', v_already_completed
  );
end;
$$;

revoke execute on function public.complete_telegram_dialogue_with_candidate(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.complete_telegram_dialogue_with_candidate(uuid, uuid, uuid, uuid)
  to service_role;
