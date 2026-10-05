# KALLISTIS — Fase 0G — Auditoria pré-bootstrap do núcleo local

INCIDENTE: esta auditoria não libera o bootstrap da VM. O código local passou
nos gates estáticos/unitários, mas o núcleo de produto ainda não opera de ponta
a ponta contra PostgreSQL local. As superfícies legadas foram bloqueadas sob a
sessão local para não mascarar esse estado como produto funcional.

## Campos obrigatórios

```text
FASE=0G
MISSION=PRE_BOOTSTRAP_AUDIT

BRANCH=feat/kallistis-local-core
BASE_HEAD=ae6771e9e8ab7f3316a6d4276ea422ad143c5e58
START_HEAD=317fcca56fd85c85cbaa4d11b5e3b5a78bf26039
END_HEAD=92a55bf6f640d4d61c47a9e739dded392b7e3b38

WORKTREE_BEFORE=CLEAN
WORKTREE_AFTER=CLEAN

AUTH_SECURITY=PASS_STATIC_UNIT; cookie local -> session PostgreSQL -> user ativo; sem bearer ou fallback Supabase
SESSION_SECURITY=PASS_STATIC_UNIT; token opaco CSPRNG 32 bytes, somente SHA-256 persistido, expiracao absoluta 30d e idle 7d
CSRF_SECURITY=PASS_STATIC_UNIT; Origin exato, Referer como fallback, sem Host isolado, metodos seguros separados
BLIND_INDEX_DESIGN=PASS; HMAC-SHA-256 somente localiza candidato; scrypt sempre verifica o hash; comparacao segura
VELARIM_NORMALIZATION=PASS; somente trim externo, sem lowercase, folding, acentos ou fuzzy

MEMORY_SCHEMA_SEMANTICALLY_CLEAN=YES_AFTER_CORRECTION; dominio local minimo memory, sem ontologia Kaline/Kharis/Kuan-Yin/Drive
LEGACY_MEMORY_CONTAMINATION=NONE_IN_LOCAL_MIGRATIONS; referencias legadas permanecem somente em codigo Supabase fora do nucleo ativado

CHAT_RUNTIME_STATE=TRANSITIONAL_EXPLICIT; entrada sob sessao local bloqueada ate repositorio PostgreSQL de chat existir
BROKEN_HYBRID_COUNT=0_AFTER_CORRECTION
BROKEN_HYBRID_ITEMS=NONE; antes da correcao havia auth local -> consultas chat Supabase e chamadas bearer Supabase implicitas

REGISTRO_VIVO_CORE_REQUIREMENT=DEFERRED; a leitura atual e opcional no contexto legado e nao pertence ao schema minimo
CONTEXT_VIVO_MIGRATION_STATE=LEGACY_SUPABASE_DEFERRED; contexto externo/vivo consulta Supabase e nao e exposto sob sessao local

MIGRATION_0001=PASS_STATIC; identity tables, PK/FK/UNIQUE/CHECK/indexes, sem plaintext
MIGRATION_0002=PASS_STATIC; chat tables e campos exigidos pelo contrato local
MIGRATION_0003=PASS_STATIC; memoria/sedimentacao e semantica legada acidental removida
MIGRATION_0004=PASS_STATIC; funcoes atomicas, ownership, locks, progresso 5->1 e idempotencia revisados
MIGRATION_0005=PASS_STATIC; grants por tabela sem DELETE e funcoes atomicas explicitamente concedidas

RUNTIME_GRANTS=LEAST_PRIVILEGE_ACCEPTABLE_STATIC; USAGE schema; SELECT/INSERT/UPDATE somente onde o runtime usa; nenhum DELETE; sem CREATE/ALTER/DROP/role/database
SQL_INJECTION_FINDINGS=NONE_IN_NEW_LOCAL_CORE; queries usam placeholders $1..$9; identificadores sao estaticos; SQL dinamico legado fora do nucleo

SEDIMENTATION_ALGORITHM_CHANGED=NO; diff base...HEAD nao altera sedimentar.functions.ts
PROMOTION_5_TO_1_PRESERVED=YES; exatamente cinco IDs distintos, mesmo owner, mesma camada e progressao allowlist
ATOMICITY_STATIC_REVIEW=PASS_STATIC; FOR UPDATE + operacoes na mesma funcao/transacao; concorrencia real nao executada
OWNERSHIP_STATIC_REVIEW=PASS_STATIC; p_user_id vem do backend autenticado e filtros de owner existem nas funcoes/repositorios
IDEMPOTENCY_STATIC_REVIEW=PASS_STATIC; approve/confirm retornam resultado idempotente; lote ja promovido nao duplica

LOCAL_CORE_SUPABASE_INDEPENDENT=PARTIAL; auth/session e adapters PostgreSQL nao dependem de Supabase; chat/memoria/contexto de produto ainda estao deferred/bloqueados

SQL_STATIC_CHECK=PASS
SQL_PARSE=NOT_EXECUTED
POSTGRES_INTEGRATION=NOT_EXECUTED

TYPECHECK=PASS
TESTS=PASS
TEST_COUNT=357
LINT=PASS
BUILD=PASS
DIFF_CHECK=PASS

CORRECTIONS_MADE=legacy memory domain/source cleanup; runtime grant tightening; auth body limit; canonical origin; runtime error mapping; explicit local-core transitional boundary; contract tests
COMMITS_ADDED=663e1355a9bc8bbaff75e92ac75a02f4b6d63d4a; bf6c80e2ae395a267b3f5c59376dcd87cc615c98; cc4d7685b27a2c66293562c1de5c2045aba94ec3; 92a55bf6f640d4d61c47a9e739dded392b7e3b38

SAFE_TO_BOOTSTRAP_VM=NO
FIRST_BLOCKER=LOCAL_CORE_SUPABASE_INDEPENDENT=PARTIAL; sem teste PostgreSQL real e sem fluxo de chat/memoria ativado no adapter local
```

## Escopo e preflight

O preflight foi executado no checkout `/home/tonyus-dev/Portifolio/KALLISTIS/kallistis`.
O branch era `feat/kallistis-local-core`, o worktree estava limpo, o merge-base
foi exatamente `ae6771e9e8ab7f3316a6d4276ea422ad143c5e58` e o HEAD de início era
`317fcca56fd85c85cbaa4d11b5e3b5a78bf26039`. A VM `max`, Cloudflare, produção,
push e deploy não foram acessados.

O HEAD de correção contém 49 arquivos alterados desde a base e 12 commits:

```text
9a5e241bdbfb6bf03e67f37d0f11a3a578172567
f729fd83834519742db86f13bc03136638129187
1e6524fdd6bba4af1aa6d7d1da5321259733e965
001852e00543c0ff42a86b43b92f3dd769bb7b0a
2022fbc387563007a7c9f83cbac3fdb20e047498
e7b2f87f6b4d0656d3b0ad32880565133aef789b
8b71e634910c981bb93e6b0742809840f2922684
317fcca56fd85c85cbaa4d11b5e3b5a78bf26039
663e1355a9bc8bbaff75e92ac75a02f4b6d63d4a
bf6c80e2ae395a267b3f5c59376dcd87cc615c98
cc4d7685b27a2c66293562c1de5c2045aba94ec3
92a55bf6f640d4d61c47a9e739dded392b7e3b38
```

## Correções comprovadas

1. `db/migrations/0003_memory.sql`: o check de domínio deixou de carregar
   `kaline`, `kharis`, `kuanyin` e `drive`; o check de origem deixou de carregar
   `camara-do-eco`, `codice` e `registro-vivo`. A migration local mantém apenas
   `domain=memory` e `source=chat|manual|system`. Status de candidatos, status
   de sedimentos e níveis continuam separados; a mecânica 5→1 foi preservada.

2. `db/migrations/0005_runtime_grants.sql`: `DELETE` foi removido. A role
   `kallistis` recebe apenas o acesso de leitura/escrita necessário por tabela,
   `USAGE` de `public` e `EXECUTE` nas três funções atômicas. `CONNECT` continua
   fora das migrations, pertencendo ao passo administrativo futuro.

3. `src/server/local-core/http.ts`: POST de sessão tem teto de 8 KiB, verifica
   `Content-Length` quando presente e mede o corpo real antes de `JSON.parse`.
   Corpo excessivo retorna 413; JSON inválido retorna 400; nada é logado.

4. `src/routes/api/auth/session.ts`: o origin padrão é o canônico
   `https://kallistis.app`, sem derivação do `request.url`. Desenvolvimento
   precisa declarar explicitamente `KALLISTIS_PUBLIC_ORIGIN`; o cookie não foi
   tornado inseguro. Falhas na criação do runtime também são mapeadas para 503
   e o executor só é fechado quando foi criado.

5. `src/lib/local-core-boundary.ts`, `src/routes/_authenticated/route.tsx`,
   `src/routes/_authenticated/chat.$threadId.tsx`, `src/lib/ensure-thread.ts`
   e `src/components/ChatView.tsx`: uma sessão local não entra em rotas ou
   componentes que ainda consultam Supabase. O bloqueio exibe estado de
   migração, não uma mensagem genérica de sucesso nem fallback silencioso.
   Os testes provam que a consulta legada não é chamada.

## Mapa de request, autenticação e dados

| Fluxo                 | Auth source                        | User ID                       | Data source atual                                                      | Classificação                                  |
| --------------------- | ---------------------------------- | ----------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| login                 | cookie emitido pelo endpoint local | sessão PostgreSQL após scrypt | PostgreSQL local                                                       | `LOCAL_COMPLETE` estático                      |
| root `/`              | sessão local                       | resposta `/api/auth/session`  | redirect para área autenticada                                         | `TRANSITIONAL_EXPLICIT`                        |
| authenticated guard   | cookie local                       | sessão PostgreSQL             | bloqueio antes de superfícies legadas                                  | `TRANSITIONAL_EXPLICIT`                        |
| create/open thread    | sessão local                       | sessão local                  | adapter de chat PostgreSQL existe, UI antiga é bloqueada               | `TRANSITIONAL_EXPLICIT`                        |
| send chat message     | bearer Supabase no endpoint legado | token Supabase                | chat/messages/contexto Supabase                                        | `LEGACY_COMPLETE` isolado; não é caminho local |
| load messages/history | sessão local na UI antiga          | sessão local                  | código legado Supabase, não alcançável após a fronteira                | `TRANSITIONAL_EXPLICIT`                        |
| memory                | sessão local na navegação          | sessão local                  | repositório PostgreSQL estático; funções de produto ainda Supabase     | `TRANSITIONAL_EXPLICIT`                        |
| sedimentation         | sessão local na navegação          | sessão local                  | funções e contexto legado Supabase; funções SQL locais estão definidas | `TRANSITIONAL_EXPLICIT`                        |
| TTS                   | cookie local em `/api/tts`         | `requireUser` local           | OpenRouter, sem Supabase                                               | `LOCAL_COMPLETE` estático                      |
| transcription         | cookie local em `/api/transcribe`  | `requireUser` local           | OpenRouter, sem Supabase                                               | `LOCAL_COMPLETE` estático                      |
| Câmara                | sessão local na navegação          | sessão local                  | funções/storage Supabase legadas                                       | `TRANSITIONAL_EXPLICIT` bloqueado              |
| logout                | cookie local + CSRF                | sessão local                  | revogação PostgreSQL e clear cookie                                    | `LOCAL_COMPLETE` estático                      |

O endpoint legado `/api/chat` continua exigindo bearer Supabase e não aceita
cookie local como fallback. A UI local não injeta esse bearer. Assim, depois da
correção, não há fluxo alcançável que faça `auth local → dados Supabase` sem
uma fronteira explícita.

## Auth, sessão, CSRF e credenciais

- `require-user.server.ts` executa `cookie → SHA-256 digest → UPDATE ...
WHERE active → user active → retorno`. Não lê bearer, body ou query string
  para definir `user_id`.
- `findAndTouchActiveSessionByTokenDigest` faz touch e validação de revogação,
  expiração absoluta, idle timeout e usuário ativo em uma única operação SQL
  com `RETURNING`. A corrida foi revisada estaticamente; não há prova concorrente
  real sem PostgreSQL.
- O cookie é `__Host-kallistis_session`, `Path=/`, `HttpOnly`, `Secure`,
  `SameSite=Lax`, sem `Domain`, inclusive no clear.
- `isSameOriginRequest` aceita métodos seguros; para mutações exige `Origin`
  exato ou, na ausência deste, `Referer` com origin exato. Origin/referer
  estrangeiro, URL malformada e ausência de ambos são rejeitados. `Host` não é
  usado como prova.
- A normalização de Velarim ocorre apenas em `normalizeCredential` por trim
  externo. HMAC-SHA-256 é índice cego; o hash scrypt é sempre verificado com
  `N=32768`, `r=8`, `p=1`, salt de 16 bytes e derivação de 32 bytes. HMAC positivo
  nunca autentica sozinho, o segredo é server-only e plaintext não aparece no
  client, banco ou logs.

## Migrations e SQL

| Migration                 | Revisão estática | Dependências / reexecução                                                                                                               | Privilégios / risco                                                                                   |
| ------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `0001_identity.sql`       | `PASS_STATIC`    | users antes de credentials/sessions; `IF NOT EXISTS`; UUID, FK cascade, unique digest, checks e índice                                  | runtime lê users/credentials e escreve sessions; sem plaintext; risco real ainda sem parse PostgreSQL |
| `0002_chat.sql`           | `PASS_STATIC`    | depende de users; `IF NOT EXISTS`; preserva thread/message IDs, owner, role, content, timestamps, derived_from, source_channel e cursor | índices por user/thread; superfície ainda não ligada ao produto local                                 |
| `0003_memory.sql`         | `PASS_STATIC`    | depende de users/chat_threads; `IF NOT EXISTS`; status/níveis/origens separados                                                         | domínio/origens mínimas após correção; registro/eventos não são criados                               |
| `0004_memory_atomic.sql`  | `PASS_STATIC`    | depende das três migrations anteriores; `CREATE OR REPLACE`; funções invoker e revogação de EXECUTE público                             | owner/status/locks/5 parents/progressão/idempotência revisados; concorrência real não testada         |
| `0005_runtime_grants.sql` | `PASS_STATIC`    | depende da role administrativa já criada e das tabelas/funções; não cria role/database e não concede CONNECT                            | menor privilégio estático sem DELETE; role não recebe DDL                                             |

As queries novas em `postgres-repositories.ts` são parametrizadas. O adaptador
`Bun.SQL` é lazy, aceita somente `postgres://`/`postgresql://`, não consulta no
construtor e expõe fechamento do cliente. Não foi adicionada dependência `pg`;
pool/lifecycle/erro foram revisados no limite que a interface local permite.

Writes revisados: inserção/upsert de mensagem retorna `id` e falha em zero
linhas; atualização de cursor retorna `id` e falha em zero linhas; as funções
atômicas usam `RETURNING` para novos objetos. Não foi encontrado SQL dinâmico
inseguro no novo núcleo.

## Contexto vivo e sedimentação

`contexto-vivo.server.ts` consulta atualmente `jardim_memorias`, `registro_vivo`,
`eventos` e `sedimentos` via Supabase, todos filtrados por `user_id`. O chat
legado também consulta `contexto_externo` para identidade/memória relacional.
`registro_vivo` não é requisito do schema mínimo nesta fase: seu uso é opcional
no contexto legado e foi classificado como `DEFERRED`, não como paridade local
já entregue.

`src/lib/sedimentar.functions.ts` não mudou desde a base. A janela, seleção de
mensagens, fallback determinístico, status `em_revisao`, `source_ids`,
confirmação e cascata 5→1 foram preservados. A revisão das novas funções SQL
confirma cinco IDs distintos, mesmo owner/thread/nível, progressão explícita e
bloqueio de pais já promovidos.

## Supabase remanescente

O `rg` obrigatório encontrou referências remanescentes. Elas não foram apagadas
porque pertencem a superfícies legadas fora do núcleo local ativado:

| Referência                                                              | Domínio                    | Core/legado              | Bloqueia núcleo local?                                          |
| ----------------------------------------------------------------------- | -------------------------- | ------------------------ | --------------------------------------------------------------- |
| `src/routes/api/chat.ts`, `src/server/chat/kaline-chat-runtime.ts`      | chat provider/persistência | core em transição        | não após a barreira explícita; endpoint exige bearer legado     |
| `src/lib/ensure-thread.ts` resolvedor legado                            | threads                    | core em transição        | não; `ensureThread` local bloqueia antes de consultar           |
| `src/lib/voice/use-voice-interaction.ts`                                | voice chat/history         | core em transição        | não alcançável sob sessão local; usa caminho legado documentado |
| `src/lib/sedimentar.functions.ts`, `src/lib/trilha.ts`                  | sedimentação/trilha        | core legado              | não nesta fase; não são expostos sob sessão local               |
| `src/lib/memory-review.functions.ts`, `src/lib/jardim.functions.ts`     | memória/revisão            | core legado              | não nesta fase; adapters locais existem separados               |
| `src/lib/contexto-vivo.server.ts`, `src/lib/contexto-externo.server.ts` | contexto vivo/identidade   | contexto legado          | não nesta fase; explicitamente deferred                         |
| `src/routes/api/channels/*`, `src/lib/camara*.ts`                       | Telegram/Câmara            | fora do core ou deferred | não; permanecem legacy-only                                     |
| `src/lib/use-profile.ts`, `src/lib/use-presenca-regime.ts`              | perfil/presença            | shell legado             | não após guard de superfície                                    |
| `src/integrations/supabase/*`                                           | cliente/middleware legado  | infraestrutura legada    | não; sem importação pela autenticação local                     |
| `src/lib/chat-response-structure.ts` e testes                           | filtragem/testes           | referência textual/mocks | não; não são autoridade de dados                                |

Não foram encontrados `auth.uid()`, `auth.users` ou `service_role` nas migrations
locais. O restante do repositório ainda contém esses contratos somente nas
superfícies legadas e testes correspondentes.

## Classificação de todos os arquivos alterados desde a base

Os riscos abaixo são o risco residual após as correções desta auditoria; achados
já corrigidos continuam identificados na seção de evidências.

```text
FILE=.env.example | PURPOSE=variaveis public origin e PostgreSQL server-only | CATEGORY=DOCS | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P2
FILE=db/README.md | PURPOSE=ordem/configuracao das migrations | CATEGORY=DOCS | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P2
FILE=db/migrations/0001_identity.sql | PURPOSE=users credentials sessions | CATEGORY=MIGRATION | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=db/migrations/0002_chat.sql | PURPOSE=threads e mensagens | CATEGORY=MIGRATION | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=db/migrations/0003_memory.sql | PURPOSE=candidatos jardim e sedimentos | CATEGORY=MIGRATION | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=db/migrations/0004_memory_atomic.sql | PURPOSE=operacoes atomicas de memoria | CATEGORY=MIGRATION | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=db/migrations/0005_runtime_grants.sql | PURPOSE=privilegios da role runtime | CATEGORY=MIGRATION | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=docs/migration/KALLISTIS_FASE_0C_AUTH_LOCAL.md | PURPOSE=contrato auth/sessao | CATEGORY=DOCS | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P2
FILE=docs/migration/KALLISTIS_FASE_0D_POSTGRES_FOUNDATION.md | PURPOSE=contrato schema/role/driver | CATEGORY=DOCS | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P2
FILE=docs/migration/KALLISTIS_MISSAO_NOTURNA_LOCAL_CORE.md | PURPOSE=relatorio da missao anterior | CATEGORY=DOCS | NECESSARY_FOR_LOCAL_CORE=NO | RISK=P2
FILE=docs/migration/KALLISTIS_RELATORIO_COMPLETO_LOCAL_CORE.md | PURPOSE=relatorio completo anterior | CATEGORY=DOCS | NECESSARY_FOR_LOCAL_CORE=NO | RISK=P2
FILE=package.json | PURPOSE=gate check:local-migrations | CATEGORY=TEST | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P2
FILE=scripts/check-local-migrations.mjs | PURPOSE=checagem textual honesta das migrations | CATEGORY=TEST | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/components/CamaraHost.tsx | PURPOSE=adaptacao de identidade local no shell legado | CATEGORY=LEGACY | NECESSARY_FOR_LOCAL_CORE=NO | RISK=P2
FILE=src/components/ChatView.tsx | PURPOSE=fronteira explicita e componente legado isolado | CATEGORY=CHAT | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/components/app-sidebar.tsx | PURPOSE=logout local | CATEGORY=CLIENT | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/components/loading-states.tsx | PURPOSE=mensagem honesta da transicao | CATEGORY=CLIENT | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P2
FILE=src/lib/authed-fetch.ts | PURPOSE=cookies same-origin sem bearer automatico | CATEGORY=AUTH | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/lib/ensure-thread.test.ts | PURPOSE=prova de bloqueio sem consulta legada | CATEGORY=TEST | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/lib/ensure-thread.ts | PURPOSE=resolver legado isolado da sessao local | CATEGORY=CHAT | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/lib/local-auth-client.ts | PURPOSE=cliente HTTP da sessao local | CATEGORY=AUTH | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/lib/local-core-boundary.ts | PURPOSE=erro/fronteira transitoria explicita | CATEGORY=AUTH | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/lib/require-user.server.ts | PURPOSE=auth server local exclusiva | CATEGORY=AUTH | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/lib/use-authz.ts | PURPOSE=estado de navegacao baseado em sessao local | CATEGORY=ROUTING | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/lib/use-tts.ts | PURPOSE=remocao de bearer Supabase do TTS | CATEGORY=CLIENT | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/routeTree.gen.ts | PURPOSE=rota gerada /api/auth/session | CATEGORY=ROUTING | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P2
FILE=src/routes/_authenticated/chat.$threadId.test.ts | PURPOSE=prova de fronteira no loader | CATEGORY=TEST | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/routes/_authenticated/chat.$threadId.tsx | PURPOSE=loader local sem consulta Supabase | CATEGORY=ROUTING | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/routes/_authenticated/route.tsx | PURPOSE=guard transitivo antes das rotas legadas | CATEGORY=ROUTING | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/routes/api/auth/session.ts | PURPOSE=endpoint POST GET DELETE local | CATEGORY=AUTH | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/routes/auth.tsx | PURPOSE=tela de login local | CATEGORY=AUTH | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/routes/convite.tsx | PURPOSE=estado de login local no convite | CATEGORY=LEGACY | NECESSARY_FOR_LOCAL_CORE=NO | RISK=P2
FILE=src/routes/index.tsx | PURPOSE=redirect usando sessao local | CATEGORY=ROUTING | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/server/chat/kaline-chat-runtime.ts | PURPOSE=ownership do runtime legado | CATEGORY=CHAT | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/server/local-core/auth-service.ts | PURPOSE=servico de autenticacao | CATEGORY=AUTH | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/server/local-core/auth.test.ts | PURPOSE=testes de auth/sessao | CATEGORY=TEST | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/server/local-core/authorization.ts | PURPOSE=ownership de thread | CATEGORY=AUTH | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/server/local-core/cookies.ts | PURPOSE=contrato cookie | CATEGORY=SESSION | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/server/local-core/credentials.ts | PURPOSE=scrypt/HMAC/normalizacao | CATEGORY=AUTH | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/server/local-core/csrf.ts | PURPOSE=validacao same-origin | CATEGORY=CSRF | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/server/local-core/data-contracts.ts | PURPOSE=interfaces repository | CATEGORY=DATABASE | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/server/local-core/http.test.ts | PURPOSE=testes HTTP e limite de corpo | CATEGORY=TEST | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/server/local-core/http.ts | PURPOSE=handlers POST GET DELETE | CATEGORY=AUTH | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/server/local-core/index.ts | PURPOSE=export do nucleo | CATEGORY=DATABASE | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P2
FILE=src/server/local-core/migration-contract.test.ts | PURPOSE=contrato textual das migrations | CATEGORY=TEST | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/server/local-core/postgres-repositories.test.ts | PURPOSE=testes de queries parametrizadas | CATEGORY=TEST | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/server/local-core/postgres-repositories.ts | PURPOSE=adapters Bun.SQL PostgreSQL | CATEGORY=DATABASE | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
FILE=src/server/local-core/postgres.ts | PURPOSE=executor lazy Bun.SQL | CATEGORY=DATABASE | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P1
FILE=src/server/local-core/sessions.ts | PURPOSE=token/digest/timeouts | CATEGORY=SESSION | NECESSARY_FOR_LOCAL_CORE=YES | RISK=P0
```

## Achados P0/P1 e evidência exigida

```text
CLAIM=Autenticacao local liberava chat e superficies que consultavam Supabase, formando auth local -> dados Supabase implicito
SOURCE_PATH=src/routes/_authenticated/route.tsx; src/routes/_authenticated/chat.$threadId.tsx; src/components/ChatView.tsx; src/lib/ensure-thread.ts; src/routes/api/chat.ts
SYMBOL=beforeLoad; ChatView; ensureThread; handleChatRoute
RAW_EVIDENCE=Antes da correcao havia getLocalSession() seguido por .from("chat_threads")/.from("chat_messages") e o endpoint de chat exigia Authorization Bearer Supabase; depois da correcao localCoreTransition() ocorre antes de qualquer consulta e os testes verificam from nao chamado
SEVERITY=P0
FIXED=YES
COMMIT=cc4d7685b27a2c66293562c1de5c2045aba94ec3

CLAIM=0003 carregava sem requisito a ontologia de dominios e origens legadas
SOURCE_PATH=db/migrations/0003_memory.sql
SYMBOL=memory_candidates_domain_check; memory_candidates_source_check
RAW_EVIDENCE=O contrato anterior continha kaline/kharis/kuanyin/drive e camara-do-eco/codice/registro-vivo; a migration atual aceita somente memory e chat/manual/system
SEVERITY=P1
FIXED=YES
COMMIT=663e1355a9bc8bbaff75e92ac75a02f4b6d63d4a

CLAIM=0005 concedia DELETE desnecessario em todas as oito tabelas
SOURCE_PATH=db/migrations/0005_runtime_grants.sql
SYMBOL=GRANT table privileges
RAW_EVIDENCE=O grant anterior era SELECT, INSERT, UPDATE, DELETE em users, credentials, sessions, chat_threads, chat_messages, memory_candidates, jardim_memorias e sedimentos; o grant atual e por tabela e nao contem DELETE
SEVERITY=P1
FIXED=YES
COMMIT=663e1355a9bc8bbaff75e92ac75a02f4b6d63d4a

CLAIM=POST de autenticacao aceitava corpo sem limite antes do parse
SOURCE_PATH=src/server/local-core/http.ts
SYMBOL=handleLocalAuthPost; readJsonBody
RAW_EVIDENCE=A implementacao anterior usava request.json() diretamente; a implementacao atual impoe MAX_AUTH_REQUEST_BYTES=8192, verifica comprimento declarado e bytes reais e retorna 413
SEVERITY=P1
FIXED=YES
COMMIT=bf6c80e2ae395a267b3f5c59376dcd87cc615c98

CLAIM=Origin de CSRF podia cair silenciosamente no origin do request
SOURCE_PATH=src/routes/api/auth/session.ts
SYMBOL=expectedOrigin
RAW_EVIDENCE=A implementacao anterior retornava new URL(request.url).origin sem configuracao; a atual usa somente KALLISTIS_PUBLIC_ORIGIN ou https://kallistis.app e rejeita protocolo invalido
SEVERITY=P1
FIXED=YES
COMMIT=bf6c80e2ae395a267b3f5c59376dcd87cc615c98

CLAIM=Paridade PostgreSQL real permanece sem prova
SOURCE_PATH=environment / local toolchain
SYMBOL=psql; PostgreSQL integration
RAW_EVIDENCE=bun run check:local-migrations imprimiu SQL_STATIC_CHECK=PASS e SQL_PARSE=NOT_EXECUTED_NO_PSQL; nenhum psql, banco descartavel, SQLite ou VM foi usado
SEVERITY=P1
FIXED=NO
COMMIT=N/A; BLOCKER
```

## Gates finais — saída observada

```text
$ bun run check:local-migrations
SQL_STATIC_CHECK=PASS
SQL_PARSE=NOT_EXECUTED_NO_PSQL

$ bun run lint
PASS

$ bun run typecheck
PASS

$ bun run test
Test Files 45 passed (45)
Tests 357 passed (357)

$ bun run build
PASS; 2430 client modules and 247 server modules transformed in final run

$ git diff --check
PASS
```

Os warnings do build foram registrados, não ocultados: arquivos `*.test.ts`
detectados como candidatos a rota mas excluídos da route tree, exports de rota
não code-splitados, `inputValidator()` deprecated e dois dynamic imports
inefetivos de contexto. São preexistentes/fora desta correção; não foram
alterados para maquiar o gate. `src/routeTree.gen.ts` continua gerado pelo
mecanismo normal e a diferença desta branch corresponde à nova rota
`/api/auth/session`.

## Decisão final

`SAFE_TO_BOOTSTRAP_VM=NO`. Não foi criado `KALLISTIS_FASE_0H_VM_BOOTSTRAP_HANDOFF.md`
porque a própria condição 0G impede preparar instruções executáveis quando o
gate não passa. Nenhum comando de criação de role/database, `CONNECT`, migration
ou provisioning de usuário foi emitido ou executado. A VM `max` e o database
legado `kaline` permaneceram intocados.

O próximo passo não pertence a esta missão: concluir os adapters/rotas de
chat, memória, contexto e sedimentação contra PostgreSQL local, instalar ou
disponibilizar uma ferramenta PostgreSQL autorizada para parse/integration test
e repetir a auditoria com prova real antes de decidir o 0H.
