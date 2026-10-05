MISSION=KALLISTIS_LOCAL_CORE_OVERNIGHT
DATE=2026-08-30
START_HEAD=ae6771e9e8ab7f3316a6d4276ea422ad143c5e58
END_HEAD=2022fbc387563007a7c9f83cbac3fdb20e047498
REPORT_COMMIT=e7b2f87f6b4d0656d3b0ad32880565133aef789b
WORK_BRANCH=feat/kallistis-local-core
RELATORIO_COMPLETO=docs/migration/KALLISTIS_RELATORIO_COMPLETO_LOCAL_CORE.md

FASE_0C=PASS
FASE_0D=PASS_STATIC_ONLY
FASE_0E=PASS_STATIC_AND_UNIT
FASE_0F=PASS_LOCAL_AUTH_ENDPOINT_STATIC_UNIT; LEGACY_DOMAIN_FUNCTIONS_REMAIN_UNMIGRATED
FASE_0G=NOT_EXECUTED

STOP_REASON=NO_PSQL_OR_AUTHORIZED_POSTGRESQL_DATABASE; VM_RUNTIME_AND_MANUAL_BROWSER_FLOW_REMAIN_UNPROVEN

## AUTH

AUTH_MODEL_CURRENT=LOCAL_POSTGRESQL_SESSION_COOKIE_FOR_LOCAL_CORE
AUTH_MODEL_TARGET=LOCAL_SESSION_COOKIE_TO_PRIVATE_DOMAIN_API
MINIMUM_AUTH_TABLES=users,credentials,sessions
CREDENTIAL_HASH=scrypt_N32768_r8_p1_32_BYTES_RANDOM_SALT
SESSION_MODEL=OPAQUE_256_BIT_TOKEN_SHA256_DIGEST_ONLY_IN_DATABASE
COOKIE_MODEL=\_\_Host-kallistis_session;HttpOnly;Secure;SameSite=Lax;Path=/;no-Domain
CSRF_MODEL=SameSite_Lax_PLUS_Origin_OR_Referer_SAME_ORIGIN_ON_UNSAFE_METHODS
RLS_DECISION=NOT_PORTED_IN_FIRST_PRIVATE_API_SLICE; EXPLICIT_BACKEND_AUTHORIZATION

O contrato completo de 0C está em `KALLISTIS_FASE_0C_AUTH_LOCAL.md`. O novo
núcleo normaliza somente whitespace externo, nunca armazena plaintext, rejeita
usuários desabilitados e sessões revogadas/expiradas/ociosas, e nunca aceita
`user_id` vindo do browser como autoridade. Nenhuma credencial real, roster,
palavra canônica ou dado pessoal foi adicionado.

## DATABASE

DATABASE_ENGINE=PostgreSQL
DATABASE_TARGET=VM_MAX
DATABASE_PORT_TARGET=5433
DATABASE_CREATED=NO

MIGRATION_FILES=0001_identity.sql,0002_chat.sql,0003_memory.sql,0004_memory_atomic.sql,0005_runtime_grants.sql
TABLES_INCLUDED=users,credentials,sessions,chat_threads,chat_messages,memory_candidates,jardim_memorias,sedimentos
TABLES_DEFERRED=registro_vivo,eventos,presenca_regimes,contexto_externo,campaigns,membership,Storage,other_Totalidade_domains
POSTGRES_FUNCTIONS=approve_memory_candidate_atomic,confirm_sediment_atomic,promote_sediment_batch_atomic

O schema está em `db/migrations/`. UUIDs, timestamps e ordering explícito
(`created_at, id`) foram preservados. O SQL atômico recebe `p_user_id`, valida
ownership/status, trava as linhas afetadas, preserva lote de cinco e progressão
de nível, sem depender do provedor externo de autenticação.

## CHAT

CHAT_SUPABASE_COUPLING_BEFORE=5 direct references in kaline-chat-runtime
CHAT_SUPABASE_COUPLING_AFTER=legacy chat persistence remains outside this local-core slice; ownership predicate extracted
CHAT_REPOSITORY=src/server/local-core/postgres-repositories.ts
CHAT_POSTGRES_IMPLEMENTATION=YES_LAZY_PARAMETERIZED_ADAPTER
CHAT_RUNTIME_PROOF=NOT_EXECUTED_NO_POSTGRES; WRITE_NO_OP_GUARDS_UNIT_VERIFIED

O caminho existente do chat/provider/persistência não recebeu dual-write,
fallback silencioso nem ativação no novo adapter. Somente o predicado puro de
ownership de thread foi movido para `src/server/local-core/authorization.ts`.

## MEMORY

MEMORY_COUPLING_BEFORE=3 direct Supabase references in memory-review.functions.ts; more in related legacy functions
MEMORY_COUPLING_AFTER=legacy references remain; new contract and adapter are Supabase-free
MEMORY_REPOSITORY=src/server/local-core/postgres-repositories.ts
MEMORY_POSTGRES_IMPLEMENTATION=YES_LAZY_PARAMETERIZED_ADAPTER

## SEDIMENTATION

SEDIMENTATION_LOGIC_CHANGED=NO
SEDIMENTATION_DATA_LAYER_CHANGED=NEW_ISOLATED_CONTRACT_AND_ATOMIC_SQL_ADAPTER_ONLY
ATOMIC_CONTRACT_PRESERVED=YES_STATIC
PROMOTION_5_TO_1_PRESERVED=YES_STATIC
OWNERSHIP_PRESERVED=YES_STATIC
IDEMPOTENCY_PRESERVED=YES_FOR_APPROVE_AND_CONFIRM; ORIGINAL_REJECT_SEMANTICS_FOR_ALREADY_PROCESSED_BATCH

Nenhuma heurística, prompt, modelo de provider, fallback ou semântica de
sedimentação foi alterada. `sedimentar.functions.ts` continua legado e não foi
declarado migrado.

## DEPENDÊNCIAS

DEPENDENCIES_ADDED=none
DEPENDENCIES_REMOVED=none
WHY=Bun.SQL was proven available by runtime introspection; no package or ORM was needed

`KALLISTIS_DATABASE_URL` e `KALLISTIS_CREDENTIAL_LOOKUP_KEY` são configurações
de runtime. O adapter lazy exige uma URL PostgreSQL e falha claramente fora do
Bun; não conecta durante import ou construção.

## TESTES

TYPECHECK=PASS
UNIT_TESTS=PASS; 45 test files, 365 tests
EXISTING_TESTS=PASS; 43 preexisting test files, 357 tests
AUTH_TESTS=PASS; 10 local-core auth/session/HTTP/CSRF tests
REPOSITORY_TESTS=PASS; 4 parameter/ownership/atomic-write contract tests
SEDIMENTATION_CONTRACT_TESTS=PASS_STATIC; migration contract assertions
LINT=PASS
BUILD=PASS
POSTGRES_INTEGRATION_TESTS=NOT_EXECUTED_NO_PSQL_OR_AUTHORIZED_DATABASE
MANUAL_BROWSER_FLOW=NOT_EXECUTED
PRODUCTION_OR_VM_FLOW=NOT_EXECUTED_BY_CONTRACT

Os avisos do build foram warnings preexistentes de descoberta de testes de rota,
depreciação `inputValidator()` do TanStack e dynamic imports inefetivos. Não
houve falha de build nem nova dependência.

A prova Bun foi somente de construção usando
`postgresql://127.0.0.1:1/not-used`; nenhuma query foi enviada e nenhum socket
ou banco foi usado.

## COMMITS

COMMIT=9a5e241
PURPOSE=audit: define local auth and session contract
FILES=0C document plus credentials, sessions, cookies, CSRF, auth service and unit tests
GATE=0C PASS

COMMIT=f729fd8
PURPOSE=feat(db): add kallistis local postgres foundation
FILES=db migrations, 0D document, lazy Bun SQL adapter, PostgreSQL repositories and contract tests
GATE=0D PASS_STATIC_ONLY

COMMIT=1e6524f
PURPOSE=refactor(chat): isolate local ownership boundary
FILES=shared chat authorization helper, local-core export surface and chat runtime integration
GATE=0F PARTIAL; STOPPED BEFORE VM RUNTIME ACTIVATION

COMMIT=2022fbc387563007a7c9f83cbac3fdb20e047498
PURPOSE=fix(local-core): close auth and postgres audit gaps
FILES=atomic session validation, local auth HTTP route/client, PostgreSQL grants, write-result guards, compatibility checks, migration checker and local-auth navigation integration
GATE=POINTS_1_TO_8_FIXED_STATIC_AND_UNIT_VERIFIED

## ARQUIVOS ALTERADOS

```text
db/README.md
db/migrations/0001_identity.sql
db/migrations/0002_chat.sql
db/migrations/0003_memory.sql
db/migrations/0004_memory_atomic.sql
db/migrations/0005_runtime_grants.sql
scripts/check-local-migrations.mjs
docs/migration/KALLISTIS_FASE_0C_AUTH_LOCAL.md
docs/migration/KALLISTIS_FASE_0D_POSTGRES_FOUNDATION.md
docs/migration/KALLISTIS_MISSAO_NOTURNA_LOCAL_CORE.md
src/lib/authed-fetch.ts
src/lib/ensure-thread.ts
src/lib/local-auth-client.ts
src/lib/require-user.server.ts
src/lib/use-authz.ts
src/routes/api/auth/session.ts
src/routes/auth.tsx
src/routes/index.tsx
src/routes/_authenticated/route.tsx
src/routes/_authenticated/chat.$threadId.tsx
src/server/chat/kaline-chat-runtime.ts
src/server/local-core/auth-service.ts
src/server/local-core/auth.test.ts
src/server/local-core/http.ts
src/server/local-core/http.test.ts
src/server/local-core/authorization.ts
src/server/local-core/cookies.ts
src/server/local-core/credentials.ts
src/server/local-core/csrf.ts
src/server/local-core/data-contracts.ts
src/server/local-core/index.ts
src/server/local-core/migration-contract.test.ts
src/server/local-core/postgres-repositories.test.ts
src/server/local-core/postgres-repositories.ts
src/server/local-core/postgres.ts
src/server/local-core/sessions.ts
```

## LEGADO FORA DO NÚCLEO LOCAL

SUPABASE_REMAINING_CORE_REFERENCES=NONE_IN_src/server/local-core
LEGACY_EXTERNAL_REFERENCES=chat persistence, memory-review, sedimentar, Telegram, storage and other Totalidade surfaces still use the old provider adapter
LOCAL_AUTH_REPLACEMENT=login UI, navigation guard, API session route and server API auth use PostgreSQL session cookies

A busca final permanece não-zero fora da nova autoridade; nenhuma referência
Supabase nova foi adicionada.

## BLOQUEIOS

P0=none found
P1=real PostgreSQL integration and concurrent atomic-operation proof unavailable in this checkout
P2=existing handlers still require legacy Supabase and were not activated against an unproven adapter
P3=manual browser auth/reload/logout proof and VM handoff remain pending

## PRÓXIMO HANDOFF

Depois de revisão humana e autorização separada, a operação na VM deve ser:

```text
CREATE ROLE kallistis WITH least privilege, receiving its secret outside the repo
CREATE DATABASE kallistis isolated from kaline
APPLY db/migrations/0001_identity.sql through 0005_runtime_grants.sql
VERIFY tables, constraints, indexes, functions and ownership behavior
PROVISION the first user through a runtime-input administrative tool
```

Essas operações não foram executadas, empacotadas como script executável,
enviadas à VM, pushed ou deployed por esta missão.

## ESTADO GIT FINAL

```text
branch=feat/kallistis-local-core
status=clean after report commit
remote_push=NO
production=UNCHANGED
vm=UNCHANGED
cloudflare=UNCHANGED
```

## VEREDITO FINAL

LOCAL_AUTH_DESIGN_COMPLETE=YES
LOCAL_AUTH_IMPLEMENTATION_READY=YES_STATIC_UNIT_VERIFIED

POSTGRES_SCHEMA_READY=YES_STATIC_ONLY
POSTGRES_CLIENT_READY=YES_BUN_SQL_CONSTRUCTION_VERIFIED

CHAT_PERSISTENCE_PORT_READY=YES_ADAPTER_ONLY
MEMORY_PERSISTENCE_PORT_READY=YES_ADAPTER_ONLY
SEDIMENTATION_PERSISTENCE_PORT_READY=YES_ATOMIC_SQL_AND_ADAPTER_ONLY

LOCAL_SQL_AUTH_PROGRESS=SESSION_ROUTE_AND_SERVER_API_BOUNDARY_MIGRATED; LEGACY_DOMAIN_DATA_ADAPTERS_NOT_MIGRATED

DATABASE_CREATED=NO
VM_CHANGED=NO
CLOUDFLARE_CHANGED=NO
PRODUCTION_CHANGED=NO

SAFE_FOR_HUMAN_REVIEW=YES
SAFE_FOR_VM_BOOTSTRAP=NO

FIRST_REQUIRED_HUMAN_ACTION=Review branch/diff/migrations/auth contract; then separately authorize real Max PostgreSQL bootstrap and manual end-to-end proof
