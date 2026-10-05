# KALLISTIS — PR2.1 — Fechamento formal do PR2

MISSION=PR2_1_FINAL_ACCEPTANCE_AND_TEST_DATA_CLEANUP
ENVIRONMENT=PRODUCTION_REAL
HOST=max
WORKTREE=/srv/kallistis
REPOSITORY=Tonyus-dev/kallistis
BRANCH=master
START_HEAD=7c2c10be8cdf396dcb3b901a13bf8b94a6a64a73
END_HEAD=7c2c10be8cdf396dcb3b901a13bf8b94a6a64a73
ORIGIN_MASTER_HEAD=7c2c10be8cdf396dcb3b901a13bf8b94a6a64a73
RUNTIME_HEAD=7c2c10be8cdf396dcb3b901a13bf8b94a6a64a73
WORKTREE_STATUS=CLEAN_BEFORE_DOCS_COMMIT

## Baseline congelado

PR1_STATUS=PASS_FROZEN
PR2_CHAT_PROVIDER_E2E=PASS_BASELINE
PR2_CHAT_STREAM=PASS_BASELINE
PR2_CHAT_PERSISTENCE=PASS_BASELINE
PR2_CHAT_RELOAD=PASS_BASELINE
PR2_CHAT_CONTINUITY=PASS_BASELINE
PR2_HERMES_IDENTITY=PASS_BASELINE

A bateria histórica permanece no relatório
`KALLISTIS_PR2_OPENROUTER_CHAT_E2E.md`. Ela registrou a janela inequívoca
da bateria: antes dela havia zero `chat_messages`; depois havia 29 linhas na
única thread, distribuídas em 18 mensagens `user` e 11 `assistant`.

## Regressão integral no HEAD de entrada

FINAL_LINT=PASS
FINAL_TYPECHECK=PASS
FINAL_TEST_COMMAND=bun run test
FINAL_TEST_SUITES=48
FINAL_TESTS_TOTAL=365
FINAL_TESTS_PASSED=365
FINAL_TESTS_FAILED=0
FINAL_TESTS_SKIPPED=0
FINAL_BUILD=PASS
FINAL_DIFF_CHECK=PASS
FINAL_FULL_TEST_SUITE=PASS

`bun run build` produziu o build de produção. Permaneceram apenas warnings
existentes do Vite/TanStack (arquivos de teste descobertos como rotas,
`inputValidator` depreciado e chunks grandes); nenhum warning virou falha.

## Auth lifecycle real

AUTH_LOGOUT=PASS
PROTECTED_CHAT_AFTER_LOGOUT=PASS
AUTH_RELOGIN=PASS
SESSION_AFTER_RELOGIN=PASS
CHAT_THREAD_AFTER_RELOGIN=PASS
CHAT_HISTORY_AFTER_RELOGIN=PASS
MASTER_WORD_EXPOSED=NO
BROWSER_RUNTIME_ERRORS=0

Evidência observada na produção: `DELETE /api/auth/session` respondeu 204;
as consultas seguintes sem sessão responderam 401; a tentativa de `/chat`
redirecionou para `/auth`; o login manual no navegador respondeu 201 e a
sessão respondeu 200. A mesma URL da thread canônica
`a03d37da-06a2-4178-9a13-213f442fc836` reabriu com todo o histórico anterior.
Após o cleanup, o reload mostrou a mesma thread vazia, com composer e link de
sedimentação presentes. O banco terminou com uma sessão revogada e duas
sessões ativas, consequência de dois logins manuais; a quantidade não precisava
permanecer igual.

## Auditoria e cleanup da bateria sintética

PR2_TEST_USER_MESSAGES_IDENTIFIED=18
PR2_TEST_ASSISTANT_MESSAGES_IDENTIFIED=11
PR2_TEST_MESSAGES_TOTAL_IDENTIFIED=29
PR2_TEST_MESSAGE_WINDOW=2026-08-30 20:55:57.668+00..21:41:55.375+00 UTC
PR2_TEST_MESSAGE_THREAD=a03d37da-06a2-4178-9a13-213f442fc836
PR2_TEST_MESSAGE_USER_COUNT=1
PR2_TEST_MESSAGE_SOURCE_CHANNEL=C01

SEDIMENTS_TOTAL_FOR_THREAD=0
SEDIMENTS_REFERENCING_PR2_TEST_MESSAGES=0
SEDIMENTS_EM_REVISAO_FROM_TEST=0
SEDIMENTS_CONFIRMED_FROM_TEST=0
SEDIMENTS_PROMOTED_FROM_TEST=0
JARDIM_MEMORIES_DERIVED_FROM_TEST=0
TEST_DATA_REACHED_CONFIRMED_MEMORY=NO

TEST_DATA_CLEANUP_ELIGIBLE=YES
TEST_DATA_CLEANUP_EXECUTED=YES
TEST_DATA_CLEANUP_TRANSACTION=COMMIT
TEST_DATA_CLEANUP_ROLLBACK_REQUIRED=NO
CHAT_MESSAGES_AFTER_CLEANUP=0
SEDIMENTS_FROM_PR2_TEST_AFTER_CLEANUP=0
THREAD_PRESERVED=YES
THREAD_DUPLICATED=NO
LAST_SEDIMENTADO_AT_AFTER_CLEANUP=NULL

O conjunto foi delimitado por thread, usuário, canal e timestamps, e conferido
contra a contagem histórica zero antes da bateria. O backup lógico mínimo de
IDs e metadados, sem conteúdo de mensagem ou segredo, está em
`KALLISTIS_PR2_1_TEST_DATA_BACKUP.tsv`.

Antes do `DELETE`, foram verificadas as referências: não havia sedimentos,
candidatos ou memórias, e não havia foreign key apontando para mensagens.
A transação validou 29 linhas, 18/11 por papel, uma thread, um usuário, um
canal e cursor `NULL`; removeu somente essas mensagens; confirmou uma thread,
zero mensagens e cursor `NULL`; então executou `COMMIT`.

## Provider e limites preservados

CHAT_PROVIDER=OPENROUTER_SERVER_SIDE
OPENROUTER_API_KEY=PRESENT
OPENROUTER_SECRET_EXPOSED=NO
OPENROUTER_CHAT_MODEL=deepseek/deepseek-v4-flash-0731
OPENROUTER_CHAT_MODEL_FALLBACK=poolside/laguna-s-2.1
OPENROUTER_FAST_MODEL=openai/gpt-4o-mini
OPENROUTER_REASONING_MODEL=z-ai/glm-5.3-flash
OPENROUTER_PRIMARY_RUNTIME=PASS
OPENROUTER_FALLBACK_REAL_RUNTIME=NOT_TRIGGERED

O cliente envia o campo opcional `chatModel`, mas nenhum erro real foi
observado com o campo omitido durante a validação final; a allowlist estática
antiga não foi alterada preventivamente.

CHAT_MODEL_ALLOWLIST_MISMATCH_IMPACT=NO_ERROR_OBSERVED_DEFERRED_PR3
ACTIVE_CHAT_SUPABASE_BOOT_ERROR=NO
IDENTITY_ROUTER_CODE=ACTIVE
IDENTITY_ROUTING_DOC=STALE_DEFERRED_PR3
PR2_SECURITY_BATTERY=PASS_RECORDED

## KALLISTIS e estado final

KALLISTIS_RUNTIME=Bun
KALLISTIS_SERVICE=active
KALINE_SERVICE_BEFORE=active
KALINE_SERVICE_AFTER=active
KALINE_DATABASE_TOUCHED=NO
KALINE_WORKTREE_TOUCHED=NO
GLOBAL_SUPABASE_REMOVAL=DEFERRED_PR3
DISTRIBUTED_RATE_LIMIT_HARDENING=DEFERRED_PR3

Não houve alteração funcional de código nesta missão; o commit final desta
missão contém somente documentação e o backup lógico mínimo. Nenhuma segunda
thread foi criada, nenhuma bateria foi repetida e nenhum segredo foi impresso.

## Resultado formal

PR1_STATUS=PASS_FROZEN
PR2_CHAT_E2E=PASS
PR2_SECURITY_SMOKE=PASS
PR2_AUTH_LIFECYCLE=PASS
PR2_TEST_DATA_HYGIENE=PASS
PR2_FINAL_REGRESSION=PASS
PR2_1_STATUS=PASS
PR2_STATUS=PASS_FROZEN
FUNCTIONAL_CHAT_E2E=PASS
CORE_HARDENING=DEFERRED_PR3
CORE_FREEZE=NO
PR3_STATUS=READY
