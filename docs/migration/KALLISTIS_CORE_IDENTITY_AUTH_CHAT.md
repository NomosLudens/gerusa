# KALLISTIS — Núcleo vivo: identidade, auth e chat

```text
MISSION=CORE_IDENTITY_AUTH_CHAT
ENVIRONMENT=IMPLEMENTATION_SOURCE_SNAPSHOT
HOST=local
WORKTREE=/home/tonyus-dev/Portifolio/KALLISTIS/kallistis
REPOSITORY=Tonyus-dev/kallistis
BRANCH=master
START_HEAD=97429995bf7f46661453c7e65e8d47be2b4413dd
END_HEAD=5314b0b551a4782115632c29137d29da5e1c0266
ORIGIN_MASTER_HEAD=5314b0b551a4782115632c29137d29da5e1c0266
RUNTIME_HEAD=UNVERIFIED

CANON_ROOT=/home/tonyus-dev/Portifolio/KALLISTIS/kallistis/CANON
IDENTITY_FILE=CANON/IDENTIDADE.md
CONTEXT_FILE=CANON/CONTEXTO.md
TIME_PRESENCE_FILE=CANON/IDENTIDADE_TEMPO_E_PRESENCA.md
ROLEPLAY_CONTEXT_FILE=CANON/IDENTIDADE_ROLEPLAY_E_CONTEXTO.md
IDENTITY_CANON_LOAD=PASS_LOCAL
IDENTITY_CANON_HASHES=RECORDED_BELOW
CONTEXT_OPERATIONAL_STATE_UPDATED=YES_ADDITIVE_2026-08-30
LEGACY_HISTORY_PRESERVED=YES

ACTIVE_ASSISTANT_IDENTITY=HERMES
ACTIVE_PRODUCT_IDENTITY=KALLISTIS
OLD_KLINE_IDENTITY_ACTIVE=NO
OLD_KALINE_IDENTITY_ACTIVE=NO
ACTIVE_HERMES_IDENTITY_LEGACY_REFERENCE_COUNT=0
IDENTITY_ROUTER=FAIL_CLOSED_MINIMAL
DEFAULT_ROLEPLAY_MODE=ASSISTENTE

AUTH_UI_LANGUAGE=VELARIM_PALAVRA
AUTH_BACKEND=LOCAL_POSTGRES
AUTH_CRYPTO=HMAC-SHA-256_BLIND_INDEX_PLUS_SCRYPT
PLAINTEXT_CREDENTIAL_STORAGE=NO
USERS_COUNT_BEFORE=UNVERIFIED_LOCAL_ENV
USERS_COUNT_AFTER=UNVERIFIED_LOCAL_ENV
MASTER_USER_PROVISIONED=NO
MASTER_CREDENTIAL_INPUT_REQUIRED=YES
MASTER_LOGIN=UNVERIFIED
SESSION_CREATE=UNVERIFIED
SESSION_LOOKUP=UNVERIFIED
SESSION_RELOAD=UNVERIFIED
SESSION_LOGOUT=UNVERIFIED
SESSION_RELOGIN=UNVERIFIED

CHAT_BACKEND=POSTGRES
CHAT_AUTH=LOCAL_SESSION
CHAT_PROVIDER=OPENROUTER_SERVER_SIDE
CHAT_PROVIDER_CREDENTIAL=ABSENT_LOCAL_ENV
CHAT_THREAD_CREATE=IMPLEMENTED_UNVERIFIED_DB
CHAT_MESSAGE_USER_PERSIST=IMPLEMENTED_UNVERIFIED_DB
CHAT_PROVIDER_REQUEST=UNVERIFIED
CHAT_STREAM=IMPLEMENTED_UNVERIFIED_PROVIDER
CHAT_ASSISTANT_PERSIST=IMPLEMENTED_UNVERIFIED_DB
CHAT_RELOAD_PERSISTENCE=IMPLEMENTED_UNVERIFIED_DB
CHAT_OWNERSHIP=SERVER_SIDE_USER_ID

IDENTITY_CONTEXT=CANON_DOCUMENTS
CONFIRMED_MEMORY_CONTEXT=LOCAL_JARDIM_REPOSITORY_ONLY
SEDIMENT_CONTEXT=LOCAL_REPOSITORY_HYPOTHESIS_ONLY
RECENT_HISTORY_CONTEXT=OWNED_THREAD_ONLY
CROSS_PROFILE_CONTEXT_LEAK=NO_BY_CONTRACT
ROLEPLAY_AUTO_ACTIVATION=NO

SEDIMENTATION_ALGORITHM_CHANGED=NO
WINDOW_5_PRESERVED=YES
PROMOTION_5_TO_1_PRESERVED=YES
STATUS_EM_REVISAO_PRESERVED=YES
SOURCE_IDS_PRESERVED=YES

ACTIVE_CORE_SUPABASE_REFERENCE_COUNT=0_IN_CHAT_AUTH_IDENTITY_MEMORY_PATH
ACTIVE_HERMES_IDENTITY_LEGACY_REFERENCE_COUNT=0
LEGACY_FILES_PRESERVED=YES
LEGACY_FILES_ACTIVE=NO_IN_BROWSER_CHAT

LINT=PASS
TYPECHECK=PASS
TEST_SUITES=46
TESTS_TOTAL=362
TESTS_PASSED=362
TESTS_FAILED=0
TESTS_SKIPPED=0
BUILD=PASS
DIFF_CHECK=PASS

PUBLIC_HOME=PASS_LOCAL_200
PUBLIC_AUTH=PASS_LOCAL_200
PUBLIC_HEALTH=PASS_LOCAL_200
KALLISTIS_SERVICE=PASS_LOCAL_START

HUMAN_LOGIN=NOT_RUN
HUMAN_SESSION_RELOAD=NOT_RUN
HUMAN_LOGOUT=NOT_RUN
HUMAN_RELOGIN=NOT_RUN
HERMES_IDENTITY_HUMAN_TEST=NOT_RUN
HUMAN_CHAT_SEND=NOT_RUN
HUMAN_CHAT_RESPONSE=NOT_RUN
HUMAN_CHAT_RELOAD=NOT_RUN
HUMAN_CHAT_CONTINUITY=NOT_RUN

PRODUCTION_DEPLOYED=NO
GITHUB_DEFAULT_BRANCH=PASS_MASTER
KALLISTIS_USABLE_END_TO_END=NO
```

## Canonical hashes

```text
CANON/IDENTIDADE.md ab6f9399a15603c87ea5ccb3933ad33a8ee51f5f9a970b3d52607a62a878bc11
CANON/CONTEXTO.md 37760935c9435ba7990a0520c2fbd62aadb1a860466df015dbaa83a4c4431787
CANON/IDENTIDADE_TEMPO_E_PRESENCA.md 2486a6fb8f1e8d50b082dc43cb827b8d1bc03d34969756f4ce783e7f8ef5544b
CANON/IDENTIDADE_ROLEPLAY_E_CONTEXTO.md 87bf12493b4e4a07a7d90e480456f6fd41d4a62d3770aec57605740c664b28a4
```

## Implementação entregue neste checkout

- O chat web usa apenas a sessão local e `/api/chat/thread` para criar/carregar thread e histórico.
- O endpoint verifica ownership pelo `user_id` autenticado e não aceita identidade enviada pelo browser.
- A identidade ativa é carregada server-side diretamente dos quatro Markdown em `CANON/`; ausência de qualquer arquivo falha fechado.
- O provisionador `bun run provision:local-user` exige `KALLISTIS_MASTER_WORD` somente no ambiente efêmero do comando e grava apenas derivados.
- As demais superfícies continuam atrás do boundary legado enquanto não houver migração local comprovada.

## Handoffs reais

O checkout local não contém a Palavra master nem as variáveis privadas do PostgreSQL/provider; por isso os testes autenticados, persistência real, provider, continuidade humana e produção permanecem `UNVERIFIED`. O branch padrão do GitHub foi alterado para `master`; a referência antiga `main` permanece no remoto e não foi apagada.

## PRODUCTION ACCEPTANCE — VM MAX — 2026-08-30

````text
MISSION=CORE_IDENTITY_AUTH_CHAT
ENVIRONMENT=PRODUCTION_VM_MAX
HOST=max
WORKTREE=/srv/kallistis
REPOSITORY=Tonyus-dev/kallistis
BRANCH=master
PRODUCTION_START_HEAD=97429995bf7f46661453c7e65e8d47be2b4413dd
PRODUCTION_SOURCE_HEAD=977c03e91f355c2112e48fe2c616d0c55afee2c6
PRODUCTION_END_HEAD=977c03e91f355c2112e48fe2c616d0c55afee2c6
ORIGIN_MASTER_HEAD=977c03e91f355c2112e48fe2c616d0c55afee2c6
RUNTIME_HEAD=977c03e91f355c2112e48fe2c616d0c55afee2c6
FINAL_HEAD_SYNC=PASS
WORKTREE_STATUS=CLEAN

CANON_ROOT=/srv/kallistis/CANON
IDENTITY_CANON_LOAD=PASS_RUNTIME
CANON_HASH_IDENTIDADE=ab6f9399a15603c87ea5ccb3933ad33a8ee51f5f9a970b3d52607a62a878bc11
CANON_HASH_CONTEXTO=37760935c9435ba7990a0520c2fbd62aadb1a860466df015dbaa83a4c4431787
CANON_HASH_TEMPO_PRESENCA=2486a6fb8f1e8d50b082dc43cb827b8d1bc03d34969756f4ce783e7f8ef5544b
CANON_HASH_ROLEPLAY_CONTEXTO=87bf12493b4e4a07a7d90e480456f6fd41d4a62d3770aec57605740c664b28a4

KALLISTIS_SERVICE=ACTIVE
KALLISTIS_SERVICE_PORT=5180
KALLISTIS_SERVICE_RESTART=PASS
PUBLIC_HOME=PASS_200
PUBLIC_HEALTH=PASS_200
LOCAL_HEALTH=PASS_200
SESSION_NO_COOKIE=PASS_401
CHAT_NO_COOKIE=PASS_401
KALINE_SERVICE=ACTIVE_UNTOUCHED

DATABASE_HOST=VM_MAX_POSTGRES
DATABASE_PORT=5433
DATABASE_NAME=kallistis
DATABASE_RUNTIME_ROLE=kallistis
USERS_COUNT=0
CREDENTIALS_COUNT=0
SESSIONS_COUNT=0
THREADS_COUNT=0
MESSAGES_COUNT=0
SCHEMA_MIGRATIONS_TABLE=NOT_FOUND
DATABASE_MIGRATION_DELTA=NONE
DATABASE_MIGRATION_APPLIED=NO
KALINE_DATABASE_TOUCHED=NO

CHAT_PROVIDER=OPENROUTER_SERVER_SIDE
OPENROUTER_API_KEY_PRESENT=NO
AI_PROVIDER_CREDENTIAL_REQUIRED=YES

## RELATÓRIO CONSOLIDADO — TUDO O QUE FOI FEITO — 2026-08-30

### Escopo e autoridades

- O projeto operacional é `/srv/kallistis` na VM `max`; o checkout local `/home/tonyus-dev/Portifolio/KALLISTIS/kallistis` foi tratado como fonte de implementação.
- Os quatro documentos em `CANON/` foram incorporados como autoridade server-side da identidade: `IDENTIDADE.md`, `CONTEXTO.md`, `IDENTIDADE_TEMPO_E_PRESENCA.md` e `IDENTIDADE_ROLEPLAY_E_CONTEXTO.md`.
- O contexto externo fornecido pelo usuário foi mantido como contexto de trabalho, não como instrução operacional concorrente.
- Nenhum segredo, Palavra master ou chave de provider foi colocado em código, commit, relatório ou saída de terminal.

### Implementação entregue

- Identidade ativa do produto definida como KALLISTIS com assistente HERMES.
- Carregamento server-side dos quatro documentos canônicos com hash, cache e falha fechada quando a fonte não está disponível.
- Roteamento mínimo de identidade e contexto sem ativação automática de roleplay e sem fallback silencioso para identidade legada.
- Chat web ligado à sessão local e ao PostgreSQL da VM, com criação/carregamento de thread e histórico pelo endpoint `/api/chat/thread`.
- Ownership calculado server-side pelo usuário autenticado; o browser não escolhe o `user_id`.
- Persistência de mensagem humana antes do provider e persistência da resposta do assistant antes da conclusão do stream.
- Provisionador `bun run provision:local-user`, que recebe a Palavra apenas por variável efêmera e grava derivados criptográficos.
- UI de autenticação ajustada para o conceito Velarim de “Palavra”.
- OpenRouter mantido como provider ativo do chat web por decisão posterior do usuário; não foi introduzido fallback OpenAI.
- Superfícies legadas e arquivos legados foram preservados fora do fluxo web principal.

### GitHub e branch

- Repositório: `Tonyus-dev/kallistis`.
- Branch padrão do GitHub alterada de `main` para `master`.
- A referência remota antiga `main` não foi apagada.
- Commits principais publicados: `5314b0b` implementação, `c5529e4` relatório, `977c03e` registro do branch padrão e `6a608a1` aceite de produção.
- Estado atual verificado: branch `master`, checkout limpo, `HEAD=origin/master=6a608a188e02cb0a5bde1af881a8212c53ad4a6f`.

### Deploy e validação técnica

- Runtime fast-forwarded de `9742999` para `977c03e` em `/srv/kallistis`.
- `bun install --frozen-lockfile`: PASS.
- `bun run lint`: PASS.
- `bun run typecheck`: PASS.
- `bun run test`: PASS — 46 arquivos e 362 testes.
- `bun run build`: PASS.
- `git diff --check`: PASS.
- `kallistis.service`: ativo, Bun, porta 5180; reiniciado somente este serviço.
- `kaline.service`: permaneceu ativo e não foi alterado.
- Health local e público: HTTP 200.
- Home pública: HTTP 200.
- Sessão sem cookie: HTTP 401.
- Chat sem cookie: HTTP 401.
- Assets atuais testados diretamente: HTTP 200; houve 404 transitório de assets durante a navegação registrada, que não é considerado resolvido retroativamente sem nova prova visual completa.

### Banco real

- PostgreSQL real na VM Max, porta 5433, database `kallistis`, papel runtime `kallistis`.
- Nenhuma migração nova foi aplicada; o diff de migrações foi vazio e a tabela `schema_migrations` não existe.
- Antes do provisionamento: `users=0`, `credentials=0`, `sessions=0`, `chat_threads=0`, `chat_messages=0`.
- Depois do provisionamento/login: `users=1`, `credentials=1`, `sessions=1`, `chat_threads=0`, `chat_messages=0`.
- Foram concedidas ao papel `kallistis` as permissões mínimas de leitura/inserção/atualização em `users) e leitura/inserção em `credentials`.
- As permissões preexistentes em `sessions` e `chat_messages` foram preservadas.
- Incidente atual: `chat_threads` tem `SELECT` e `UPDATE`, mas ainda não tem `INSERT` para `kallistis`; por isso a criação da conversa retorna HTTP 500.
- Nenhuma tabela, dado ou serviço da Kaline foi tocado.

### Autenticação humana

- Provisionamento real confirmado no banco: uma linha em `users` e uma em `credentials`.
- Log real do servidor: `POST /api/auth/session` retornou HTTP 201.
- Log real subsequente: `GET /api/auth/session` retornou HTTP 200.
- A Palavra não foi registrada no relatório nem nos logs.
- Logout, relogin e continuidade após reload ainda não foram aceitos como concluídos de forma independente.

### Chat e provider

- A abertura do chat na navegação real retornou HTTP 500.
- Evidência do servidor: `PostgresError: permission denied for table chat_threads`.
- Nenhuma thread ou mensagem foi criada devido a esse bloqueio.
- OpenRouter é o provider escolhido, mas `OPENROUTER_API_KEY` está ausente na VM.
- Portanto, mesmo após corrigir a permissão da tabela, a chamada real ao modelo ainda ficará bloqueada até a chave ser configurada no ambiente protegido do serviço.
- Não foi usado mock, placeholder, `setTimeout` ou fallback falso para declarar funcionamento.

### Estado final honesto

```text
AUTH_PROVISIONING=PASS_REAL
AUTH_LOGIN=PASS_REAL
CHAT_THREAD_CREATION=BLOCKED_DATABASE_INSERT_PRIVILEGE
CHAT_PROVIDER=OPENROUTER
OPENROUTER_CREDENTIAL=BLOCKED_MISSING
KALLISTIS_USABLE_END_TO_END=NO
INCIDENT_OPEN=YES
````

Próximo ajuste operacional mínimo, ainda na VM Max e dentro do PostgreSQL:

```sql
GRANT INSERT ON TABLE public.chat_threads TO kallistis;
```

## CORE FREEZE — PR3 (preparação; aceite final bloqueado)

O contrato preparado para o freeze mantém identidade local PostgreSQL, sessões locais, chat
KALLISTIS/Hermes, persistência e OpenRouter como baseline. O runtime Bun não
possui criação de identidade: provisioning é administrativo e usa uma conexão
explicitamente separada (`KALLISTIS_PROVISION_DATABASE_URL`). A proveniência das
migrations é registrada em `public.kallistis_schema_migrations` com SHA-256;
migrations históricas não são editadas. Defaults históricos `kaline` foram
removidos do schema de `chat_threads`, e o payload do navegador não escolhe
modelo: a seleção é server-authoritative. Código Supabase legado permanece
isolado fora do caminho público congelado.
