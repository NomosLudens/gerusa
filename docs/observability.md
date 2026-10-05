# Observabilidade e diagnóstico

A observabilidade mínima da Kuan-Yin usa `trace_id` no formato `trc_...` para rastrear fluxos críticos sem expor dados sensíveis.

## Eventos cobertos nesta fase

- Solicitação pública de agendamento.
- Pedido/orçamento público.
- Registro de comprovante textual.
- Falhas de Supabase nesses fluxos.

Os eventos estruturados usam área, ação, nível, usuário/Guardião quando aplicável, rota e metadata sanitizada. Metadata não deve conter token, segredo, chave, comprovante completo, prompt interno, áudio ou observação sensível.

## Consulta operacional

Enquanto `/admin/diagnostico` está **planned**, consulte pelo `trace_id` em logs de runtime e nos campos `metadata->trace_id` das tabelas comerciais (`kuanyin_appointments`, `kuanyin_orders`, `kuanyin_payments`).

Exemplo SQL:

```sql
select id, status, metadata, created_at
from kuanyin_appointments
where metadata->>'trace_id' = 'trc_exemplo';
```

## Mensagens amigáveis

A UI deve mostrar mensagens como: `Não consegui concluir agora. Código de suporte: trc_abc123.` Nunca mostrar stack trace, erro bruto do Supabase, token ou segredo ao usuário final.
