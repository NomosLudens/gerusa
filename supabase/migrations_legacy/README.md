# Migrations legadas — superadas pelo baseline único

Estas 39 migrations formam o histórico incremental real do projeto (de
`20260101000000_baseline.sql` até `20260702000000_codice_livros_updated_at_fix.sql`).
Foram substituídas por um único arquivo consolidado:
`supabase/migrations/20260702010000_clean_baseline_v2.sql`.

## O que isto NÃO muda

**O Supabase de produção atual não é afetado.** O histórico de migrations
aplicadas é rastreado do lado do servidor Supabase (tabela
`supabase_migrations.schema_migrations`), não pelos arquivos locais. Mover
estes arquivos daqui para `migrations_legacy/` não desfaz, reaplica nem
altera nada no banco já em produção.

## Para que servem agora

Só como **referência histórica** — para entender como o schema evoluiu,
investigar uma decisão antiga, ou depurar uma discrepância entre o schema
real e o que o baseline novo assume. Não devem ser aplicadas:

- **Não aplique estes arquivos a um projeto Supabase novo.** Use
  `supabase/migrations/20260702010000_clean_baseline_v2.sql` sozinho —
  ele já contém o schema final completo (47 tabelas, RLS, storage,
  funções), reconstruído por leitura destas 39 migrations e **validado
  por execução real** contra PostgreSQL 16 (replay completo das 39 +
  `pg_dump` do resultado + diff coluna a coluna contra o baseline novo +
  testes funcionais de constraint, sedimentação e bootstrap de admin).
- **Não misture os dois conjuntos.** Rodar as 39 legadas E o baseline novo
  no mesmo projeto causaria conflitos (o baseline novo tenta recriar
  policies/constraints que as legadas já criaram com nomes diferentes).

## Diferenças conhecidas entre o schema real (produção) e o baseline novo

O baseline novo reproduz fielmente o schema real com **uma mudança
deliberada**: o bootstrap de signup foi endurecido a pedido do dono do
projeto.

- **Produção atual** (via estas migrations legadas): `profiles.role`
  default `'admin'`; `handle_new_user()` insere `user_roles=('admin')`
  para **todo** signup. Ou seja, hoje todo novo usuário nasce admin.
- **Baseline novo**: só o **primeiro** usuário criado no projeto vira
  admin (em `profiles.role` e `user_roles`). Todo signup seguinte nasce
  `profiles.role='user'`, sem entrada em `user_roles` — precisa de
  promoção manual e explícita depois.

Isso significa que um projeto novo criado a partir do baseline único vai
se comportar de forma diferente da produção atual nesse ponto específico
— por design, não por descuido.

## Achado corrigido durante a reconstrução

Ao replayar estas 39 migrations do zero contra um Postgres real (não só
lidas), foi confirmado um bug real em
`20260630203000_codice_library_storage.sql`: ela cria um índice sobre
`livros.updated_at`, mas nenhuma migration anterior adiciona essa coluna
via `ALTER TABLE` — nem o `CREATE TABLE` original em
`20260101000000_baseline.sql`. Isso já tinha sido corrigido para frente
(sem reescrever a migration antiga) em
`20260702000000_codice_livros_updated_at_fix.sql`, mantida aqui como
histórico. O baseline novo já nasce com a coluna e o trigger corretos.
