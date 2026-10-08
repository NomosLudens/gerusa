# GERUSA — Mapa de percurso canônico

**Atualizado em:** 2026-10-08

**Missão:** adaptação multiusuário de KALLISTIS para Gerusa  
**Resultado da adaptação pedagógica anterior:** `GERUSA_PEDAGOGICAL_PRODUCT_ADAPTATION_PASS` — prova funcional parcial, não certifica o produto completo.
**Gate único atual:** `GERUSA_PRODUCT_READY_PASS` (fechado em 2026-10-08)

## Fechamento final do GERUSA_PRODUCT_READY_GATE

O relatório detalhado, com as etapas anteriores preservadas como histórico, está
em [GERUSA_PRODUCT_READY_GATE_RELATORIO_2026-10-08.md](GERUSA_PRODUCT_READY_GATE_RELATORIO_2026-10-08.md).

- Aplicação publicada até `8f6ccb0f575b0635951513d9087683dcab148608`;
  `master` e `origin/master` agora em `c1bd35b492ad3df252e49d4088fa50e69d8ca910`
  (commit apenas de documentação).
- Gerusa Core ativo na Mini: `101a0930cf64b9067e025970c2a95e6807d93e02`;
  health local e público `200`. Os commits posteriores até HEAD alteram somente
  a seleção de campanha na interface Mestre.
- Worker a 100%: `37cdac3d-16a6-4e5f-ab4e-323e84aa297e`.
- Migrations `0008_username_format` e `0009_campaign_context` constam no banco
  de produção.
- Em produção, professora QA autenticou normalmente e criou Lucas e Maria pela
  interface. Foram comprovados username, PIN, campanhas, personagens,
  planejamento, aventuras, sessões, tarefas, submissions, revisão assistida
  por IA real, feedback editado/persistido, isolamento bilateral e telas
  desktop/mobile. A ação “Sugerir próxima aula com histórico” também foi
  executada após salvar uma aula concluída pela UI: a proposta retomou a
  aventura e os alvos anteriores, avançou de Past Simple para Past Continuous,
  permaneceu editável e não foi salva automaticamente.
- OpenRouter respondeu pelo Worker usando
  `nvidia/nemotron-3-ultra-550b-a55b:free`; a chave permaneceu server-side.
- Limpeza final: 9 identidades QA criadas em duas rodadas, sessões, Mesas e
  recursos QA removidos. Contagens: usuários `10 → 3` na rodada principal e
  `5 → 3` na validação adicional; QA IDs/recursos/sessões `0`;
  `system_master` `1 → 1`. Arquivos de credenciais/PIN e backup temporário que
  continha QA removidos.

Os estados `INCIDENT` abaixo preservam o histórico dos bloqueios anteriores e
não descrevem o estado operacional final.

## Antes desta adaptação

A Gerusa tinha o shell visual e o chat persistente, mas não tinha uma vertical
multiusuário ativa em produção: login, identidade de professora/alunos,
memberships e autorização por usuário ainda não conduziam o fluxo principal.
Este estado anterior e os incidentes descritos abaixo permanecem registrados;
esta atualização não apaga a história operacional.

## Arquitetura em produção

```text
Browser → Cloudflare Worker Gerusa → Gerusa Core na Mini → PostgreSQL gerusa
```

- A UI e o roteamento autenticado existentes foram adaptados; não foi criada
  uma SPA paralela.
- `/auth` mantém login e sessão persistente. O Worker guarda o cookie
  `__Host-gerusa_session` com `HttpOnly`, `Secure`, `SameSite` e `Path=/`.
- Cada chamada autenticada resolve user, role e memberships no Core. A role é
  derivada do banco: `mestre` aparece como Professora e `jogador` como Aluno.
- A role de sistema `system_master` concede acesso aos contextos A e B. As
  memberships de mesa usam `gerusa.mesa_members` e as campanhas usam
  `gerusa.campaigns`.
- Conversas autenticadas guardam `user_id` e `mesa_id`; leitura e escrita
  verificam ownership e membership no servidor.
- OpenRouter é chamado pelo Worker; a chave permanece em Secret server-side.
  Supabase não participa do golden path Gerusa.

## Modelo e dados de validação

Migração `db/gerusa/0003_kallistis_product_foundation.sql` aplicada ao banco
real, confirmando `current_database() = gerusa` e `current_user = gerusa`.
As tabelas de identidade e campanha permanecem em `gerusa.*`, sem duplicatas
em `public.*` e sem FK para outro schema.

Consulta somente leitura após os fluxos de produção confirmou:

- 3 users ativos e 3 profiles: MESTRE GERUSA, ALUNO A e ALUNO B;
- 2 mesas/campanhas de validação e 4 memberships ativas;
- uma role de sistema `system_master`; memberships da professora como
  `mestre` e dos alunos como `jogador`;
- uma credencial ativa por conta; os três hashes usam scrypt;
- conversas autenticadas pertencem ao user e à mesa correspondentes.

Há também 2 conversas antigas sem owner, com 15 mensagens no total, de smoke
anterior à autenticação. Elas não são incluídas nos históricos autenticados e
não foram alteradas nem apagadas durante esta missão.

## Fluxos de produção comprovados

### Sem sessão

- A rota protegida `/mestre` redireciona para `/auth`.
- `/api/profile` e `/auth/session` sem sessão rejeitam com HTTP 401.
- O Core responde HTTP 200 em `/health`; `/auth/session` sem credencial de
  serviço rejeita com HTTP 401.

### Professora

- Login real como MESTRE GERUSA e sessão preservada após reload.
- `/mestre` apresenta a Professora e o seletor de contexto.
- Campanha A mostra ALUNO A e “A Biblioteca dos Relógios”. Campanha B mostra
  ALUNO B e “O Jardim das Palavras”; os contextos são distintos.
- A professora abriu a conversa própria de B. O painel também oferece a
  conversa de A no contexto A.
- Logout invalida a sessão; reload continua em `/auth`.

### Alunos

- ALUNO A vê o próprio perfil, Campanha A e conversa autenticada. Reload
  preserva a sessão e o histórico. Tentativas de abrir a conversa de B por URL
  falham sem revelar o histórico.
- ALUNO B vê o próprio perfil e Campanha B, sem os dados de A. Reload preserva
  a sessão. Tentativa de abrir a conversa de A por URL falha sem revelar o
  histórico.
- A autorização cruzada também foi verificada diretamente no Core: aluno
  recebe 404 para thread de outro aluno e 403 para o endpoint de professora.
- Logout seguido de reload não restaura a sessão.

### Chat e persistência

- O chat existente chamou OpenRouter real via Worker e transmitiu a resposta
  progressivamente no browser.
- A continuidade sobre “My character is afraid of clocks.” foi comprovada
  depois de reload, com resposta da Gerusa recuperando o detalhe informado.
- Consulta read-only ao PostgreSQL confirmou mensagens de usuário e assistente
  nas conversas autenticadas de A. A conversa autenticada vazia de B também tem
  owner e mesa persistidos.
- Nenhuma tabela de Gerusa foi criada no banco Totalidade durante esta missão.

### Desktop e mobile

- Desktop: `/mestre`, navegação da Professora, seletor de campanha e lista de
  alunos renderizados em produção.
- Mobile a 390 × 844: home de ALUNO B, menu reduzido, login/logout e conversa
  Gerusa renderizados; a largura do documento cabe no viewport.

## Gate pedagógico e modelo gratuito — 2026-10-07

- Modelo configurado no Worker `gerusa` por Secret: `nvidia/nemotron-3-ultra-550b-a55b:free`.
  A chave OpenRouter permanece exclusivamente server-side. As chamadas reais
  registraram o modelo selecionado; nenhuma chamada direta ao provedor ou
  credencial apareceu no client.
- O chat real respondeu em inglês, exibiu 26 atualizações progressivas no
  browser (primeiro delta visível em 323 ms) e preservou usuário e resposta
  após reload. Resposta final: 642 caracteres. HTTP 200; zero erros de página.
- Com a mesma configuração, ações estruturadas reais completaram planejamento,
  aventura, continuação de cena, resumo, tarefa contextualizada e próxima aula.
  Um retorno transitório de sobrecarga 503 do provedor foi recuperado pelo
  retry limitado já registrado no histórico de commits.
- O fluxo pedagógico foi executado em produção para ALUNO A: planejar e salvar
  aula, gerar e salvar aventura, iniciar sessão, registrar observação e
  progresso, incluir cena, salvar resumo, encerrar a sessão, publicar tarefa,
  responder como aluno, reler após reload, receber correção da professora e
  salvar a próxima aula baseada no histórico.
- ALUNO B autenticou em contexto separado e não recebeu aula, aventura ou tarefa
  de A. A tentativa de consultar o contexto de outra mesa retornou 404.
- A consulta PostgreSQL em transação `READ ONLY` confirmou no banco e papel
  `gerusa`: aula e aventura existentes, sessão encerrada, progresso confirmado,
  tarefa com resposta enviada e correção salva, e próxima aula persistida.
- Desktop passou em 1440 px. Mobile passou em 390 × 844 sem overflow
  horizontal. Não houve erros de página; erros de console observados foram os
  401 da checagem sem sessão e o 404 esperado do teste de isolamento.
- As linhas pedagógicas de validação estão marcadas `Gate` e foram mantidas no
  PostgreSQL para auditoria; nenhuma linha foi apagada.

## Gate único de produto — 2026-10-07

O gate vigente exige provar o fluxo humano desde uma instalação sem professora,
seguido do uso pela professora e pelos alunos. Os PASS anteriores deste mapa
continuam como evidência de engenharia e do ciclo pedagógico com contas já
existentes; eles não demonstram onboarding inicial nem tornam o produto pronto.

### Implementação publicada

- `5c39b2d5b906199e71fa2939427fa382e0a8a3e6` está em `master`, `origin/master`
  e no clone da Mini.
- Worker `gerusa` atualizado para a versão
  `838eaa6d-5490-49e5-8622-42744816f5e0`; serviço Core ativo na Mini.
- Migration `0006_product_accounts` aplicada em transação pelo banco e role
  `gerusa`; nenhuma conta existente foi criada, removida ou desativada.
- Migration `0007_teacher_recovery` aplicada à mesma base/role, sem alteração
  dos usuários existentes.
- `/` oferece a configuração inicial quando não há Mestre. `/setup` cria a
  primeira professora, role de sistema, mesa inicial e sessão em uma transação;
  quando já existe Mestre ativo, a configuração fica fechada.
- `/auth` aceita identificador + segredo no contrato de autenticação existente;
  contas infantis usam username + PIN de seis dígitos, hash scrypt, limitação de
  tentativas e resposta genérica.
- A UI Mestre recebeu criação de aluno com nome, idade, username sugerido,
  PIN, mesa/campanha opcional e observação privada; reset de PIN, desativação e
  reativação preservam os dados e revogam sessões quando necessário.
- A senha da professora pode ser alterada pela área Minha conta. A observação
  privada não é retornada no perfil nem incluída no contexto pedagógico.
- Uma nova professora recebe no setup um código de recuperação de uso único;
  apenas o hash scrypt fica no registro de credentials. A tela `/auth` oferece
  redefinição com e-mail, código e nova senha; o sucesso consome o código e
  revoga sessões numa transação. Este caminho ainda não foi exercitado com uma
  primeira professora real. A professora ativa atual antecede esse recurso e
  não possui código de recuperação armazenado.
- O fluxo de setup, login, criação e gestão de alunos ainda não foi comprovado
  como professora autenticada em produção.

### Evidência real deste gate

- Build, typecheck, lint dos arquivos alterados e `git diff --check` passaram.
- Home de produção e `/setup` responderam HTTP 200. `/api/setup/status` retornou
  `available=false`; a tela informa que a configuração inicial foi concluída.
- Sem sessão, `/api/auth/session` e `/api/admin/students` retornaram HTTP 401.
- Core local e Core pelo Tunnel responderam `{"status":"ok"}`. A consulta
  `READ ONLY` confirmou `current_database=gerusa`, `current_user=gerusa`,
  migrations `0006_product_accounts` e `0007_teacher_recovery`, três usuários
  ativos e um Mestre ativo.
- Navegador headless em 1440×900 e 390×844 abriu a home; a largura do documento
  coube no viewport, sem erro de página. A home não fez chamada direta ao
  OpenRouter e o bundle client não contém padrão de chave ou bearer.
- O conector de navegador não conseguiu carregar a política de headers; uma
  navegação headless validou apenas superfícies públicas. Não havia sessão de
  professora disponível para executar criação/reset de aluno e ciclo de UI.
- Nenhuma conta foi criada por SQL. Os três usuários preexistentes foram
  preservados.

### Veredito

`GERUSA_PRODUCT_READY_INCIDENT`.

O teste obrigatório de primeira professora não pode ser executado no banco de
produção atual porque existe um Mestre ativo. O próprio requisito fecha `/setup`
nesse estado. Remover/desativar a professora ou apagar dados para simular zero
não foi autorizado; criar outra base ou Worker também contraria a arquitetura
definida. Como o primeiro passo do teste humano não ocorreu, criação de Lucas e
Maria pela UI, isolamento, reset, desativação/reativação e ciclo pedagógico
integrado deste gate permanecem sem prova. O ciclo pedagógico anterior continua
registrado como evidência parcial, não como substituto deste teste.

Para retomar o fluxo humano, é necessário um alvo Gerusa de primeira instalação
aprovado para o teste, sem dados finais preexistentes e compatível com as
restrições de arquitetura do gate. O código de recuperação cobre novas contas;
a conta ativa de produção antecede esse recurso e permanece sem código. A
alteração de senha existente exige a senha atual.

## Incidentes anteriores preservados

- Rotas `/auth`, `/home`, `/mestre` e `/conversa` chegaram a responder 404 no
  Worker; a allowlist de páginas foi corrigida e o fluxo real passou a abrir.
- Uma falha de stream do provedor foi inicialmente apresentada como erro
  genérico; a classificação segura de falhas foi adicionada sem registrar
  prompts, conteúdo ou secrets. A continuidade real passou depois.
- Um tab desktop antigo conservou navegação em cache até reload completo. A
  navegação ativa foi reduzida às superfícies Gerusa implementadas; após reload
  o desktop mostrou a versão atual.
- Os incidentes anteriores continuam disponíveis no histórico de commits e
  nas evidências operacionais desta missão.

## Autoridade e limites

- Repositório canônico: `https://github.com/NomosLudens/gerusa`, branch
  `master`.
- Runtime web: Cloudflare Worker `gerusa`, publicado em
  `gerusa.nomosludens.ia.br`.
- Runtime de persistência: serviço Gerusa Core na Mini, acessível pelo Worker
  através do hostname Core/Tunnel autenticado; o túnel SSH local foi usado
  somente para diagnóstico PostgreSQL e não é o caminho de produção do Worker.
- PostgreSQL é o banco Gerusa isolado. Totalidade permanece fora do fluxo.
- A adaptação pedagógica validada cobre planejamento, aventura, sessão ao vivo,
  registros de progresso, tarefas/respostas/revisão e próxima aula. Escopos
  adicionais não descritos aqui não são certificados por este gate.

## Evidência de versão

O provisioning e login de alunos foram publicados do SHA
`5c39b2d5b906199e71fa2939427fa382e0a8a3e6`; a recuperação do primeiro Mestre
foi publicada do SHA `c27221d8fb305b157c8978abf4ce5bd64d34109c`. O Worker está
na versão `4f85de0d-c4bb-48be-b570-bb39f73daca1`; a Mini está sincronizada ao
HEAD e serviu o Core após as migrations e o restart. Este registro descreve a
verificação de 2026-10-07; o SHA atual do Core não foi revalidado em 2026-10-08.

## Atualização operacional — 2026-10-08

`GERUSA_PRODUCT_READY_GATE=INCIDENT`. O relatório completo desta execução está
em [docs/GERUSA_PRODUCT_READY_GATE_RELATORIO_2026-10-08.md](GERUSA_PRODUCT_READY_GATE_RELATORIO_2026-10-08.md)
e [na cópia completa do Drive](https://drive.google.com/file/d/1lWU9Qkn8h5vcqZ9KheA-agRq5r0Reml0/view).

- O Worker observado permaneceu em `4f85de0d-c4bb-48be-b570-bb39f73daca1`
  (100%). Home respondeu 200; `/api/profile` e `/api/gerusa/pedagogy` sem
  sessão responderam 401.
- `/api/setup/status` respondeu `available=false`; `/setup` mostrou a
  configuração inicial concluída e não exibiu o formulário. Nenhuma identidade
  foi criada ou alterada.
- Core `/health` respondeu 200 e `/profile` sem segredo respondeu 401. O acesso
  SSH à Mini falhou com `No route to host`; Tailscale estava deslogado e
  reportou falha de validação de certificado. SHA Core e estado das migrations
  não foram lidos nesta execução.
- M1–M3 permanecem alterações locais não publicadas. Typecheck, build, lint dos
  arquivos alterados, `node --check` e `git diff --check` passaram; o bundle
  client não teve correspondências para chave OpenRouter, bearer ou host do
  provider. O fluxo real não foi repetido.
- A revisão M4 não teve duas contas autenticadas. Uma correção de escopo está
  local: rejeitar `studentId` diferente do usuário da sessão e não escolher
  campanha fallback de outra pessoa. Isso não prova isolamento em produção.
- M5 segue FAIL: não existe alvo QA isolado sem Mestre. O `system_master`
  ativo da produção não foi removido, desativado ou alterado.
- Deploy de Worker/Core e migrations foi retido porque a Mini não pode ser
  atualizada neste momento. Publicar apenas o Worker criaria incompatibilidade
  com Core/schema. Nenhum commit, push, migration ou cleanup QA ocorreu.

O PASS histórico de chat e ciclo pedagógico com contas existentes permanece
como evidência parcial; não substitui o primeiro setup, a criação UI de Lucas e
Maria, os ataques cruzados, nem a aceitação final. O gate permanece incidente.

### Retomada após mudança de rede — QA parcial — 2026-10-08

O registro acima descreve a tentativa anterior do dia. Após a mudança de Wi-Fi,
`tailscale status` voltou a mostrar a Mini ativa e `ssh mini` conectou sem
alteração de SSH/TLS/firewall. O relatório atualizado e detalhado está em
[GERUSA_PRODUCT_READY_GATE_RELATORIO_2026-10-08.md](GERUSA_PRODUCT_READY_GATE_RELATORIO_2026-10-08.md).

- Produção: Core ativo, limpo em `dc4bb4d2777af2b7e0bebd0cfc841b49c8662af6`,
  porta 4530; `/health` local/público 200. PostgreSQL `gerusa` consultado em
  `READ ONLY`, migrations até `0007_teacher_recovery`; `0008_username_format`
  e `0009_campaign_context` ausentes. `/api/setup/status` mantém
  `available=false`; nenhuma escrita de QA foi feita em produção.
- Worker: `OPENROUTER_API_KEY` e `OPENROUTER_MODEL` existem como Secrets; seus
  valores não foram lidos. A versão ativa `3f22aa6f-04f9-47e3-8de7-0a8e82d2e2b7`
  decorre de mudança de Secret; source SHA do deployment não foi identificado.
- QA isolada executou `/setup` pela UI até criação, sessão, reload, login e
  bloqueio posterior. Pela UI criou Lucas, João e uma Maria com username
  `mariamaria` por erro de colagem; os fluxos Clockmaker/Red Library, personagens,
  planejamento, aventura, sessão, tarefa e resposta foram persistidos no
  PostgreSQL QA e lidos em `READ ONLY` sem órfãos nas relações verificadas.
- A UI de cada aluno exibiu seu próprio contexto após reload. Testes de ataque
  HTTP autenticados, chat cruzado e notas privadas não foram concluídos.
- `Analisar com Gerusa` falhou com a chave ausente no Wrangler QA. A resposta
  permaneceu salva, sem feedback fabricado, e a UI ofereceu retry. Análise
  OpenRouter real e fidelidade pedagógica continuam sem prova.
- A redefinição de PIN foi acionada na UI, mas login com o PIN novo/antigo não
  foi verificado; desativação/reativação também falta. Mobile do aluno não
  apresentou overflow horizontal em 390 × 844; mobile da professora falta.
- Typecheck, build, ESLint dirigido, `node --check` e `git diff --check`
  passaram. As mudanças seguem locais e sem commit. Nenhuma migration, commit,
  push ou deploy de produto foi feito, pois a aceitação permanece incompleta.
- Um segredo Core impresso acidentalmente em saída anterior foi rotacionado;
  os valores foram omitidos do relatório. A QA temporária ainda estava ativa
  ao registrar esta atualização e deve ser encerrada após preservar evidências.

`GERUSA_PRODUCT_READY_GATE=INCIDENT`. A instrução operacional de 2026-10-08
substitui essa dependência: não pedir sessão à professora real. O bloqueio atual
é a inexistência de mecanismo autorizado de provisionamento QA em produção e de
um Secret disponível no runtime QA; ver a seção de bloqueio abaixo.

#### Cleanup após captura das evidências — 2026-10-08

Wrangler QA foi encerrado; `gerusa-core-qa` e o túnel estão inativos; container
`gerusa_qa_postgres` e volume `gerusa_qa_data` foram removidos. A base QA foi
eliminada (`QA_RESIDUE_DB=0`). Na retomada sob autorização explícita, os arquivos
de segredo locais e remotos foram removidos e a ausência foi verificada. Resta
somente a cópia do código QA `/home/tonyus-dev/gerusa-qa`, sem banco ou
credenciais. `QA_DATA_CLEANUP=PASS`.

#### Bloqueio de provisionamento QA em produção — 2026-10-08

A instrução atual elimina qualquer dependência da sessão do proprietário. A QA
isolada já criou a professora via setup e alunos pela UI, depois teve seus dados
apagados. Em produção, o único criador de `system_master` é
`/setup/initialize`, condicionado à ausência de Mestre ativo; o status observado
é `available=false`. A rota de recovery exige sessão de Mestre existente e não
cria identidade. Não há convite/provisionamento de professora QA no código
atual. Não foi usado SQL, bypass ou conta real. A aceitação em produção e IA
OpenRouter real permanecem bloqueadas até existir um mecanismo autorizado para
provisionar a identidade QA (e, para teste isolado de IA, configurar um Secret
OpenRouter válido no runtime QA). Nenhum deploy foi feito.
