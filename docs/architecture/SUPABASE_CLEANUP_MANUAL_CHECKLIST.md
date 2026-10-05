# Supabase Cleanup Manual Checklist

## Antes de qualquer limpeza

- [ ] Exportar backup completo do Supabase.
- [ ] Exportar schema atual.
- [ ] Exportar lista de tabelas.
- [ ] Exportar lista de buckets.
- [ ] Salvar resultado de docs/sql/supabase_kaline_cleanup_audit.sql.
- [ ] Conferir tabelas com linhas > 0.
- [ ] Conferir tabelas usadas no código.
- [ ] Marcar manualmente KEEP_CORE.
- [ ] Marcar manualmente KEEP_INTERNAL.
- [ ] Marcar manualmente ARCHIVE_CANDIDATE.
- [ ] Marcar manualmente DROP_CANDIDATE.
- [ ] Não apagar UNKNOWN.

## Regra

Se houver dúvida, manter.
