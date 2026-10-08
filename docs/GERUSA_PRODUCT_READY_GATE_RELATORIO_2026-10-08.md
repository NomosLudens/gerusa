# GERUSA — Relatório do GERUSA_PRODUCT_READY_GATE

**Data:** 2026-10-08 (America/Sao_Paulo)  
**Veredito final:** `GERUSA_PRODUCT_READY_PASS`
**Produção:** https://gerusa.nomosludens.ia.br/  
**Escopo:** fechamento do mesmo gate, missões 1–5; sem criar gate adicional.

## Fechamento final — aceitação de produção

Esta seção é o estado final e prevalece sobre os registros históricos abaixo,
que descrevem incidentes e evidências parciais anteriores à publicação.

### Auditoria somente leitura de 2026-10-08

Antes das atualizações documentais desta missão, `master` e `origin/master`
coincidiam em `ef1e768`; o worktree estava limpo e não havia tags locais ou
remotas. A baseline estável foi registrada depois na release GitHub
[`v1.0.0`](https://github.com/NomosLudens/gerusa/releases/tag/v1.0.0), apontada
para o commit documental `5278bd1`; a tag tem regras ativas contra atualização
e exclusão. A branch `master` foi congelada por ruleset ativo sem bypass.
Commits posteriores na branch antes do congelamento alteraram apenas
documentação. O Core estava ativo na Mini, com SHA `101a0930`, e `/health` local e
público respondiam `200`. O Worker ativo a 100% era
`37cdac3d-16a6-4e5f-ab4e-323e84aa297e`. O ledger PostgreSQL continha migrations
`0001_initial` a `0009_campaign_context`. O Wrangler confirmou os nomes dos
Secrets `GERUSA_CORE_SECRET`, `GERUSA_CORE_URL`, `OPENROUTER_API_KEY` e
`OPENROUTER_MODEL`; nenhum valor foi lido. O modelo foi confirmado pelas
evidências de runtime da aceitação acima. Esta auditoria não alterou produção.

- **Código e publicação:** a aplicação publicada inclui até
  `8f6ccb0f575b0635951513d9087683dcab148608`; os commits posteriores no repositório
  atualizam apenas o relatório e o mapa deste fechamento. O Core da Mini está
  ativo e serve `101a0930cf64b9067e025970c2a95e6807d93e02`; os commits seguintes
  até a versão publicada do Worker só alteram a seleção de campanha na UI. O Worker a 100% é
  `37cdac3d-16a6-4e5f-ab4e-323e84aa297e`, com a correção de seleção por aluno.
  `/health` local e público respondeu `200`; a rota protegida sem sessão
  respondeu `401`.
- **Banco:** migrations `0008_username_format` e `0009_campaign_context`
  constam no ledger de produção. Antes da limpeza, consulta `READ ONLY`
  confirmou os dois alunos QA, memberships, 2 campanhas, 6 personagens, 2
  aventuras, 2 aulas, 2 sessões e tarefas vinculadas; a tarefa de Lucas estava
  `reviewed` com o feedback editado pela professora.
- **Contas e administração:** professora QA autenticada pelo login normal do
  Worker; Lucas e Maria foram criados pela UI Mestre e autenticados pelos seus
  próprios logins/PINs. Reset de PIN e desativação/reativação foram exercitados
  pela UI. Username simples, sugestão normalizada e duplicidade foram
  verificados. A professora real não foi modificada. `/api/setup/status`
  continuou `available=false`, como esperado porque já existe Mestre em
  produção; o setup inicial foi testado na QA isolada.
- **Campanha e ciclo pedagógico:** Lucas/Elias Ward/The Clockmaker's Paradox e
  Maria/Nora Vale/The Red Library foram criados e vinculados pela interface a
  aventuras, planejamento, sessões, tarefas e submissions. Após a correção
  publicada, alternar de Lucas para Maria atualizou a campanha para Red Library
  e a personagem para Nora Vale.
- **IA real:** a professora acionou “Analisar com Gerusa” em produção. A análise
  estruturada detectou erros gramaticais e a ausência do relojoeiro na
  narrativa. O log do Worker registrou sucesso de `review_submission` com
  modelo pedido e retornado
  `nvidia/nemotron-3-ultra-550b-a55b:free`. A professora editou o feedback,
  salvou a correção e, após reload, a UI e o PostgreSQL mantiveram feedback e
  status `reviewed`. A submissão original permaneceu intacta.
- **Próxima aula com histórico:** em uma sessão QA adicional, a professora
  criou pela UI uma campanha, salvou uma aula concluída com objetivo e alvos de
  idioma, e acionou “Sugerir próxima aula com histórico”. A proposta editável
  retomou o mistério da estação e o vocabulário anterior, avançando de Past
  Simple para Past Continuous. A ação não publicou nem salvou a proposta sem
  decisão da professora; não ocorreram `pageerror`.
- **Isolamento:** sessões normais separadas para Lucas e Maria. Cada aluno
  recebeu seu próprio contexto; tentativas bilaterais de ler o outro perfil e
  mutar tarefa alheia retornaram `404`, sem título/nome do outro no payload.
  Acesso cruzado a thread foi negado com `404`; POST cruzado de chat terminou
  em `503 chat_unavailable`, sem contexto ou dado cruzado. Nota exclusiva da
  professora não apareceu no perfil, payload pedagógico nem UI do aluno.
- **Desktop, mobile e segredo:** fluxos críticos foram exercitados no browser
  automatizado. Em viewport móvel de 390 px, telas de aluno e professora
  ficaram sem overflow horizontal; os fluxos observados terminaram sem
  `pageerror`. O bundle não contém chave/host OpenRouter ou segredo Core e o
  browser não chamou o provider diretamente.
- **Limpeza:** em duas transações delimitadas por IDs, as sessões e registros QA
  foram revogados/removidos, as Mesas QA e recursos foram excluídos e 9
  identidades descartáveis (professoras e alunos das duas rodadas) removidas.
  Na rodada principal, usuários `10 → 3`; na rodada final, `5 → 3`. Verificação
  final: QA user IDs `0`, Mesas QA `0`, recursos e sessões QA `0`,
  `system_master` `1 → 1`. Arquivos temporários de credenciais/PIN e o backup
  temporário que continha QA foram removidos. O backup anterior à campanha de
  QA foi preservado.
- **Verificações de código:** typecheck, build, lint dirigido, sintaxe dos
  módulos Core e `git diff --check` passaram. A suíte histórica completa teve
  599 aprovados e 9 falhas não relacionadas, em contratos KALLISTIS obsoletos/
  arquivos ausentes; não foram ocultadas nem alteradas para certificar Gerusa.

**Veredito:** `GERUSA_PRODUCT_READY_PASS`. A prova é dos fluxos de produção
executados por identidades QA descartáveis e das consultas de persistência; não
depende da sessão do proprietário. As identidades e os dados QA foram removidos
após a coleta das evidências.

## Registro histórico — estado antes da correção e publicação

O texto desta seção e das seções históricas subsequentes registra o diagnóstico
anterior e não representa o estado final documentado acima.

### Decisão naquele momento

Não houve commit, push, migration nem deploy de produto. A QA real passou por
setup, provisionamento, fluxo de campanha/sessão/tarefa e persistência PostgreSQL,
mas não completou análise OpenRouter real, ataques autenticados cruzados, a
gestão de PIN/desativação após reset, nem a aceitação com a professora de
produção. O Core e o PostgreSQL de produção estão acessíveis, porém a sessão
aberta no browser é anônima e existe um `system_master`; `/setup` está fechado.
Publicar agora deixaria alterações não aceitas e migrations ainda ausentes no
banco de produção.

## Estado de produção observado

- A recuperação de rede funcionou: `tailscale status` mostra Mini ativa e
  `ssh mini` conecta. Não foi necessário alterar SSH, firewall ou Docker.
- Gerusa Core na Mini: serviço de usuário `gerusa-core.service` ativo,
  `127.0.0.1:4530`, árvore limpa em
  `dc4bb4d2777af2b7e0bebd0cfc841b49c8662af6`; `/health` local e público
  responderam `200 {"status":"ok"}`.
- PostgreSQL de produção `gerusa`, consulta `READ ONLY`: migrations aplicadas
  até `0007_teacher_recovery`. Os nomes iniciais `0007_username_format` e
  `0008_campaign_context` não estão aplicados; como 0007 já está ocupado, os
  arquivos finais foram reconciliados como `0008_username_format` e
  `0009_campaign_context`, também ainda pendentes na produção.
- Home pública abre. `/api/setup/status` retorna `{"available":false}`;
  `/api/profile`, `/api/gerusa/pedagogy` e Core `/profile` sem sessão/segredo
  retornam `401`. Isso confirma proteção anônima, não o fluxo Worker → Core →
  PostgreSQL autenticado.
- Wrangler lista `OPENROUTER_API_KEY` e `OPENROUTER_MODEL` como Secrets no
  Worker. Os valores não são legíveis por listagem; o modelo configurado não
  foi comprovado por uma chamada real.
- A implantação Worker ativa mais recente é
  `3f22aa6f-04f9-47e3-8de7-0a8e82d2e2b7`, gerada por mudança de Secret. O
  deployment de código anterior observado é
  `4f85de0d-c4bb-48be-b570-bb39f73daca1`; Wrangler informa `Source: Unknown`,
  portanto não há prova de SHA do código publicado.
- Não foram criados usuários, campanhas ou tarefas de QA em produção; nenhuma
  linha de produção foi escrita ou apagada. O browser de produção continua
  anônimo, sem login da professora.

## QA real executada

O ambiente descartável usou o mesmo worktree/código que está sob avaliação:

```text
Browser → Wrangler Worker local (127.0.0.1:8787)
        → Gerusa Core QA (127.0.0.1:4531, via Quick Tunnel temporário)
        → PostgreSQL QA isolado (gerusa_qa_postgres, porta local 55432)
```

Não foi usado mock, SQLite, banco em memória ou Supabase. As migrations QA
foram aplicadas até `0008_campaign_context` com os nomes iniciais; essa base foi
destruída. Os arquivos finais foram renumerados para `0008_username_format` e
`0009_campaign_context`, sem registros QA antigos a reconciliar. Esse túnel foi
usado somente para o ambiente QA; ele não comprova o caminho de produção.

### Setup e identidade

- `/setup` no PostgreSQL QA vazio mostrou setup disponível. A professora QA
  foi criada pela interface; o banco registrou user, profile, role
  `system_master`, credencial scrypt, mesa/membership e sessão.
- Login pela UI, reload mantendo a sessão, logout/login novamente e bloqueio
  posterior do setup foram observados. `FIRST_TEACHER_SETUP=PASS` e
  `SETUP_LOCK_AFTER_MASTER=PASS` em QA.
- A UI criou Lucas Almeida (`lucas`) e João da Silva (`joao`). O login inicial
  dos alunos com PIN funcionou; João confirmou sugestão sem acento. Username
  duplicado `lucas` exibiu erro amigável e não deixou perfil parcial.
- A segunda conta exibida como Maria Santos foi criada com username
  `mariamaria`: a ação de colar anexou o texto ao valor sugerido `maria`. Ela
  autenticou e foi usada no fluxo Red Library. O username canônico `maria` não
  ficou provado nesta execução. Nenhum registro SQL foi alterado para mascarar
  esse desvio.
- Redefinir PIN de Lucas pela UI exibiu um novo PIN de uso único. A verificação
  subsequente de PIN antigo recusado e PIN novo aceito não foi concluída: o
  browser de QA parou de inserir texto nos campos de autenticação após o
  reset. O teste de desativar/reativar aluno também não foi concluído.

### Campanhas e ciclo pedagógico

- Pela UI da professora foram criadas as campanhas `The Clockmaker's Paradox`
  e `The Red Library`, com personagens `Elias Ward` e `Nora Vale`.
- Em cada contexto foram salvos planejamento, aventura, sessão encerrada e
  resumo/continuidade. Pela UI também foram criadas e publicadas as tarefas
  `Diário da Estação` e `Letter from the Library`; cada aluno enviou sua
  resposta pela própria interface.
- Reload da aluna Maria preservou conta, campanha Red Library, personagem,
  aventura, sessão e tarefa submetida. A leitura de Lucas mostrou sua própria
  campanha Clockmaker, Elias, The Empty Station e tarefa. A UI de estudante
  não mostrou a jornada do outro aluno.
- SQL em transação `READ ONLY` confirmou users/profiles distintos, credenciais
  scrypt, memberships ativas, duas campanhas, personagens, lessons,
  adventures, sessões `closed` e assignments `submitted`. Verificações de
  vínculo de campaign/mesa/aluno e session/lesson/assignment retornaram zero
  órfãos nos casos consultados.
- Uma observação/progresso de Lucas foi persistida. Nenhuma observação privada
  foi criada; a superfície de notas privadas não foi testada. A resposta da
  próxima aula não foi testada.

### Análise com Gerusa e isolamento

- A submission de Lucas continha erro de Past Simple, apenas quatro frases e
  um requisito narrativo incompleto. A ação `Analisar com Gerusa` foi acionada
  pela UI. O provider não estava configurado no Wrangler QA; a interface mostrou
  falha segura e botão `Tentar novamente`. A resposta permaneceu salva e não
  surgiu feedback fictício. Não houve análise real, edição, correção salva ou
  status `reviewed`.
- O teste visual autenticado e após reload mostrou os dados de Lucas e Maria
  separados. O código Core rejeita `studentId` diferente do usuário autenticado
  com 404 e consulta dados do aluno pelo ID autenticado. A tentativa HTTP
  adulterada com UUID pelo browser não foi concluída nesta execução, então
  `LUCAS_TO_MARIA_ISOLATION` e `MARIA_TO_LUCAS_ISOLATION` permanecem parciais,
  não PASS.
- Isolamento de chat/memória e nota privada da professora não foram testados.
  A leitura SQL não encontrou nota privada nos perfis de teste.

### Browser e segurança

- A UI QA foi exercitada em desktop. Em viewport de 390 × 844, a jornada da
  aluna coube na largura do documento sem overflow horizontal. Mobile da
  professora e do fluxo de submissão não foi completado.
- Os logs do browser QA e da home pública de produção retornaram zero entradas
  `error`/`warn` nas telas observadas. Isso não certifica page errors em fluxos
  não executados.
- A busca no bundle `dist/client` não encontrou host OpenRouter, nome da chave,
  padrão `sk-or-v1-`, segredo Core ou bearer. Não foi observada chamada direta
  do browser ao provider.
- Um valor anterior de `GERUSA_CORE_SECRET` apareceu acidentalmente em saída de
  terminal numa execução anterior e foi rotacionado. A implantação por mudança
  de Secret acima e o Core saudável foram confirmados depois; nenhum valor de
  segredo é reproduzido neste relatório.

### Cleanup QA

- Wrangler local foi encerrado. Os serviços temporários `gerusa-core-qa` e
  `gerusa-core-qa-tunnel` estão inativos; container `gerusa_qa_postgres` e
  volume `gerusa_qa_data` foram removidos. Os dados PostgreSQL QA foram
  destruídos (`QA_RESIDUE_DB=0`).
- Nesta retomada foram removidos os arquivos de segredo QA locais
  `/dev/shm/gerusa-qa-session/dev.vars` e, na Mini,
  `/home/tonyus-dev/.config/gerusa-qa/{core.env,postgres.env}`. A verificação
  confirmou zero desses arquivos e o diretório remoto de segredos ausente.
  Resta uma cópia de código em `/home/tonyus-dev/gerusa-qa`; ela não contém
  banco nem credenciais e foi preservada. `QA_DATA_CLEANUP=PASS`.

## Git e validações técnicas

- `HEAD` e `origin/master`: `dc4bb4d2777af2b7e0bebd0cfc841b49c8662af6`.
- Continuam no worktree, sem commit: alterações de M1–M4, migrations
  `0008_username_format.sql` e `0009_campaign_context.sql`, painel de campanhas
  e este relatório/mapa. Nenhuma alteração de código foi feita nesta retomada.
- `bun run typecheck`: PASS. `bun run build`: PASS, com avisos existentes de
  `vite-tsconfig-paths` e code-splitting TanStack. ESLint dirigido aos arquivos
  alterados, `node --check` dos módulos Core e `git diff --check`: PASS.
- O Core de produção ainda serve o SHA base `dc4bb4d...`; o Worker ativo tem
  versão identificável, mas source SHA desconhecido. As alterações locais e
  migrations pendentes não foram publicadas.

## Matriz do gate

| Critério | Estado factual |
| --- | --- |
| First teacher setup / setup lock | `PASS` em QA isolada |
| Teacher login / reload | `PASS` em QA isolada |
| Provisionamento e username `lucas`, `joao`; duplicado | `PASS` em QA; sugestão `maria` não provada |
| Maria username canônico | `FAIL` no teste executado (`mariamaria`) |
| Login inicial por PIN | `PASS` em QA antes do reset |
| Reset PIN; PIN antigo/new login | `PARTIAL`; reset exibido, autenticação após reset não verificada |
| Disable/restore | `NOT_TESTED` |
| Campanha / personagem / planejamento / aventura / sessão / tarefa / submission | `PASS` em QA UI + leitura PostgreSQL |
| AI planning / AI review real / fidelidade pedagógica | `NOT_PROVEN`; provider QA ausente; falha segura comprovada |
| Progresso e próxima aula baseada no ciclo | `PARTIAL`; progresso persistiu, próxima aula não testada |
| Isolamento visual dos dois alunos após reload | `PASS` em QA |
| Ataques cruzados autenticados, chat e notas privadas | `NOT_PROVEN` |
| Mobile aluno | `PASS` somente para largura/overflow da jornada |
| Mobile professora / fluxo pedagógico completo | `NOT_TESTED` |
| Console nas telas observadas | `0 error/warn`; não cobre fluxos ausentes |
| OpenRouter direto no client / segredo no bundle | `NO` pela busca estática; chamada provider real não feita |
| PostgreSQL QA / relações consultadas | `PASS` para os registros criados; consulta `READ ONLY` |
| PostgreSQL produção / migrations | `PASS` leitura; migrations 0008 e 0009 ausentes |
| QA cleanup / QA residue | `PARTIAL`; processos e DB removidos, arquivos temporários ainda existem |
| GitHub/runtime coherence / map in Drive | `FAIL`/pendente; sem publicação coerente |
| `GERUSA_PRODUCT_READY_GATE` | `INCIDENT` |

## Retomada após instrução de QA autônoma — 2026-10-08

Não foi solicitada nem usada a sessão do proprietário. A criação de contas QA
foi expressamente autorizada e já ocorreu na QA isolada: o primeiro
`system_master` foi criado pela UI de setup e os alunos de QA foram criados pela
UI da professora. A base QA foi removida após a coleta das evidências.

O bloqueio de produção é uma lacuna verificável no mecanismo de autorização,
não a disponibilidade do navegador do proprietário:

- O único fluxo no código que cria `system_master` é
  `POST /setup/initialize`. Ele requer que não exista nenhum Mestre ativo e
  retorna `409 setup_closed` quando existe; a produção confirmou
  `available=false`.
- `POST /api/admin/recovery-code` não provisiona uma identidade; exige uma
  sessão autenticada de `system_master` existente. A recuperação de conta
  também exige o código de recuperação de uso único associado à credencial.
- Não existe rota de convite/provisionamento de professor ou mecanismo
  operacional documentado para criar uma identidade `system_master` QA em
  produção. Criá-la por SQL, adicionar bypass ou reutilizar/alterar a professora
  real violaria as restrições deste gate e não foi feito.
- A chave OpenRouter está cadastrada como Secret no Worker de produção, mas o
  valor não é recuperável pela listagem e não existe chave QA disponível no
  runtime isolado. Nenhuma tentativa de extrair ou reutilizar o Secret de
  produção foi feita.

Assim, a operação exata que falta é provisionar uma identidade administrativa
descartável de produção por um mecanismo autorizado já existente ou aprovado.
Esse mecanismo não está presente no código/ambiente inspecionados. Para análise
IA isolada, também é necessário que o runtime QA receba um Secret OpenRouter
válido por meio autorizado. Sem esses dois meios, não há autenticação ou
conectividade IA real para os testes restantes. Isso não pede login na conta
real e não autoriza contornar autenticação.

O gate permanece `GERUSA_PRODUCT_READY_INCIDENT`. Nenhuma migration, Core ou
Worker foi publicada; nenhuma alteração versionada foi commitada. As evidências
QA anteriores continuam válidas apenas para os fluxos explicitamente marcados
como PASS; IA real, ataques cruzados HTTP, isolamento de chat/notas privadas,
PIN pós-reset/desativação e aceitação autenticada em produção permanecem sem
prova.
