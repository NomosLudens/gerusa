# KALLISTIS — MESA HUB + SESSÃO VIVA + CONTINUITY

Data: 2026-09-13
Checkout autoritativo: `max:/srv/kallistis`
Aplicação: `https://kallistis.app`

## Veredito

O vertical slice P0 está implantado e foi exercitado no fluxo autenticado real do Mestre:

- Mesa Hub com seleção real de Mesa.
- Sessão Viva persistida no PostgreSQL.
- Acontecimento com conteúdo público e nota privada.
- Retenção após reload.
- Revisão, promoção real para a continuidade e publicação somente na Mesa atual.
- Encerramento com resumo e histórico.
- Smoke mobile em 390x844 sem overflow horizontal.
- Artefatos temporários de QA removidos por UUID exato; contagens finais: zero.

Classificação final:

- PRODUTO / FLUXO PRINCIPAL: PASS
- DEPLOY / RUNTIME: PASS
- MIGRATION REAL: PASS
- CONTINUITY BRIDGE: PASS em QA reversível, sem resíduo
- LINT DIRECIONADO: PASS
- LINT COMPLETO: BLOCKED por permissão preexistente em `/srv/kallistis/data/gallery`
- BUILD: PASS; não usado como substituto do smoke manual

## Baseline e autoridade

- SHA inicial confirmado: `80f3b1f2a465c864f7ad98daf04a2d86c75b82b9`
- Branch: `master`
- SHA final de código implantado: 20015fa
- Serviço: `kallistis.service=active`
- `/api/public/health=200`
- `/api/public/ready=200`
- `/=200`
- Banco real: PostgreSQL da aplicação na porta 5433
- `origin/master` confirmado no SHA final
- Checkout remoto limpo após o commit; alterações locais fora do checkout autoritativo foram preservadas

## Implementação

### Mesa Hub

`src/routes/_authenticated/mestre.tsx` mantém a seleção de Mesa no fluxo existente, grava o `mesaId` na URL e monta o novo painel junto das superfícies reais do Mestre.

`src/components/MasterCommandCenter.tsx` apresenta o contexto como Mesa Hub. O painel reutiliza:

- campanha e personagens reais da Mesa;
- mapas e materiais existentes;
- presença operacional;
- mensagens privadas existentes;
- Campaign Continuity existente.

Não foi criado mock, fallback falso, dado de demonstração ou rota paralela.

### Sessão Viva

Arquivos principais:

- `src/components/MesaLiveSessionPanel.tsx`
- `src/routes/api/master/live-session.ts`
- `src/server/local-core/mesa-live-session-repository.ts`
- `src/server/local-core/mesa-live-session-repository.test.ts`

O início pede somente o título por diálogo inline acessível. O título não usa `window.prompt()`, porque o navegador integrado não suporta essa API.

O ledger permite os tipos canônicos existentes:

`NPC`, `LOCAL`, `OBJETO`, `PISTA`, `EVENTO`, `DIARIO`, `IMAGEM`.

Registrar um acontecimento não altera automaticamente a continuidade. O Mestre pode revisar título, tipo, conteúdo público e notas privadas antes de encerrar.
O campo summary também pode ser salvo durante a sessão pela ação update_summary. O painel Registro vivo permite escrever por etapas e confirma Salvo no PostgreSQL.
Ao encerrar, o mesmo texto é preservado no histórico como um cartão próprio Resumo da sessão, separado da lista de acontecimentos.

### Modelo e migration

Migration aplicada:

`db/migrations/0044_mesa_live_sessions.sql`

Tabelas:

- `public.mesa_live_sessions`
- `public.mesa_live_session_events`

A regra de uma única sessão `live` por Mesa é garantida pelo índice parcial:

`mesa_live_sessions_one_live_per_mesa_idx`

Proveniência verificada no banco:

`0044 | 0044_mesa_live_sessions.sql | APPLIED_IN_THIS_RUN`

O evento mantém a referência opcional `promoted_entry_id` para a entrada canônica existente. Não foi criada tabela genérica `sessions`.

### Autorização

A consulta de autorização exige:

- `system_master`; ou
- associação ativa com `member_role='mestre'` na Mesa solicitada.

A publicação da continuidade continua passando por `/api/campaign-continuity`. O caminho de promoção no painel usa a API canônica existente e publica somente com o `mesaId` atual. O normal Mestre não recebe controle de promoção global.

## Evidência manual real

Navegador autenticado, rota `/mestre`:

1. Geek Wizards carregou dados reais: campanha `Campanha A`, jogadores/personagens, rail de presença e superfícies existentes.
2. Taverna dos Pandas carregou contexto real distinto: campanha `Campanha Taverna dos Pandas`, 9 jogadores e 4 personagens.
3. A alternância Taverna → Geek atualizou o painel e não carregou sessão ou dados narrativos da Mesa errada.
4. Foi criada a sessão temporária `QA reversível Mesa Hub` em Geek Wizards.
5. O título ficou visível como sessão em andamento e sobreviveu ao reload.
6. Foi registrado `EVENTO · QA — acontecimento reversível`.
7. O conteúdo público apareceu no ledger; a nota privada não apareceu na visualização do painel.
8. O reload manteve a sessão e o acontecimento persistidos.
9. A revisão exibiu edição dos campos, checkbox `Revelar para Geek Wizards` e o controle de promoção.
10. A promoção real criou a entrada canônica `PLAYED_CONFIRMED` e uma publicação `revealed` somente para o UUID de Geek Wizards.
11. O encerramento persistiu o resumo e moveu a sessão para `Sessões recentes`.
12. Após a prova, a entrada canônica e a sessão de QA foram apagadas pelos UUIDs exatos. Verificação final: `0` entradas e `0` sessões com aqueles IDs.

### Resumo incremental

A prova real escreveu o resumo durante a sessão, confirmou o indicador Salvo no PostgreSQL, recarregou a página, editou o texto no fechamento e abriu o cartão Resumo da sessão no histórico.
A sessão de QA resumo vivo foi encerrada e removida pelo UUID exato após a verificação.

### Smoke mobile

Viewport explícito: 390x844; viewport efetivo reportado pelo navegador: 375x844.

- Mesa Hub visível.
- Estado vazio real após limpeza.
- Botão `Iniciar sessão` visível.
- `scrollWidth=375`, `clientWidth=375`.
- Overflow horizontal: não.

O viewport foi restaurado ao padrão ao final.

## Incidentes encontrados e corrigidos durante a prova

1. O primeiro clique revelou `prompt() is not supported` no navegador integrado. Foi substituído por diálogo inline real, sem alterar o contrato de persistência.
2. O primeiro registro revelou que os placeholders SQL de título e tipo estavam invertidos. A ordem foi corrigida e o teste passou a verificar os parâmetros efetivos.

Esses incidentes foram tratados antes do veredito; não foram mascarados como sucesso.

## Validação técnica

- Teste direcionado do repositório: 7/7.
- Suíte completa: 74 arquivos, 487 testes aprovados.
- `bun run typecheck`: PASS.
- `bun run build`: PASS, incluindo o bundle usado no último restart.
- ESLint direcionado nos arquivos afetados: PASS, sem saída.
- `git diff --check`: PASS.
- Lint completo: BLOCKED por `EACCES: permission denied, scandir '/srv/kallistis/data/gallery'`; não é um erro introduzido pelo slice e não foi contornado alterando permissões.

## Deploy e Git

Commits do trabalho:

- `14e0a11d` — primeira implementação do Mesa Hub + Sessão Viva.
- `c84d34d` — substituição de `window.prompt()` por diálogo inline.
- `e5545d8` — correção da ordem dos campos do evento e asserção de regressão.
- 20015fa — resumo vivo incremental e cobertura.

O commit final foi reiniciado no serviço ativo e enviado a `origin/master` sem force-push. O estado final do checkout remoto ficou limpo.

## Limites preservados

- Sem IA ou `setTimeout` simulando persistência.
- Sem backfill ou mutação automática da continuidade.
- Sem exposição de notas privadas ao jogador.
- Sem publicação cruzada para outra Mesa.
- Sem resíduo de dados temporários de QA.
