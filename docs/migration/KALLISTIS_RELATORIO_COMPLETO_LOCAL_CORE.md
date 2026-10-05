# KALLISTIS — relatório completo do núcleo local

## 1. Identificação

| Campo                              | Valor                                             |
| ---------------------------------- | ------------------------------------------------- |
| Missão                             | `KALLISTIS_LOCAL_CORE_OVERNIGHT`                  |
| Data                               | 2026-08-30                                        |
| Checkout                           | `/home/tonyus-dev/Portifolio/KALLISTIS/kallistis` |
| Branch                             | `feat/kallistis-local-core`                       |
| Base analisada                     | `ae6771e9e8ab7f3316a6d4276ea422ad143c5e58`        |
| Commit final do código             | `2022fbc387563007a7c9f83cbac3fdb20e047498`        |
| Commit final do relatório anterior | `8b71e634910c981bb93e6b0742809840f2922684`        |
| Estado do checkout                 | limpo                                             |
| Push/deploy                        | não executados                                    |
| VM/produção/Cloudflare             | não alterados                                     |

Este documento registra o trabalho realizado no checkout local. Ele não é uma
prova de funcionamento da VM, de PostgreSQL remoto, do navegador em produção,
de deployment ou de qualquer serviço externo.

## 2. Diretriz operacional adotada

O alvo definido foi PostgreSQL na VM, com autenticação local e sessão própria.
Supabase não foi usado como autoridade no núcleo local novo.

Foram preservados os limites de segurança:

- nenhuma credencial real, senha, roster ou dado pessoal foi gravado;
- o navegador não recebe URL, senha ou role do banco;
- nenhuma migration foi executada contra VM ou produção;
- não foi criado fallback que finja funcionamento quando o banco está ausente;
- nenhum teste foi tratado como prova de integração real sem banco real;
- as superfícies legadas fora do núcleo não foram declaradas migradas.

## 3. Diagnóstico inicial

Foi feita a leitura dos dois contratos de missão fornecidos pelo usuário e do
checkout existente. A varredura encontrou oito defeitos:

1. corrida entre leitura/validação da sessão e revogação concorrente;
2. autenticação local sem integração com a fronteira HTTP e navegação;
3. migrations sem grants para a role de runtime;
4. utilitário CSRF sem enforcement em endpoint;
5. writes PostgreSQL que podiam retornar zero linhas sem erro;
6. perda de valores legados de status, domínio e origem;
7. validação SQL somente textual e pouco explícita;
8. lint e evidência documental inconsistentes.

## 4. Correções executadas

### 4.1 Sessão atômica e revogação — ponto 1

O fluxo antigo procurava a sessão, validava sua atividade em JavaScript,
buscava o usuário e depois atualizava `last_seen_at`. A revogação podia vencer
entre essas etapas.

Foi criado `findAndTouchActiveSessionByTokenDigest`, que executa uma operação
atômica no PostgreSQL com `UPDATE ... FROM users ... RETURNING`. A operação
exige digest correto, usuário ativo, sessão não revogada, expiração absoluta
válida e ociosidade menor que sete dias, além de atualizar `last_seen_at`.

Se a revogação vencer a operação, nenhuma linha é retornada e a requisição é
rejeitada. Também foi criado o helper de serviço `revokeSession`, usado pelo
logout.

Arquivos principais:

- `src/server/local-core/auth-service.ts`;
- `src/server/local-core/postgres-repositories.ts`;
- `src/server/local-core/auth.test.ts`;
- `src/server/local-core/postgres-repositories.test.ts`.

### 4.2 Autenticação local HTTP e navegação — ponto 2

Foi criado o endpoint `/api/auth/session`:

| Método   | Comportamento                                                   |
| -------- | --------------------------------------------------------------- |
| `POST`   | recebe `{ credential }`, autentica no PostgreSQL e grava cookie |
| `GET`    | valida o cookie e retorna o usuário atual                       |
| `DELETE` | revoga a sessão e limpa o cookie                                |

O endpoint retorna `503 local_auth_not_configured` sem configuração, `401`
para credencial inválida e `503 local_auth_unavailable` em falha de banco. Não
há fallback por bearer token externo.

Foi adicionado `src/lib/local-auth-client.ts`. A tela de login, rota raiz,
guard autenticado, logout da sidebar, criação de thread, carregamento de
thread, TTS, transcrição e host da Câmara passaram a usar a sessão local onde
antes dependiam de `supabase.auth`.

`src/lib/require-user.server.ts` passou a validar o cookie no PostgreSQL através
de `KALLISTIS_DATABASE_URL`.

O chat e vários domínios antigos ainda possuem adaptadores Supabase fora deste
núcleo. A autenticação local foi integrada, mas a migração completa de todos os
dados e server functions não foi falsamente declarada concluída.

### 4.3 Grants para runtime — ponto 3

Foi criada `db/migrations/0005_runtime_grants.sql`. Ela concede à role
`kallistis`:

- `USAGE` no schema `public`;
- `SELECT`, `INSERT`, `UPDATE` e `DELETE` nas oito tabelas do núcleo;
- `EXECUTE` nas três funções atômicas de memória.

A role precisa existir antes dessa migration. A concessão de `CONNECT` na base
permanece uma operação administrativa externa ao repositório. Nenhuma senha ou
criação de role foi incluída.

### 4.4 CSRF efetivamente aplicado — ponto 4

`isSameOriginRequest` passou a ser chamado nos handlers `POST` e `DELETE` do
endpoint local. São aceitos `Origin` same-origin ou `Referer` same-origin,
respeitando `KALLISTIS_PUBLIC_ORIGIN`/`APP_PUBLIC_URL` quando configurados.

Origem estrangeira ou ausência de prova em método inseguro resulta em
`403 csrf_rejected` antes de autenticar ou revogar a sessão.

### 4.5 Escritas sem sucesso silencioso — ponto 5

O adapter PostgreSQL agora exige `RETURNING id` em:

- inserção/upsert de `chat_messages`;
- atualização de `chat_threads.last_sedimentado_at`.

Se a thread não existe ou não pertence ao usuário, o adapter lança
`Chat thread not found or not owned by user`, em vez de tratar zero linhas como
sucesso.

### 4.6 Compatibilidade dos contratos de memória — ponto 6

`db/migrations/0003_memory.sql` e os tipos TypeScript foram alinhados aos
conjuntos legados:

- níveis: `iconic`, `echoic`, `short_term`, `working`, `prospective`,
  `episodic`, `semantic`, `procedural`;
- status de sedimento: `rascunho`, `em_revisao`, `confirmado`, `descartado`;
- domínios: `kaline`, `kharis`, `kuanyin`, `drive`, `memory`;
- origens: `chat`, `camara-do-eco`, `codice`, `registro-vivo`, `manual`,
  `system`.

O valor novo `arquivado`, que não fazia parte do contrato legado de sedimentos,
foi removido dessa validação.

### 4.7 Validação SQL mais honesta — ponto 7

Foi criado o comando:

```text
bun run check:local-migrations
```

Implementado em `scripts/check-local-migrations.mjs`, ele verifica sem conexão:

- presença e ordem das cinco migrations;
- envelope textual não vazio;
- ausência de `auth.uid`, `auth.users` e `service_role`;
- ausência de `DROP` e criação de role nas migrations;
- tabelas obrigatórias;
- funções atômicas obrigatórias;
- grants da role `kallistis`;
- conjunto legado de status.

Resultado comprovado neste checkout:

```text
SQL_STATIC_CHECK=PASS
SQL_PARSE=NOT_EXECUTED_NO_PSQL
```

Isso não foi chamado de parse SQL nem de integração PostgreSQL, porque `psql`
não está instalado e não existe banco autorizado disponível.

### 4.8 Lint, build e documentação — ponto 8

Foram removidos os espaços vazios no fim de arquivos que quebravam
`git diff --check`. Também foram atualizados `db/README.md`,
`KALLISTIS_FASE_0D_POSTGRES_FOUNDATION.md` e o relatório anterior.

O relatório anterior recebeu SHA do commit de código e limites reais de
validação. Este documento amplia a descrição em linguagem operacional e
técnica.

## 5. Banco local definido

| Migration                 | Conteúdo                                   |
| ------------------------- | ------------------------------------------ |
| `0001_identity.sql`       | `users`, `credentials`, `sessions`         |
| `0002_chat.sql`           | `chat_threads`, `chat_messages`            |
| `0003_memory.sql`         | candidatos, memórias, sedimentos e índices |
| `0004_memory_atomic.sql`  | aprovação, confirmação e promoção atômicas |
| `0005_runtime_grants.sql` | privilégios mínimos para `kallistis`       |

Configuração documentada:

```text
KALLISTIS_DATABASE_URL=postgresql://<runtime-role>:<runtime-secret>@127.0.0.1:5433/kallistis
KALLISTIS_CREDENTIAL_LOOKUP_KEY=<runtime-secret-for-blind-credential-index>
KALLISTIS_PUBLIC_ORIGIN=https://<dominio-publico>
```

Os valores acima são apenas formato documental. Nenhum segredo real foi
gravado.

## 6. Contrato de credencial e sessão

### Credencial

- normalização somente nas bordas com `trim`;
- limite máximo de 256 caracteres;
- hash `scrypt` com `N=32768`, `r=8`, `p=1`;
- salt aleatório de 16 bytes;
- chave derivada de 32 bytes;
- índice cego por HMAC-SHA-256 com chave de runtime;
- plaintext nunca é salvo.

### Sessão

- token opaco aleatório de 32 bytes;
- token com 43 caracteres base64url;
- somente SHA-256 do token fica no banco;
- expiração absoluta de 30 dias;
- timeout de ociosidade de sete dias;
- revogação explícita por `revoked_at`.

### Cookie

```text
__Host-kallistis_session
Path=/
HttpOnly
Secure
SameSite=Lax
sem Domain
```

## 7. Testes e evidências

Comandos executados no checkout:

```text
bun run check:local-migrations  PASS
bun run lint                    PASS
bun run typecheck               PASS
bun run test                    PASS
bun run build                   PASS
git diff --check                PASS
```

Resultado do conjunto de testes:

```text
Test Files  45 passed
Tests       365 passed
```

Cobertura específica adicionada:

- hash, cookie, sessão, revogação e CSRF;
- validação atômica de sessão e atualização de `last_seen_at`;
- login, consulta e logout pelo endpoint local;
- rejeição de origem estrangeira;
- ownership de threads;
- falha explícita em write sem thread própria;
- `RETURNING id` em writes;
- grants e compatibilidade de migrations.

O build emitiu apenas warnings já conhecidos do projeto: descoberta de arquivos
de teste como rotas, depreciação de `inputValidator()` e imports dinâmicos
inefetivos. Não houve erro de build.

## 8. Arquivos adicionados ou alterados

### Banco e documentação

```text
db/README.md
db/migrations/0002_chat.sql
db/migrations/0003_memory.sql
db/migrations/0005_runtime_grants.sql
scripts/check-local-migrations.mjs
docs/migration/KALLISTIS_FASE_0D_POSTGRES_FOUNDATION.md
docs/migration/KALLISTIS_MISSAO_NOTURNA_LOCAL_CORE.md
docs/migration/KALLISTIS_RELATORIO_COMPLETO_LOCAL_CORE.md
```

### Auth local e núcleo

```text
src/server/local-core/auth-service.ts
src/server/local-core/auth.test.ts
src/server/local-core/authorization.ts
src/server/local-core/cookies.ts
src/server/local-core/credentials.ts
src/server/local-core/csrf.ts
src/server/local-core/data-contracts.ts
src/server/local-core/http.ts
src/server/local-core/http.test.ts
src/server/local-core/index.ts
src/server/local-core/migration-contract.test.ts
src/server/local-core/postgres-repositories.ts
src/server/local-core/postgres-repositories.test.ts
src/server/local-core/postgres.ts
src/server/local-core/sessions.ts
src/lib/local-auth-client.ts
src/lib/require-user.server.ts
```

### Integração no cliente

```text
src/routes/api/auth/session.ts
src/routes/auth.tsx
src/routes/index.tsx
src/routes/_authenticated/route.tsx
src/routes/_authenticated/chat.$threadId.tsx
src/components/app-sidebar.tsx
src/components/ChatView.tsx
src/components/CamaraHost.tsx
src/lib/authed-fetch.ts
src/lib/ensure-thread.ts
src/lib/use-authz.ts
src/lib/use-tts.ts
src/routes/convite.tsx
src/routeTree.gen.ts
```

### Testes e arquivos adicionais ajustados

```text
src/lib/ensure-thread.test.ts
src/routes/_authenticated/chat.$threadId.test.ts
package.json
```

## 9. Commits locais

| Commit    | Objetivo                                                               |
| --------- | ---------------------------------------------------------------------- |
| `9a5e241` | contrato de auth local, credenciais, sessão, cookie, CSRF e testes     |
| `f729fd8` | migrations PostgreSQL local, adapter Bun.SQL, repositories e contratos |
| `1e6524f` | isolamento do predicado de ownership do chat                           |
| `001852e` | registro da evidência da missão noturna                                |
| `2022fbc` | fechamento dos pontos 1–8 e integração local de sessão                 |
| `e7b2f87` | atualização narrativa do relatório anterior                            |
| `8b71e63` | fixação do ponteiro do relatório anterior                              |

Nenhum commit foi enviado para remoto.

## 10. O que não foi feito

Os itens abaixo permanecem explicitamente fora da prova concluída:

- criação da base PostgreSQL na VM;
- criação da role `kallistis` na VM;
- aplicação das migrations na VM;
- teste com `psql` ou conexão PostgreSQL real;
- criação do primeiro usuário por ferramenta administrativa;
- teste concorrente real contra PostgreSQL;
- login/logout manual em navegador real;
- reload real de sessão em navegador;
- fluxo completo de chat com dados reais da VM;
- migração dos server functions de agenda, Câmara, jardim, memória, registro
  vivo, Telegram e demais domínios;
- migração completa da persistência e contexto do chat para o adapter local;
- remoção total das dependências legadas Supabase do produto inteiro;
- push, pull request, merge, deploy ou alteração de produção.

## 11. Estado atual e diagnóstico honesto

### Corrigido e comprovado localmente

- núcleo de autenticação local;
- endpoint de sessão;
- cookie e logout;
- enforcement CSRF no endpoint local;
- validação atômica de sessão;
- grants da role de runtime;
- compatibilidade textual do schema;
- guards contra writes sem efeito;
- checker estático de migrations;
- lint, typecheck, testes e build.

### Ainda bloqueado

O funcionamento end-to-end do produto está bloqueado pela ausência de
PostgreSQL autorizado na VM e pelo fato de domínios legados, especialmente o
chat principal, ainda usarem adaptadores Supabase fora do núcleo local.

Portanto, o estado correto é:

```text
LOCAL_CORE=CORRIGIDO_E_VERIFICADO_STATIC_UNIT
LOCAL_AUTH=IMPLEMENTADO_NO_SERVER_E_NA_NAVEGACAO
POSTGRES_SCHEMA=DEFINIDO_E_VALIDADO_STATICAMENTE
POSTGRES_VM=NAO_TESTADO
FULL_PRODUCT_SQL_VM=AINDA_NAO_CONCLUIDO
PRODUCAO=INALTERADA
```

## 12. Handoff necessário

Depois de revisão humana e autorização separada para a VM, o próximo fluxo é:

1. criar uma base isolada `kallistis`;
2. criar a role `kallistis` com menor privilégio;
3. conceder `CONNECT` na base;
4. provisionar os segredos fora do repositório;
5. aplicar `0001_identity.sql` até `0005_runtime_grants.sql`;
6. verificar tabelas, índices, constraints, funções e grants;
7. provisionar o primeiro usuário por ferramenta administrativa de runtime;
8. testar login, reload, logout e revogação;
9. migrar o chat e os demais domínios por fatias isoladas;
10. só depois executar fluxo manual completo e decidir publicação.

## Veredito

O trabalho solicitado de correção dos pontos 1–8 foi implementado no núcleo
local e validado localmente. A implementação não deve ser apresentada ainda
como produto completo funcionando na VM, porque essa prova não ocorreu e a
migração dos domínios legados ainda não terminou.
