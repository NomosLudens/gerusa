-- Uma síntese final da Câmara pode gerar somente um candidato revisável.
-- O índice também protege retries concorrentes do mesmo update do Telegram.
create unique index if not exists sedimentos_one_telegram_dialogue_final_per_message
  on public.sedimentos (user_id, thread_id, source_kind, (source_ids[1]))
  where source_kind = 'telegram_dialogue_final'
    and cardinality(source_ids) = 1;
