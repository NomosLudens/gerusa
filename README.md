# GERUSA POULAIN

**Plataforma de ensino de inglês por RPG, com campanhas narrativas persistentes e assistência pedagógica por inteligência artificial.**

Gerusa une aprendizagem de inglês e narrativa interativa. A professora conduz a
experiência, acompanha cada aluno e usa a persona da Gerusa para planejar aulas,
criar aventuras e apoiar a revisão de atividades. O Gate de Produto 1.0 foi
aceito em produção em 8 de outubro de 2026.

## Como funciona

O produto tem duas experiências ligadas pelo mesmo contexto pedagógico:

- **Mestre / Professora:** cria alunos pela interface, organiza campanhas,
  personagens e aventuras, planeja aulas e sessões, publica tarefas e revisa
  submissions. As sugestões da IA são editáveis; a professora decide o que
  salvar e compartilhar.
- **Aluno:** entra com username e PIN, acompanha a própria campanha,
  personagem, aventura, aulas e tarefas, envia respostas e conversa com a
  Gerusa dentro do seu contexto.

A campanha e a história dão contexto às atividades. A professora acompanha o
progresso do aluno e pode pedir uma sugestão de próxima aula baseada no
histórico. O acesso de cada aluno é isolado no servidor.

## Recursos entregues

- Autenticação Mestre/Aluno com sessões protegidas, username e PIN.
- Cadastro e gestão de alunos pela professora, com acesso individual por username e PIN.
- Cadastro público de professoras, cada uma com conta e Mesa próprias.
- Convites de uso único para estudantes criarem conta e entrarem na Mesa da professora.
- Contas individuais para professoras, sempre limitadas às Mesas a que têm vínculo.
- Campanhas persistentes, personagens, aventuras, aulas e sessões vinculadas.
- Tarefas, submissions, feedback e progresso pedagógico.
- Planejamento assistido por IA, sugestão de próxima aula e análise estruturada
  de atividade, incluindo gramática, vocabulário e fidelidade narrativa.
- Isolamento entre alunos aplicado nas rotas autenticadas do servidor.
- Interface adaptável para desktop e mobile.

A IA sugere e explica. A professora mantém a decisão final sobre planejamento e
feedback.

## Arquitetura de produção

```text
Browser
  → Cloudflare Worker Gerusa
  → Gerusa Core na Mini
  → PostgreSQL (database `gerusa`)
```

- O Worker atende `https://gerusa.nomosludens.ia.br/`, mantém a fronteira
  server-side da aplicação e encaminha operações autenticadas ao Core.
- O Gerusa Core é um serviço Node.js na Mini, disponível localmente em
  `127.0.0.1:4530`. O browser não se conecta diretamente ao Core ou ao
  PostgreSQL.
- A persistência usa o schema `gerusa` no PostgreSQL, incluindo users, profiles,
  credentials, sessions, mesas, memberships, campaigns e recursos pedagógicos.
- As chamadas OpenRouter são feitas pelo Worker. A chave fica em Secret
  server-side e não deve ser incluída no client, no repositório ou em artefatos
  públicos.
- O modelo gratuito validado no aceite 1.0 foi
  `nvidia/nemotron-3-ultra-550b-a55b:free`.

O primeiro setup cria o Mestre inicial uma única vez. Com um Mestre ativo, o
setup permanece fechado; a criação e gestão de alunos acontecem pela interface
da professora.

## Tecnologias

- TypeScript, React 19 e TanStack Start / Router.
- Vite e Bun para desenvolvimento e build.
- Cloudflare Workers com Wrangler para o runtime web.
- Node.js para o serviço Gerusa Core.
- PostgreSQL para identidade, campanhas e persistência pedagógica.
- OpenRouter para modelos de linguagem no lado servidor.
- Vitest e Playwright para testes automatizados.

## Desenvolvimento local

Requer Bun compatível com `packageManager` no `package.json`.

```bash
bun install --frozen-lockfile
bun run dev
```

Comandos de validação disponíveis:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run test:e2e
```

Esses comandos verificam o checkout local. Eles não substituem uma verificação
do runtime, da persistência e das autorizações no ambiente publicado. Não use
credenciais de produção em ambiente local; configure segredos apenas pelo
mecanismo seguro do runtime correspondente.

## Documentação e evidências

- [Gerusa Core: contrato e operações](./docs/GERUSA_CORE.md)
- [Mapa canônico de percurso e arquitetura](./docs/GERUSA_MAPA_DE_PERCURSO_CANONICO.md)
- [Relatório de aceitação GERUSA_PRODUCT_READY_GATE](./docs/GERUSA_PRODUCT_READY_GATE_RELATORIO_2026-10-08.md)

O relatório registra o aceite 1.0, as versões de aplicação e runtime observadas,
e a limpeza das identidades QA. Seu histórico preserva estados anteriores como
evidência datada; consulte a seção de fechamento final para o estado aceito.

## Versão estável

**GERUSA 1.0 — aceite de produto:** `GERUSA_PRODUCT_READY_PASS`

**Release estável:** [v1.0.0](https://github.com/NomosLudens/gerusa/releases/tag/v1.0.0)

**Aplicação publicada:** `8f6ccb0`

**Worker:** `37cdac3d-16a6-4e5f-ab4e-323e84aa297e`

O Gate de Produto 1.0 foi encerrado. Mudanças posteriores devem partir de uma
nova solicitação e preservar esta baseline, o contrato de autenticação e a
arquitetura publicada. No GitHub, a referência da release `v1.0.0` é protegida
contra atualização e exclusão; a branch `master` está congelada enquanto este
marco está em vigor. Alterações futuras exigem uma solicitação explícita e a
revisão da regra de congelamento.

---

**Nomos Ludens — Technology for human agency.**

**Empower, not replace.**
