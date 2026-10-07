# GERUSA — Mapa de percurso canônico

**Atualizado em:** 2026-10-07  
**Missão:** adaptação multiusuário de KALLISTIS para Gerusa  
**Resultado da validação em produção:** `GERUSA_KALLISTIS_ADAPTATION_PASS`

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
- Esta missão encerra na identidade, memberships, isolamento e chat. Tarefas,
  aventuras estruturadas, planejamento e planilha pedagógica continuam fora de
  escopo e não foram iniciados.

## Evidência de versão

O código multiusuário e a validação funcional foram executados com o checkout
sincronizado a `origin/master` antes deste registro. O commit deste documento
e o deploy final correspondente devem ser consultados no histórico Git e no
registro de deployments do Worker; a igualdade entre `master` e o runtime foi
reconfirmada após publicar este mapa.
