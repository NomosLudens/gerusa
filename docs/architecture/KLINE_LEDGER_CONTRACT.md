# K∧LINE Ledger / Mnemósine Ledger Contract

A Kaline Clean, a futura Kuan-Yin e a futura Klio Coder não conversam por prompt cruzado.
Elas conversam por eventos aprováveis no K∧LINE Ledger.

## Estado deste PR

Este PR cria apenas a fundação de banco do Ledger.
Ele não integra chat, Jardim, Revisão, sedimentação, Registro Vivo, Kaline Presente,
Câmara do Eco, anexos úteis, contexto vivo, auth, rotas, React, app-registry ou runtime.
Também não cria adapter TypeScript.

## Princípios

- append-only
- retrocompatível
- aditivo
- opcional no início
- não bloqueante
- sem DROP TABLE
- sem DROP COLUMN
- sem RENAME TABLE
- sem RENAME COLUMN
- sem backfill obrigatório
- sem migrar dados antigos
- sem quebrar chat
- sem quebrar auth
- sem quebrar sedimentação
- sem quebrar Jardim/Revisão
- sem quebrar anexos úteis
- peso fora do Supabase

## Schema mínimo criado

### `public.kline_events`

Tabela canônica mínima de eventos.

- `id`: identificador do evento.
- `user_id`: dono do evento.
- `event_type`: tipo livre e obrigatório do evento.
- `source_app`: origem textual obrigatória e não vazia, sem lista rígida neste PR.
- `occurred_at`: data real do acontecimento.
- `title`: título opcional.
- `body`: corpo opcional.
- `payload`: JSON opcional para dados estruturados pequenos.
- `metadata`: JSON opcional para metadados técnicos pequenos.
- `created_at`: data de inserção no Ledger.

### `public.kline_event_refs`

Tabela de referências opcionais para dados antigos ou externos.
Ela permite apontar para dados existentes sem mover, copiar ou reprocessar esses dados.

- `event_id`: evento do Ledger.
- `user_id`: dono da referência.
- `ref_kind`: `legacy`, `external` ou `derived`.
- `legacy_source_table`: nome da tabela legada referenciada.
- `legacy_source_id`: chave textual da linha/objeto legado, para aceitar UUID, slug, path, id externo, filename ou qualquer identificador textual.
- `external_ref`: referência externa quando não há linha local.
- `metadata`: metadados pequenos da referência.

### `public.kline_event_review_state`

Tabela append-only de estados de revisão.
Cada mudança de estado é uma nova linha; não há atualização obrigatória da linha anterior.

- `event_id`: evento revisado.
- `user_id`: dono do evento.
- `status`: `pending`, `approved`, `rejected` ou `archived`.
- `reviewer_id`: usuário revisor opcional.
- `note`: nota opcional.
- `metadata`: metadados pequenos da revisão.
- `created_at`: data da decisão/estado.

## Regra de retrocompatibilidade

O Ledger deve poder apontar para dados antigos sem mover dados.

Relações com dados legados usam:

- `legacy_source_table`
- `legacy_source_id` como `text`, por decisão explícita de retrocompatibilidade com UUID, slug, path, id externo, filename ou qualquer chave textual

Não há backfill neste PR.
Não há migração de dados antigos neste PR.
Não há alteração de semântica em tabelas existentes neste PR.

## Regra append-only

Usuários autenticados recebem policies de `SELECT` e `INSERT` sobre suas próprias linhas.
Eles não recebem policies de `UPDATE` ou `DELETE`.
Mudanças de revisão são representadas por novas linhas em `public.kline_event_review_state`.

## Relação entre apps

- Kaline Clean registra eventos pessoais, presença, calendário, memória, revisão e handoffs.
- Kuan-Yin futura registra eventos comerciais, clientes, agendamentos e pagamentos.
- Klio Coder futura registra eventos técnicos, prompts, PRs, debug e decisões.
- Todos compartilham eventos aprováveis, não memória bruta.

## Regra principal

Se o Ledger falhar, o fluxo principal continua.

O Ledger observa, registra e prepara continuidade entre apps.
Ele não é ponto único de falha.

## Adapter TypeScript

O adapter TypeScript existe para escrita best-effort no Ledger.
Ele não torna o Ledger obrigatório.
Ele não altera runtime.
Ele não substitui tabelas legadas.
