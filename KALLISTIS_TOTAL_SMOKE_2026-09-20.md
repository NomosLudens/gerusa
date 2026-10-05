# KALLISTIS — Smoke total de produção

Data de referência: 2026-09-20 (America/Sao_Paulo)  
Modo: diagnóstico read-only. Nenhuma mutação de dados, migração, commit, push ou deploy foi feita por este smoke.

## Veredicto

`VERDICT=PARTIAL`

O runtime publicado está operacional para health/readiness, navegação autenticada disponível, superfícies públicas e proteção de rotas. O smoke não pode ser promovido a `PASS` porque permanecem áreas essenciais sem prova autenticada/operacional neste ciclo (OAuth real, chat de personagem/mestre com contexto real, VTT/handoff, banco/R2/Hyperdrive, IA/STT/TTS e mobile). Há também uma falha conhecida de fingerprint do Character Forge.

Classificação do teste vermelho: `PASS_WITH_PREEXISTING_FORGE_FINGERPRINT_FAILURE` para a suíte automatizada; classificação global permanece `PARTIAL` por evidência essencial não executada.

## Autoridade e baseline

- Checkout usado: `/home/tonyus-dev/Portifolio/KALLISTIS_RECOVERY/kallistis-clean`.
- Branch: `master`.
- HEAD observado: `d6d235352922bf20f769bf3274deebab7107469c`.
- `origin/master`: mesmo SHA; árvore limpa antes da criação deste relatório.
- O brief esperava `3b42efa946f081d5692e6743b09852ed3764a3d7` e a versão antiga do Worker `23eae9b5-e548-4cf8-986e-913268f422f0`. Isso diverge do estado real porque uma correção de produção autorizada ocorreu antes desta missão diagnóstica; não foi feito rollback.
- Worker observado após essa alteração anterior: `kallistis-recovery`, versão `9e7a87ca-5cf6-4189-907c-9ad90dfce248`.
- `BASELINE_DIVERGENCE=FAIL (expected baseline is stale relative to current authorized state)`; não é atribuído como regressão deste smoke.

## Runtime publicado

| Check                              | Evidência                                                              | Status          |
| ---------------------------------- | ---------------------------------------------------------------------- | --------------- |
| `GET /api/public/health`           | HTTP 200; `{"status":"ok","service":"kallistis"}`                      | PASS            |
| `GET /api/public/ready`            | HTTP 200; `{"status":"ready"}`                                         | PASS            |
| `GET /home`                        | Página carregou no browser autenticado; saudação `Bem-vindo de volta.` | PASS            |
| `GET /api/auth/session` sem cookie | HTTP 401, motivo de autenticação obrigatório                           | PASS — proteção |
| `GET /api/profile` sem cookie      | HTTP 401                                                               | PASS — proteção |
| `GET /api/characters` sem cookie   | HTTP 401                                                               | PASS — proteção |
| Rota inexistente                   | HTTP 404 sem stack trace                                               | PASS            |
| `x-request-id` e `server-timing`   | Presentes na produção                                                  | PASS            |

Headers de segurança observados na produção: CSP, `X-Content-Type-Options: nosniff`, Referrer-Policy, Permissions-Policy, COOP e CORP.

## Suítes locais oficiais

- `bun run typecheck`: `PASS`.
- `bun run build`: `PASS`, com warnings conhecidos de TanStack/Vite e testes sob `src/routes` não exportarem `Route`; sem erro de build.
- `bun run test`: `PARTIAL` — 83 arquivos, 558 testes; 557 passaram e 1 falhou.
- Falha única e reproduzida:

  ```text
  src/lib/forge-surface.test.ts
  expected ...character-forge...js?v=p0-independent-20260917
  received ...character-forge...js?v=p0-independent-20260920
  ```

  Classificação: `PREEXISTING_FORGE_FINGERPRINT_FAILURE`; não foi corrigida nesta missão.

- Contratos focados read-only: `4` arquivos, `24/24` testes passaram, incluindo leitura VTT, auth/http e provisionamento de Mesa.
- `bun run check:local-migrations`: `SQL_STATIC_CHECK=PASS`; `SQL_PARSE=NOT_EXECUTED_NO_PSQL`. Nenhuma migração foi aplicada.

## Navegação real observada

Com sessão autenticada já existente, sem cliques mutantes:

| Superfície                                | Resultado                                                                                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Home                                      | PASS; cards de Mestre, mapas, chat, personagens, agenda, registro, Jardim, Revisão e Perfil visíveis.                                    |
| Chat geral                                | PASS; sala compartilhada e histórico renderizados. Não foi enviada mensagem nova.                                                        |
| Personagens e ficha                       | PASS; lista e ficha read-only renderizaram.                                                                                              |
| Character Forge                           | PASS visual; criação, dossiê, progressão e drafts renderizaram. Suíte mantém fingerprint divergente.                                     |
| Central do Mestre                         | PASS visual; carregou Mesa Hub e controles. Dados disponíveis exibidos como zero nesta sessão.                                           |
| Revisão, Agenda, Jardim, Registro Vivo    | PASS visual, estados vazios renderizados sem erro.                                                                                       |
| Perfil                                    | PASS visual; tratamento `Ele / dele` selecionado e Mesa do usuário visíveis. Estado “sincronização pendente” foi observado e preservado. |
| Mapas/Atlas                               | PASS visual; iframe, camadas, busca e legenda renderizados.                                                                              |
| Velarim                                   | PASS visual; dicionário 68/68 e ferramentas renderizadas.                                                                                |
| Canon Explorer                            | PASS visual; categorias e fonte do Manual do Mundo renderizadas.                                                                         |
| Campanhas Geek Wizards/Taverna dos Pandas | PASS visual; dossiês carregaram sem revelação para a Mesa atual.                                                                         |
| Console do browser                        | PASS nas rotas visitadas; nenhum erro de console observado.                                                                              |

Há mensagens históricas de QA no chat. Foram tratadas como resíduo de dados existente, não como nova mensagem criada por este smoke.

## Matriz de escopo

| Área                                 | Status                             | Observação                                                                                                                                      |
| ------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth/session/rotas protegidas        | PASS parcial                       | 401 anônimo e sessão autenticada no browser comprovados; OAuth/login e recovery ponta a ponta não executados.                                   |
| Perfil e pronome                     | PASS                               | Home publicada exibiu `Bem-vindo de volta.` para o perfil real observado (`Ele / dele`). Outros tratamentos não foram alterados nem fabricados. |
| Chat geral                           | PASS parcial                       | UI e histórico reais; envio novo deliberadamente não executado. Menção/IA não foi cobrada novamente.                                            |
| Chat de personagem                   | UNVERIFIED                         | Faltou executar contexto real com personagem autorizado sem alterar dados.                                                                      |
| Chat de Mestre / cross-Mesa          | UNVERIFIED                         | UI do Mestre abriu; operação real entre Mesas não provada.                                                                                      |
| Legacy response modes                | PASS estático                      | Busca de rotas/código não encontrou superfície selecionável legada; não substitui prova de todos os clientes históricos.                        |
| Character Forge                      | PASS visual / PARTIAL              | Fluxo visual abriu; fingerprint automatizado falha `20260917` vs `20260920`.                                                                    |
| VTT character read / owner isolation | PASS em contrato / UNVERIFIED live | Testes focados passaram; sessão/segredo e leitura live do ID canônico não foram repetidos neste smoke.                                          |
| VTT handoff                          | UNVERIFIED                         | Nenhuma chamada mutante ou consumo de handoff foi feito.                                                                                        |
| Mesas/campanhas/continuidade         | PASS visual / UNVERIFIED operação  | Páginas carregam; provisionamento e transições reais não foram executados.                                                                      |
| R2/media/gallery                     | UNVERIFIED                         | Presença de binding/código não prova leitura/escrita live.                                                                                      |
| Hyperdrive/Postgres SELECT           | UNVERIFIED                         | Não houve acesso live ao banco; sem credencial/consulta inventada.                                                                              |
| Migrações                            | PARTIAL                            | Checagem estática passou; parse SQL não executado por ausência de `psql`; estado remoto não provado.                                            |
| Rate limit                           | UNVERIFIED live                    | Bindings presentes no código/configuração; não foi gerado tráfego de carga.                                                                     |
| IA/Radar/Velarim/map/session zero    | PARTIAL                            | Velarim, mapa e superfícies renderizaram; IA/Radar e operações reais não foram acionados.                                                       |
| STT/TTS                              | UNVERIFIED                         | Não acionados para evitar microfone/custo/efeito externo.                                                                                       |
| Desktop/mobile                       | PARTIAL                            | Desktop real comprovado; mobile não foi promovido sem sessão viewport confiável neste ciclo.                                                    |
| Segurança/CSRF                       | PASS estático + headers live       | Headers live comprovados; CSRF foi verificado em código/testes, não por tentativa destrutiva.                                                   |

## Encerramento

- Nenhum dado de usuário, personagem, Mesa, chat ou migração foi alterado por este smoke.
- Nenhum commit, push ou deploy foi feito por este smoke.
- O repositório deve terminar com apenas este relatório novo e não commitado: `KALLISTIS_TOTAL_SMOKE_2026-09-20.md`.
- Próxima ação exata: executar um gate separado, com sessão/segredos explicitamente autorizados, apenas para fechar as linhas `UNVERIFIED`; não misturar isso com correção do fingerprint do Forge.

## Fechamento das evidências UNVERIFIED

Gate executado em modo prova, sem commit, push, deploy, migration ou alteração de configuração.

### Resultado compacto

```text
VERDICT=PARTIAL
HEAD=d6d235352922bf20f769bf3274deebab7107469c
ORIGIN_MASTER=d6d235352922bf20f769bf3274deebab7107469c
WORKTREE_BEFORE=ONLY_REPORT_UNTRACKED

OAUTH_REAL_E2E=UNVERIFIED_NO_SAFE_SECOND_SESSION

CHARACTER_CHAT=UNVERIFIED_NO_AUTHORIZED_ACTIVE_CHARACTER
ACTIVE_CHARACTER_CONTEXT=UNVERIFIED
CHARACTER_CONTEXT_LEAK=UNVERIFIED

MASTER_CHAT=PASS
MASTER_AUTH=PASS
MESA_MASTER_SCOPED_ACCESS=UNVERIFIED_NO_SCOPED_MASTER_SESSION
CROSS_MESA_LEAK=UNVERIFIED

VTT_HANDOFF_CREATE=UNVERIFIED_NO_SELECTED_MESA
VTT_HANDOFF_REDIRECT=UNVERIFIED_NO_SELECTED_MESA
VTT_NO_SECOND_LOGIN=UNVERIFIED_NO_SELECTED_MESA
VTT_CAMPAIGN_MATCH=UNVERIFIED_NO_SELECTED_MESA

HYPERDRIVE_BINDING=PASS
POSTGRES_CONNECTION=PASS
POSTGRES_SELECT=PASS

LAST_LOCAL_MIGRATION=0052_player_invite_identity.sql
LAST_REMOTE_MIGRATION=20260919214435 player_invite_identity
PENDING_MIGRATIONS=0048_security_hardening_auth_recovery.sql, 0049_password_recovery_credentials.sql, 0050_auto_provision_auth_users.sql
MIGRATIONS_REMOTE_STATE=FAIL

R2_BINDING=PASS
R2_READ=UNVERIFIED_NO_SAFE_EXISTING_OBJECT

AI=PASS
STT=UNVERIFIED_NO_SAFE_SPEECH_FIXTURE
TTS=PASS

MOBILE_HOME=PASS
MOBILE_GENERAL_CHAT=PASS
MOBILE_CHARACTER_CHAT=PASS
MOBILE_PROFILE=PASS
MOBILE_CAMPAIGN=PASS
MOBILE_FORGE=PASS

NEW_FAILURES=REMOTE_MIGRATIONS_PENDING_0048_0050
STILL_UNVERIFIED=OAUTH_REAL_E2E, CHARACTER_CONTEXT, CROSS_MESA, VTT_HANDOFF, R2_READ, STT

SMOKE_DATA_CREATED=YES
REPORT_UPDATED=YES

WORKTREE_AFTER=ONLY_REPORT
```

### Evidências observadas

- Chat de Mestre abriu com autorização real e respondeu à mensagem técnica `Liste apenas o nome da Mesa atualmente acessível neste contexto.`. A resposta foi fail-closed: `campanha=NOT_SELECTED, mesa=NOT_SELECTED`. Portanto `MASTER_CHAT=PASS` e `MASTER_AUTH=PASS`, mas contexto de Mesa e isolamento cross-Mesa não foram promovidos.
- Foi criada uma única mensagem de smoke no chat de Mestre, exatamente: `Liste apenas o nome da Mesa atualmente acessível neste contexto.`. Nenhuma mensagem de personagem foi enviada.
- A leitura de uma resposta existente ativou `Parar leitura`, comprovando TTS live; a reprodução foi interrompida depois. Nenhum arquivo permanente foi criado.
- `/api/public/ready` retornou HTTP 200 em produção. O código do endpoint executa `SELECT 1` e `SELECT count(*) FROM public.users` através de `getRuntimeDatabaseUrl()`, que prioriza `HYPERDRIVE.connectionString`; isso fecha binding, conexão e SELECT sem expor credenciais.
- O binding R2 está declarado para `kallistis-media`. O objeto conhecido encontrado no repositório não existia no bucket remoto (`The specified key does not exist`); não foi feita enumeração ampla nem upload. `R2_READ` permanece `UNVERIFIED`.
- A listagem read-only do Supabase remoto retornou as migrations até `player_invite_identity`; as locais `0048`, `0049` e `0050` não apareceram remotamente. Nenhuma migration foi aplicada. Isso é um novo `FAIL` objetivo do gate.
- Viewport móvel `390x844`: home, chat geral, chat de personagem, perfil, campaign shell e Character Forge carregaram sem tela vazia, overflow horizontal ou erro de console.
- OAuth end-to-end não foi repetido: a sessão existente não foi invalidada e não havia uma segunda sessão segura disponível. A entrada visual autenticada não substitui redirect/callback/session creation.

### Mensagens e ruído

`SMOKE_DATA_CREATED=YES`. A mensagem acima permanece no histórico porque não existe exclusão normal segura neste gate. Não foram observados novos `console.error`, exceções não tratadas ou falhas de rede nas páginas móveis e superfícies exercitadas; respostas 401 anônimas anteriores permanecem proteção esperada.

### Próxima ação exata

`NEXT_EXACT_ACTION=Não promover o smoke para PASS; abrir um gate de remediation separado para reconciliar as migrations remotas 0048–0050, sem aplicar migration automaticamente. Em seguida, obter uma segunda sessão OAuth autorizada e uma sessão de Mestre escopada a uma única Mesa para fechar as provas restantes.`

## Reconciliação read-only das migrations 0048–0050

Gate executado contra o PostgreSQL autoritativo via consulta read-only. Nenhuma migration foi aplicada, nenhum registro de ledger foi inserido e nenhum dado sensível foi lido.

```text
VERDICT=PASS_WITH_LEDGER_DRIFT

0048_FUNCTION_SECURITY=SECURITY INVOKER; search_path=pg_catalog, public
0048_GRANTS=PUBLIC=false; anon=false; authenticated=false; kallistis=true
0048_SYSTEM_MASTER_UID=88ed06e0-772e-47eb-ae2a-c920aaa197fe exists=true; public.users.status=active; system_master=true
MIGRATION_0048_STATE=EFFECT_PRESENT_LEDGER_MISSING

0049_RECOVERY_CREDENTIALS_TABLE=PASS; estrutura, PK, FK, checks e lock index presentes
0049_RECOVERY_EVENTS_TABLE=PASS; estrutura, PK, FK e event_type check presentes
0049_GRANTS=PASS; kallistis SELECT/INSERT/UPDATE em credentials e INSERT em events; sem grants PUBLIC/anon/authenticated observados
MIGRATION_0049_STATE=EFFECT_PRESENT_LEDGER_MISSING

0050_FUNCTION=PASS; SECURITY DEFINER; search_path=pg_catalog, public; EXECUTE público/kallistis=false
0050_TRIGGER=PASS; auth.users; AFTER INSERT; FOR EACH ROW; enabled
0050_AUTH_USERS_WITHOUT_PUBLIC_USER=0
MIGRATION_0050_STATE=EFFECT_PRESENT_LEDGER_MISSING

LEDGER_0048=VERIFIED_EXISTING; applied_at=NULL
LEDGER_0049=APPLIED_IN_THIS_RUN; applied_at=2026-09-17T15:38:37.605389Z
LEDGER_0050=VERIFIED_EXISTING; applied_at=NULL

0051_EFFECT_PRESENT=PASS; player_invites e player_invite_oauth_states presentes
0052_EFFECT_PRESENT=PASS; profiles.pronouns, oauth_states.display_name e oauth_states.pronouns presentes

SAFE_NEXT_ACTION=LEDGER_RECONCILIATION_ONLY
DB_WRITES=0
MIGRATIONS_APPLIED=0
LEDGER_CHANGED=NO
```

O estado efetivo não sustenta reaplicação de `0048–0050`: as funções, permissões, estruturas, trigger e backfill já existem; a contagem `auth.users` sem correspondente em `public.users` é zero; e não há system master local sem correspondente em `auth.users`. O `EFFECT_PRESENT_LEDGER_MISSING` identifica o drift entre o histórico externo reportado e o ledger/estado efetivo, não ausência dos efeitos. Os checksums locais de `0048–0050` coincidem com os checksums registrados no ledger autoritativo.

## Gate migration status drift — origem do falso pending

```text
VERDICT=PASS_WITH_STATUS_DETECTOR_BUG

PENDING_DETECTOR=Comparação manual do smoke anterior; nenhum detector correspondente foi encontrado no repositório.
PENDING_QUERY_OR_COMMAND=mcp__codex_apps__supabase_list_migrations(project_id=gidsdflkjuaoxhejudna) comparado com find db/migrations -maxdepth 1 -type f -printf '%f\\n' | sort -V

0048_LEDGER_STATE=version=0048; verification_state=VERIFIED_EXISTING; applied_at=NULL; verified_at presente
0048_CHECKSUM_MATCH=PASS

0049_LEDGER_STATE=version=0049; verification_state=APPLIED_IN_THIS_RUN; applied_at NOT NULL; verified_at presente
0049_CHECKSUM_MATCH=PASS

0050_LEDGER_STATE=version=0050; verification_state=VERIFIED_EXISTING; applied_at=NULL; verified_at presente
0050_CHECKSUM_MATCH=PASS

ROOT_CAUSE=DETECTOR_IGNORES_VERIFIED_EXISTING
MIGRATION_ACTUAL_STATE=PASS
DATABASE_CHANGE_REQUIRED=NO

FIX_TARGET_FILE=NONE_FOUND_IN_REPO; corrigir a lógica do smoke/report generator que compara a API de histórico externo, não o ledger autoritativo
FIX_REQUIRED=YES

DB_WRITES=0
LEDGER_CHANGED=NO
MIGRATIONS_APPLIED=0

NEXT_EXACT_ACTION=No próximo smoke, consultar public.kallistis_schema_migrations e validar checksum/verification_state antes de classificar pending; não usar ausência na lista supabase_list_migrations como prova de migration pendente.
```

O contrato de `db/migrations/0007_schema_migrations.sql` aceita explicitamente `VERIFIED_EXISTING` com `applied_at IS NULL` e `APPLIED_IN_THIS_RUN` com `applied_at IS NOT NULL`, por meio da constraint `kallistis_schema_migrations_applied_at_check`. O detector anterior não avaliou essa constraint nem a tabela; portanto, não ficou provado que ele tenha uma condição literal `applied_at IS NULL => PENDING`. O defeito comprovado é a fonte de comparação: a API externa não listou `0048–0050`, enquanto o ledger KALLISTIS e os efeitos reais os validam.
