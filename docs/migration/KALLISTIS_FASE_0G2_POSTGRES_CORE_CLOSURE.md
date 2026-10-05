# KALLISTIS — FASE 0G.2B

## Relatório completo de migração do core local e fechamento de evidência

Data do relatório: 2026-08-30
Repositório: `Tonyus-dev/kallistis`
Branch de trabalho: `master`

> **AMBIENTE REAL/PRODUÇÃO: NÃO EXECUTADO.** As alterações e gates abaixo foram feitos exclusivamente no checkout local. Nenhuma migração, query, execução do verificador ou alteração de dados ocorreu no produto real.

## 1. Veredito executivo

O código do core ativo foi migrado para o adaptador PostgreSQL local e os gates locais passaram. A evidência operacional real, entretanto, permanece incompleta.

O veredito correto é:

```text
STATUS=INCIDENTE_BLOCKED
LOCAL_CODE_MIGRATION=PASS
LOCAL_GATES=PASS
REAL_POSTGRES_INTEGRATION=NOT_PROVEN
PRODUCTION_EXECUTION=NOT_EXECUTED
EXECUTION_ENVIRONMENT=LOCAL_CHECKOUT_ONLY
VM_MAX=NOT_ACCESSED
SAFE_TO_BOOTSTRAP_VM=NO
```

Não é correto declarar o produto operacionalmente pronto, porque o fluxo ainda não foi exercitado contra um PostgreSQL real e a produção não foi acessada.

## 2. Limites de autoridade e escopo

Foi usada somente a branch local `master`. Não houve:

- push para `Tonyus-dev/kallistis`;
- deploy ou merge;
- acesso à VM Max, SSH, produção, Cloudflare, DNS ou banco remoto;
- alteração de dados reais;
- alteração das mudanças pré-existentes do usuário em `src/lib/jardim.functions.ts` e `src/lib/memory-review.functions.ts` além da formatação necessária para o gate de lint.

Durante a execução, foi tentado um PostgreSQL 16 descartável local. Depois, o escopo foi corrigido pelo usuário para execução direta em produção. Como o alvo operacional exato, serviço e banco não foram confirmados nesta conversa, nenhuma operação de produção foi iniciada.

## 3. Estado Git comprovado

```text
BRANCH=master
HEAD=b4d3ede
REMOTE_PUSH=NOT_EXECUTED
REMOTE_STATUS=master_ahead_of_origin_main_by_17_commits
WORKTREE_REMAINING=PREEXISTING_USER_CHANGES_ONLY
```

Commits locais criados:

1. `95a3164` — migrate memory and trail core to local postgres
2. `1425420` — migrate kaline chat path to local postgres
3. `fb2767d` — record postgres core closure evidence
4. `b4d3ede` — finalize postgres closure evidence

O worktree final contém somente as alterações pré-existentes:

```text
M src/lib/jardim.functions.ts
M src/lib/memory-review.functions.ts
```

## 4. Implementação realizada

### 4.1 Repositórios locais

O core local passou a usar `Bun.SQL` através de `createBunPostgresExecutor`, com repositórios PostgreSQL para:

- autenticação e sessões;
- threads e mensagens;
- Jardim de memórias;
- sedimentos;
- chamadas atômicas SQL de aprovação, confirmação e promoção.

O contexto do Jardim considera somente memórias não arquivadas e limita a janela local a 8 registros.

### 4.2 Trilha

`src/lib/trilha.ts` deixou de consultar o cliente Supabase. O carregamento agora:

1. valida o UUID da thread;
2. exige sessão local;
3. consulta thread e mensagens por `user_id` autenticado;
4. consulta sedimentos locais da mesma thread;
5. retorna o formato visual já esperado pela interface.

### 4.3 Sedimentação

`src/lib/sedimentar.functions.ts` foi ligado ao runtime local.

Foram preservados:

- seleção de mensagens sedimentáveis;
- janela de cinco mensagens;
- estado inicial `em_revisao`;
- `source_ids`;
- níveis de sedimentação;
- confirmação explícita;
- promoção 5→1;
- idempotência;
- fallback determinístico;
- prompts e heurística existentes.

As operações críticas continuam delegadas às funções SQL existentes:

- `approve_memory_candidate_atomic`;
- `confirm_sediment_atomic`;
- `promote_sediment_batch_atomic`.

Não foi recriada a lógica atômica em TypeScript.

### 4.4 Runtime Kaline e `/api/chat`

`src/server/chat/kaline-chat-runtime.ts` agora usa somente o runtime local para:

- obter a thread pertencente ao usuário;
- persistir a mensagem do usuário;
- reconstruir histórico;
- montar contexto local;
- persistir a resposta do assistente;
- disparar a sedimentação local.

O contexto ativo foi limitado a:

```text
JARDIM_MEMORIAS=LOCAL
SEDIMENTOS=LOCAL
REGISTRO_VIVO=DEFERRED
EVENTOS=DEFERRED
CONTEXTO_EXTERNO=NOT_PORTED
```

O modelo, provider e contrato de prompt não foram alterados.

`src/routes/api/chat.ts` deixou de usar bearer token, cliente Supabase ou fallback de autenticação. A ordem atual é:

```text
cookie de sessão → requireUser() → user_id local autenticado → thread/runtime local → provider → persistência local
```

O `__Host-kallistis_session` passou a ser lido pelo parser canônico de cookies.

### 4.5 Compatibilidade Telegram

Foi criado `src/server/chat/legacy-supabase-runtime.ts` somente como adaptador isolado para as rotas Telegram existentes. Ele não é importado pelo core Kaline, pela trilha, pela sedimentação principal ou por `/api/chat`.

As superfícies Telegram/Supabase legadas continuam fora do fechamento deste core.

### 4.6 Migração de privilégios

`db/migrations/0005_runtime_grants.sql` mantém o papel runtime separado e adiciona:

- uso do schema `public`;
- permissões mínimas por tabela;
- `EXECUTE` somente nas três funções atômicas;
- revogação de `CREATE` no schema `public` para `PUBLIC` e para o papel runtime.

O papel runtime não cria papéis, não altera schema e não é proprietário das tabelas.

## 5. Segurança e ownership

A implementação usa o `user_id` derivado da sessão local no servidor. Não há confiança em `user_id` enviado pelo navegador.

As queries de thread, mensagens e sedimentos aplicam ownership por usuário. A inserção de mensagens exige simultaneamente:

```text
thread_id pertencente ao user_id autenticado
mensagem.user_id = user_id autenticado
```

Não foi adicionado fallback Supabase ao core ativo. A presença de referências Supabase em outras superfícies do projeto não representa ausência de escopo; representa código ainda fora desta fatia.

## 6. Evidência local executada

### Gates

```text
bun run lint                 PASS
bun run typecheck            PASS
bun run test                 PASS
TEST_FILES=45
TESTS_TOTAL=357
TESTS_PASSED=357
TESTS_FAILED=0
TESTS_SKIPPED=0
bun run check:local-migrations PASS
SQL_STATIC_CHECK=PASS
SQL_PARSE=NOT_EXECUTED_NO_PSQL
bun run build                PASS_WITH_WARNINGS
git diff --check             PASS
```

Os avisos do build são de depreciação de `inputValidator()`, arquivos de teste detectados como candidatos a rota e tamanho de bundle. Nenhum deles foi transformado em falsa aprovação do fluxo real.

### Varredura Supabase

As quatro entradas críticas foram verificadas:

```text
src/lib/trilha.ts
src/lib/sedimentar.functions.ts
src/server/chat/kaline-chat-runtime.ts
src/routes/api/chat.ts
```

Resultado:

```text
ACTIVE_CORE_DIRECT_SUPABASE_REFERENCE_COUNT=0
ACTIVE_CORE_TRANSITIVE_SUPABASE_IMPORT_COUNT=0
```

O único match lexical transitivo encontrado está em `src/lib/chat-response-structure.ts`, dentro de uma heurística que detecta vazamento de nomes técnicos em respostas. Não é import nem chamada de runtime Supabase.

## 7. Incidente do PostgreSQL descartável

Foi criado o verificador reproduzível:

[scripts/verify-local-postgres.ts](../../scripts/verify-local-postgres.ts)

O verificador cobre:

- autenticação por sessão;
- persistência após fechar e reabrir conexão;
- isolamento entre dois usuários;
- exclusão de memória arquivada do contexto;
- aprovação idempotente;
- confirmação idempotente;
- promoção concorrente 5→1;
- corrida entre touch e revoke de sessão;
- negação de `CREATE TABLE`, `ALTER TABLE` e `CREATE ROLE` ao runtime.

A primeira tentativa com `postgres:16` falhou durante pull/extração. O daemon registrou snapshots temporários inexistentes. A segunda tentativa revelou reset de conexão IPv6 nos blobs CloudFront do Docker Hub.

Foi tentado contornar o problema pela rota IPv4, inclusive baixando manualmente manifesto e layers oficiais. A transferência ficou limitada a aproximadamente dezenas de KB/s e foi interrompida quando o usuário corrigiu o escopo para produção direta. Os diretórios temporários foram removidos e não ficou container nomeado ativo.

Resultado factual:

```text
POSTGRES_IMAGE=NOT_LOADED
MIGRATIONS_APPLIED=NOT_EXECUTED
SCHEMA_VERIFY=NOT_EXECUTED
RUNTIME_GRANTS_VERIFY=NOT_EXECUTED
REAL_POSTGRES_VERIFICATION=NOT_PROVEN
TEMP_CONTAINER_REMAINING=NO
```

## 8. Produção real

Nenhuma operação foi executada em produção.

O pedido posterior para trabalhar diretamente no produto real altera a autorização anterior, que proibia acesso à VM Max e deploy. Para executar com segurança, ainda é necessário estabelecer de forma explícita:

```text
PRODUCTION_HOST=UNCONFIRMED
PRODUCTION_CHECKOUT_OR_SERVICE_PATH=UNCONFIRMED
PRODUCTION_DATABASE=UNCONFIRMED
DEPLOY_OR_RESTART_AUTHORIZATION=UNCONFIRMED
```

Sem esses dados, não é possível distinguir o produto real de uma máquina/serviço/banco fora de escopo. Nenhuma suposição foi feita.

## 9. Áreas não tocadas

Permaneceram fora deste trabalho:

- VM Max e qualquer host remoto;
- produção e dados de usuários reais;
- Supabase remoto;
- Cloudflare, DNS e deploy;
- `registro_vivo`;
- `eventos`;
- `contexto_externo`;
- Storage e arquivos binários;
- superfícies Supabase legadas fora do core migrado;
- criação de nova branch ou PR;
- merge e push.

## 10. Rollback local

Os quatro commits desta missão são locais e reversíveis por inspeção/rollback seletivo:

```text
95a3164
1425420
fb2767d
b4d3ede
```

Não foram usados `git reset --hard`, `git clean`, `git checkout .`, `git restore .`, stash destrutivo ou force-push. As duas alterações pré-existentes do usuário continuam preservadas no worktree.

## 11. Próximo passo seguro

O próximo passo depende da escolha operacional do usuário:

1. confirmar host, serviço, checkout e banco de produção para uma validação real diretamente no produto; ou
2. permitir uma nova tentativa do verificador local PostgreSQL 16 em ambiente descartável funcional.

Até que uma dessas provas seja executada e passe, o estado permanece:

```text
LOCAL_CODE_PATHS=PASS
LOCAL_TESTS=PASS
REAL_DATABASE_FLOW=UNVERIFIED
PRODUCTION_FLOW=NOT_EXECUTED
SAFE_TO_BOOTSTRAP_VM=NO
```

## 12. Adendo operacional real — 2026-08-30

Este adendo substitui as declarações anteriores de produção não executada. A execução autorizada foi realizada diretamente na VM Max, no checkout permanente do app novo:

```text
REPOSITORY=Tonyus-dev/kallistis
BRANCH=master
PRODUCTION_HOST=max
PRODUCTION_ROOT=/srv/kallistis
RUNTIME_SERVICE=kallistis.service
RUNTIME_PORT=5180
LEGACY_SERVICE=kaline.service (preservado e separado em 5181)
DATABASE_CLUSTER=16-kaline
KALLISTIS_DATABASE=kallistis
KALLISTIS_DB_HOST=127.0.0.1:5433
KALINE_DATABASE=untouched
```

O checkout permanente foi clonado do origin/master, e a identidade operacional ativa foi desvinculada: referências de identidade Kaline/kaline/KALINE no código ativo foram renomeadas para KALLISTIS; o middleware global de autenticação Supabase foi removido do Start; o adapter Node passou a carregar os artefatos reais em dist/server e dist/client. O serviço KALLISTIS é systemd, reinicia em falha e sobrevive ao logout.

O banco novo foi criado sem reutilizar ou migrar dados de kaline. Foi criado o role de runtime kallistis, com env secreto fora do Git, e foi feito backup lógico vazio antes das migrations. Foram aplicados, em kallistis, os arquivos existentes 0001_identity.sql, 0002_chat.sql, 0003_memory.sql, 0004_memory_atomic.sql e 0005_runtime_grants.sql. A tentativa inicial procurou o nome inexistente 0004_sedimentation.sql, parou sem alteração adicional e foi corrigida pelo nome factual do repositório.

Evidências reais:

```text
POSTGRES_DATABASES=kaline,kallistis
KALLISTIS_TABLES=8
SYSTEMD_kallistis=active
SYSTEMD_kaline=active
SYSTEMD_cloudflared=active
LOCAL_HTTP_HEALTH=200
PUBLIC_HTTPS_HEALTH=https://kallistis.app/api/public/health -> 200
PUBLIC_HTTPS_ROOT=https://kallistis.app/ -> 200
```

Limites honestos do fechamento: o fluxo autenticado/chat não foi aprovado. O env de produção não possuía provider de IA nem credencial real de usuário para teste; nenhuma chave foi inventada, nenhum segredo de Kaline foi copiado e nenhuma chamada ao provider foi simulada. Portanto REAL_DATABASE_SCHEMA=PASS, RUNTIME_HEALTH=PASS, PUBLIC_URL=PASS, mas AUTH_SESSION=BLOCKED, CHAT_PROVIDER=BLOCKED, REAL_CHAT_PERSISTENCE=UNVERIFIED e PRODUCTION_ACCEPTANCE=BLOCKED.

O Cloudflared existente já encaminhava kallistis.app para 127.0.0.1:5180; o serviço novo foi integrado nessa porta. Não foi instalado segundo túnel. kaline.service, /srv/kaline e o banco kaline não foram alterados.

## 13. Estado de entrega

```text
SOURCE_MASTER=UPDATED_IN_PRODUCTION_CHECKOUT
PRODUCTION_RUNTIME=ACTIVE
DATABASE_ISOLATION=PASS
PUBLIC_HEALTH=PASS
AUTHENTICATED_END_TO_END=BLOCKED_BY_REAL_CREDENTIAL_AND_PROVIDER
SAFE_TO_CALL_FULL_PRODUCT_DONE=NO
```
