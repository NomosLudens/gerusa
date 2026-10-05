# KALLISTIS — Fase 0D — fundação PostgreSQL local

## TABLES_INCLUDED

O núcleo mínimo foi reduzido a oito tabelas, na ordem de dependência:

```text
users
credentials
sessions
chat_threads
chat_messages
memory_candidates
jardim_memorias
sedimentos
```

UUID e timestamps explícitos foram preservados. Ordering de mensagens usa
`created_at, id`, nunca ordem implícita.

## TABLES_DEFERRED

`registro_vivo`, `eventos`, `presenca_regimes`, `contexto_externo`, campanhas,
membership, Storage e os demais domínios Totalidade foram adiados. A leitura
do motor mostrou que não são necessários para o contrato mínimo de chat,
memória candidata, memória confirmada e sedimentação; o contexto vivo atual
continua legado até uma decisão específica.

## SQL_FUNCTIONS_INCLUDED

`0004_memory_atomic.sql` inclui:

- `approve_memory_candidate_atomic`;
- `confirm_sediment_atomic`;
- `promote_sediment_batch_atomic`.

As três recebem `p_user_id` do backend autenticado, validam ownership e status,
usam `FOR UPDATE` quando há concorrência de promoção, preservam a validação de
lote de cinco e a progressão allowlist. Aprovação e confirmação preservam a
idempotência existente.

## SQL_FUNCTIONS_REPLACED

Nenhuma função legado foi alterada. As funções locais são uma tradução isolada
do contrato e não são aplicadas ao banco Supabase.

## DRIVER_DECISION

Não foi adicionada dependência. A introspecção do runtime mostrou `Bun.SQL`
nativo em Bun local `1.3.14`; o contrato da VM informa Bun `1.4.0`. O adaptador
lazy em `src/server/local-core/postgres.ts` usa somente uma URL PostgreSQL em
runtime e falha claramente fora do Bun. Não houve conexão, query ou teste de
integração; compatibilidade final com a versão da Max ainda exige prova no
handoff.

## DATABASE_CONFIG

```text
KALLISTIS_DATABASE_URL=postgresql://<runtime-role>:<runtime-secret>@127.0.0.1:5433/kallistis
KALLISTIS_CREDENTIAL_LOOKUP_KEY=<runtime-secret-for-blind-credential-index>
```

O valor acima é apenas forma documental; nenhum segredo ou valor real foi
gravado. O browser não conhece essa variável.

## ROLE_MODEL

O runtime futuro usará role própria de menor privilégio para `kallistis`, não
`postgres` e não `kaline`. Criação de role/base e injeção do segredo ficam para
operação administrativa posterior na Max. Não há `DROP`, `CREATE CLUSTER` ou
comando de execução no repo.

`0005_runtime_grants.sql` deve ser aplicada depois de a administração criar a
role `kallistis`. Ela concede uso do schema e somente os `SELECT`/`INSERT`/
`UPDATE` necessários por tabela, sem `DELETE`, além da execução das três
funções atômicas. `CONNECT` na base é concedido pela administração da VM, fora
das migrations.

O relatório posterior da Fase 0G registrou que as superfícies de produto ainda
legadas não podem ser abertas sob a sessão local antes de receberem seus
repositórios PostgreSQL; isso é uma fronteira transitória explícita, não um
fallback para Supabase.

## MIGRATION_ORDER

```text
0001_identity.sql
0002_chat.sql
0003_memory.sql
0004_memory_atomic.sql
0005_runtime_grants.sql
```

O contrato textual das migrations foi testado; nenhum PostgreSQL descartável
ou remoto foi criado, e SQLite não foi usado como substituto.

## VM_HANDOFF_REQUIRED

Ainda requer revisão humana e, somente após autorização própria, execução na
VM: criar role e base isoladas, aplicar as quatro migrations com a URL correta,
verificar tabelas/constraints/funções e então provisionar o primeiro usuário
por ferramenta administrativa que receba a credencial apenas em runtime.

```text
SCHEMA_MINIMUM_DEFINED=YES
AUTH_SCHEMA_DEFINED=YES
CHAT_SCHEMA_DEFINED=YES
MEMORY_SCHEMA_DEFINED=YES
ATOMICITY_DEFINED=YES
POSTGRES_CLIENT_DECIDED=YES
NO_SUPABASE_NEW_DEPENDENCY=YES
```
