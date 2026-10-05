# KALLISTIS — P0 LOCAL AUTH — FECHAMENTO DE BOOT EM PRODUÇÃO REAL

## Identificação

INCIDENT=P0_LOCAL_AUTH_PRODUCTION_BOOT
ENVIRONMENT=PRODUCTION_REAL
HOST=max
WORKTREE=/srv/kallistis
REPOSITORY=Tonyus-dev/kallistis
BRANCH=master
START_HEAD=a8b1e4e7dfbfa34efdc3fbffe16162201b48d0c6
END_HEAD=04b3e3d91d5dae6df909bf2e091cf40cb6db892f
ORIGIN_MASTER_HEAD=04b3e3d91d5dae6df909bf2e091cf40cb6db892f
RUNTIME_HEAD=04b3e3d91d5dae6df909bf2e091cf40cb6db892f
WORKTREE_BEFORE=CLEAN
WORKTREE_AFTER=CLEAN

## Incidente

O endpoint de sessão local respondia 503 sem cookie: local e público retornavam 503 {"error":"local_auth_unavailable"}.

Causa: kallistis.service iniciava com node serve.mjs, mas o entrypoint usa globalThis.Bun.SQL para o executor PostgreSQL. O processo Node não tinha globalThis.Bun; a exceção era convertida em local_auth_unavailable.

## Correção

A menor correção foi alterar package.json para start: bun serve.mjs. Também foi corrigida a leitura de variáveis em tempo de execução na rota Telegram e seus testes foram alinhados ao ambiente Node real. Não houve criação de usuário, provider de IA, credencial ou bypass.

Arquivos no commit: package.json; src/lib/e2e-target.test.ts; src/routes/api/channels/telegram-dialogue.test.ts; src/routes/api/channels/telegram-dialogue.ts
COMMIT=04b3e3d91d5dae6df909bf2e091cf40cb6db892f
MESSAGE=fix(auth): run local session boot with Bun runtime

## Evidência de runtime e PostgreSQL

SERVICE=kallistis.service
SERVICE_ACTIVE=active
SERVICE_WORKDIR=/srv/kallistis
SERVICE_PID=342418
PUBLIC_URL=https://kallistis.app
KALLISTIS_DATABASE_URL=PRESENT
KALLISTIS_CREDENTIAL_LOOKUP_KEY=PRESENT
KALLISTIS_PUBLIC_ORIGIN=PRESENT
DATABASE_CLUSTER=16/kaline
DATABASE_NAME=kallistis
DATABASE_ROLE=kallistis
DATABASE_RUNTIME_CONNECTIVITY=PASS
DB_IDENTITY=kallistis|kallistis
SECRET_VALUES_REPORTED=NO

## Evidência pós-correção

Após build e reinício exclusivo de kallistis.service:
HEALTH_LOCAL_HTTP=200
HEALTH_PUBLIC_HTTP=200
ROOT_LOCAL_HTTP=200
ROOT_PUBLIC_HTTP=200
AUTH_SESSION_LOCAL_AFTER=401 {"error":"unauthorized"}
AUTH_SESSION_PUBLIC_AFTER=401 {"error":"unauthorized"}
LOCAL_AUTH_ERROR_AFTER=ABSENT_FOR_NO_SESSION_REQUEST

O 401 é correto para uma requisição não autenticada; não foi criada sessão falsa.

## Boot visual público

A URL pública foi aberta em navegador real. O shell inicial mostrou Abrindo seu espaço... e depois saiu do loading para a tela de credencial com o botão Entrar. Não houve erro de console.

FRONTEND_LOADING_SHELL_AFTER=PASS
UNAUTHENTICATED_UI_RENDER=PASS
BROWSER_CONSOLE_ERRORS=0
PWA_ICON_WARNING=DEFERRED

## Gates

LINT=PASS
TYPECHECK=PASS
TEST_SUITES=45
TESTS_TOTAL=357
TESTS_PASSED=357
TESTS_FAILED=0
BUILD=PASS
DIFF_CHECK=PASS

Avisos do build: deprecation, arquivos de teste detectados pela árvore de rotas e tamanho de bundle; nenhum bloqueou a compilação.

## Isolamento de Kaline

KALINE_DATABASE_CHANGED=NO
KALINE_SERVICE_CHANGED=NO
KALINE_WORKTREE_CHANGED=NO
KALINE_SERVICE=active
KALINE_DATABASE=present
SERVICE_FILES_CHANGED=NONE

Não houve Docker, diretório temporário, clone alternativo, branch alternativa ou staging. Kaline permaneceu fora da mudança.

## Publicação e estado final

PUSH=PASS origin/master
DEPLOY_RUNTIME_RESTART=PASS kallistis.service only
SOURCE_HEAD=04b3e3d91d5dae6df909bf2e091cf40cb6db892f
ORIGIN_MASTER_HEAD=04b3e3d91d5dae6df909bf2e091cf40cb6db892f
RUNTIME_HEAD=04b3e3d91d5dae6df909bf2e091cf40cb6db892f
WORKTREE_AFTER=CLEAN

PRODUCTION_AUTH_BOOT=PASS
REAL_USER_LOGIN=NOT_EXECUTED_NO_USER_PROVISIONED
CHAT_AI_E2E=NOT_EXECUTED_PROVIDER_NOT_CONFIGURED
FIRST_REMAINING_BLOCKER=none for P0; user/provider intentionally out of scope
NEXT_SAFE_ACTION=separately authorize one real user/provider, not executed here

Conclusão: o incidente P0 de boot da autenticação local foi resolvido e comprovado em produção real, localmente e pelo domínio público, sem tocar em Kaline e sem fabricar sessão, usuário ou resposta de IA.

## Nota operacional

FINAL_CHECK_TEMP_FILES=created_then_removed
FINAL_CHECK_TEMP_FILE_SCOPE=only curl response capture; no application, database, build or deployment state
