# KALLISTIS — percurso publicado: cânone do chat e criação de personagem

**Data:** 2026-09-30 (America/Sao_Paulo)
**Missão:** smoke de Povos, Ofícios e regras de criação no chat Character Creation; corrigir falhas semânticas encontradas e publicar a versão resultante.
**Limite:** este percurso cobre o fluxo de cânone/criação citado na missão e as alterações que já estavam no checkout autorizado. Não é uma certificação de todas as telas e funções do KALLISTIS.

## MISSION

Confirmar que perguntas de jogador sobre Povos, Ofícios, regras de criação e identificadores `LOCK-XX` recebem conteúdo do cânone correto, com citações e sem inferência inventada; corrigir regressões encontradas, verificar a persistência das respostas e publicar o runtime.

## BASE

- Repositório operacional: `KALLISTIS_RECOVERY/kallistis-clean`, conforme `.kallistis-authority.json`.
- `BASE_SHA`: `e8fa40091a68bf72cdc7df214dc0d29345026192`.
- Branch: `master`; remoto `origin/master` apontava para o mesmo SHA-base no início deste percurso.
- Worker: `kallistis-recovery`.
- Projeto Supabase configurado: `gidsdflkjuaoxhejudna`.
- URL de produção: `https://kallistis.app`.
- Checkout continha alterações não commitadas em 29 arquivos antes deste relatório; foram preservadas. O deploy do Worker compila o estado completo do checkout.

## CHANGED_FILES

Arquivos diretamente relacionados à resolução do cânone nesta missão:

- `src/lib/canonical-rules.server.ts` — extração de catálogo a partir dos títulos do documento canônico, recuperação de seções específicas da criação e resolução de todos os `LOCK-XX` citados.
- `src/server/chat/kallistis-chat-runtime.ts` — encaminhamento de perguntas de regras para resolução direta no cânone; reconhecimento de formas plurais de Povos/Ofícios.
- `src/lib/canonical-rules.server.test.ts` e `src/server/chat/kallistis-chat-runtime.test.ts` — cobertura das regressões de resolução/classificação.

O deploy também continha alterações previamente pendentes no fluxo de personagem, chat e acesso ao Gravewright presentes no checkout. Elas não foram reclassificadas como aprovadas por este smoke; a lista integral do estado publicado está no commit de publicação e no histórico do repositório.

### Inventário integral do checkpoint publicado

Este inventário descreve o alcance do checkpoint de código; não atribui aprovação de runtime a arquivos fora do smoke acima.

- **Chat e cânone:** `src/lib/canonical-rules.server.ts`, `src/lib/canonical-rules.server.test.ts`, `src/lib/kallistis-prompt.ts`, `src/server/chat/kallistis-chat-runtime.ts`, `src/server/chat/kallistis-chat-runtime.test.ts`, `src/server/chat/kallistis-tools.ts`, `src/server/chat/kallistis-tools.test.ts`, `src/routes/api/chat.ts`, `src/routes/api/chat.test.ts`, `src/components/ChatView.tsx`.
- **Personagem e ficha:** `src/components/CharacterVisualSheet.tsx`, `src/routes/_authenticated/perfil.tsx`, `src/server/characters/character-canon.test.ts`, `src/server/characters/chat-creation.ts`.
- **Convite e chave de acesso Gravewright/Velarim:** `public/convite-jogo/index.html`, `public/jogar/character-forge.html`, `src/routes/api/invite.ts`, `src/routes/api/vtt/player-phrase.ts`, `src/routes/api/vtt/player-phrase.test.ts`, `src/server/local-core/player-phrase-crypto.ts`, `src/server/local-core/player-phrase-crypto.test.ts`, `src/server/local-core/player-phrase-velarim.ts`, `src/server/local-core/player-phrase-velarim.test.ts`, `db/migrations/0056_player_access_phrase_ciphertext.sql`.
- **Shell, sessão e infraestrutura:** `src/components/loading-states.tsx`, `src/routes/__root.tsx`, `src/routes/_authenticated/route.tsx`, `src/server/local-core/postgres-repositories.ts`, `src/server/runtime/supabase-auth.ts`.
- **Percurso e evidências deste relatório:** `docs/qa/KALLISTIS_PERCURSO_PUBLICADO_2026-09-30.md`.

**Total do checkpoint:** 30 arquivos, 1.694 inserções e 158 remoções em relação ao `BASE_SHA`. O deploy incorporou o checkpoint todo. Os gates de runtime das áreas de convite, criptografia/chaves, ficha e demais telas não foram executados nesta missão e permanecem **NOT_EXECUTED** aqui.

## TESTS

- **PASS — testes direcionados:** 50 testes passaram após a correção da classificação de perguntas no plural.
- **PASS — typecheck:** `bun run typecheck` terminou com código 0.
- **PASS — integridade do diff:** `git diff --check` terminou com código 0.
- **PASS — deploy/build:** `bun run deploy:kallistis` passou pelo guard de autoridade (repositório, Worker, Supabase, Hyperdrive e R2), concluiu build e upload do Worker.
- Os avisos conhecidos do build sobre arquivos de teste em `src/routes` e `vite-tsconfig-paths` não impediram o build; não foram tratados como prova de fluxo de produto.

## RAW_EVIDENCE

### Fluxo autenticado em produção observado antes do último ajuste de plural

- Chat: `https://kallistis.app/chat/a24db9e0-d6e7-4879-9895-54122e8a1775?scope=character_creation`.
- Identidade: sessão autenticada como jogador no escopo de criação de personagem. As consultas executadas foram somente de leitura; nenhuma ficha foi alterada.
- Consulta de catálogo retornou 9 Povos e 9 Ofícios, com as fontes `PARTE II — POVOS` e `PARTE III — OFÍCIOS`, identificadas como `kallistis-rules-2.0`, versão `2.0`.
- Consulta com `LOCK-07` e `LOCK-19` retornou as duas seções correspondentes do cânone.
- Pergunta sobre Ofício na criação retornou a regra geral de compatibilidade Povo/Ofício, duas perícias treinadas, +1 e máximo inicial 3; a resposta também recuperou a seção de perícias iniciais.
- Consulta das regras de criação retornou as seções 17 (Atributos iniciais), 18 (Perícias iniciais) e 19 (Vínculos), com as alocações e os três vínculos registrados na fonte. As mensagens continuaram no chat após recarga.
- Log de produção do resolvedor direto: request `c8205c43-07ef-4dea-b22f-b804be3f3dec`; `source_id=kallistis-rules-2.0`; versão `2.0`; seções `[PARTE II — POVOS, PARTE III — OFÍCIOS]`; estado `success`; `POST /api/chat` HTTP 200.

### Correção e publicação posterior

- Uma formulação ampla no plural (“Quais são todos os Povos e todos os Ofícios canônicos?”) revelou que o classificador podia deixar de encaminhar a pergunta ao resolvedor direto. A regra foi ampliada e coberta pelos testes direcionados.
- Worker publicado após essa correção e novamente a partir do checkpoint de código: versão `fc896034-d0f5-4cf5-a4c1-6605ad3a2f6f`.
- O novo smoke visual/autenticado dessa formulação exata **não foi concluído**: a conexão do navegador interno não estava disponível (seleção falhou e `agent.browsers.list()` retornou `[]`). Não se usou outro navegador, sessão ou fonte para contornar a falha.

## RESULT

- **PASS:** catálogo, `LOCK` múltiplo, regras de Ofícios/criação e persistência após recarga foram observados no fluxo autenticado da produção que estava ativa durante esses testes.
- **PASS:** correção para formas plurais passou nos testes locais e foi publicada no Worker `14b20004-964c-4449-a16c-5dcd39b90b9d`.
- **PARTIAL:** o smoke de produção da formulação plural específica após a publicação permanece sem evidência visual/autenticada. O build e os testes não substituem esse gate.
- **NOT_EXECUTED:** auditoria de todos os outros recursos e telas do app; mutações de ficha; nova consulta ao chat autenticado depois da publicação final.

## COMMIT

`c2f3878` — `Publish canonical character creation and access flow`.

## COMMIT_SHA

`c2f3878c33f3747a4e981509cef597cb66bc8ac6`.

## PUSH

**PASS:** `origin/master` foi confirmado em `cf9791719e2b5d37e28b4c5e19a68e67b7a50a1a` por `git ls-remote`; esse commit contém este relatório e o inventário integral. Esta confirmação final do estado foi enviada no commit seguinte.

## RUNTIME_SMOKE

Worker publicado em `kallistis-recovery`, versão `fc896034-d0f5-4cf5-a4c1-6605ad3a2f6f`, compilado a partir do checkpoint `c2f3878c33f3747a4e981509cef597cb66bc8ac6`. As evidências autenticadas anteriores do catálogo, `LOCK`, Ofícios e criação foram obtidas na versão `e6995852-1b17-4ef5-91df-3ef7e19209fc`; o comportamento da formulação plural após a correção ainda precisa de reteste no chat em produção quando o navegador interno voltar a conectar.

## NEXT_EXACT_ACTION

Abrir o chat autenticado de Character Creation e perguntar “Quais são todos os Povos e todos os Ofícios canônicos? Liste-os.”; verificar que o chat retorna o catálogo completo vindo de `kallistis-rules-2.0`, com as duas seções citadas, que a resposta aparece após recarga e que o log registra a resolução canônica direta.
