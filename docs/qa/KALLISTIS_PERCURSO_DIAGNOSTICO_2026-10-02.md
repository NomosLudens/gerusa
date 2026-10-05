# KALLISTIS — percurso de diagnóstico e publicação

**Data:** 2026-10-02
**Missão:** corrigir os achados da varredura de diagnóstico, revisar UX dos microapps, validar o checkout e publicar no Worker autorizado.
**Checkout:** `/home/tonyus-dev/Portifolio/KALLISTIS_RECOVERY/kallistis-clean`
**Base:** `77feca63e6bd9b3790d7388df20320e539640c46`
**Commits de código publicados:** `d1b5701cfca6e3330de22f6a6f2df03404848d3c` (correções de diagnóstico), `4eeca7fd95e34ffc6da42696cb613933330cde70` e `5779e195dc54dd0e40a4ed6226ae22ac5ee4a896` (UX responsiva).
**Worker:** `kallistis-recovery` — versão `ace474f0-7e2c-46cb-a2a3-6a3825d7ab45`, 100% do tráfego.
**Supabase:** `gidsdflkjuaoxhejudna`; migração `20261002122830_harden_runtime_function_search_paths` aplicada.

## Resultado

**PARTIAL.** As correções de código e de `search_path` foram publicadas. Build, typecheck e 609 testes passaram; lint terminou sem erros, com 32 avisos preexistentes. A revalidação autenticada de jogador passou nas rotas acessíveis; o smoke público e a configuração Free do Supabase também foram conferidos. A revisão de UX encontrou e corrigiu dois problemas responsivos no Forge: a barra superior cobria as abas e, em largura de celular, as abas geravam uma barra horizontal visível. Os dois pontos passaram no reteste visual em produção. A proteção contra senhas vazadas permanece desligada conforme o plano Free. O custo e o uso atual do Workers na conta Cloudflare não puderam ser confirmados sem autenticação no painel Cloudflare.

## Achados e mudanças

### Mapas e acesso

- A rota `/mapas` carregava uma superfície embutida que exige permissão de Mestre; para jogador, a resposta era JSON 403 dentro do iframe e a tela parecia vazia.
- A API agora exige Mestre da Mesa correspondente quando `mesaId` é enviado e retorna uma página HTML explicativa para quem não tem permissão, com link para voltar ao início.
- O conteúdo do mapa continua protegido. Não foi aberto o HTML do Mestre a jogadores, pois ele inclui dados privados no próprio documento.
- **Validação:** typecheck e build passaram; no smoke público, `/api/master/surface/mapa` sem sessão respondeu 401. No smoke autenticado pós-deploy, a rota `/mapas` exibiu dentro do iframe o título “Atlas disponível para Mestres”, a explicação de restrição à equipe de Mestre e o link “Voltar ao início”. A tela ficou legível e não houve erros de console. A sessão foi identificada pelo usuário como jogador.

### Recuperação canônica no chat

- A leitura repetida da fonte e o cálculo de termos eram feitos de novo em chamadas repetidas da mesma pergunta.
- O carregamento da fonte local imutável passou a ser reaproveitado; termos e resultados de perguntas recentes ficam em cache limitado e invalidado pelo hash da fonte.
- O teste que expirava ao recuperar LOCK em pergunta longa passou a passar isoladamente; a suíte completa também passou.
- O saneamento de NUL em contexto usa `replaceAll` com o caractere gerado pelo runtime, removendo o erro `no-control-regex` do lint sem deixar de filtrar o dado.

### Supabase e segurança

- Migração incremental aplicada: `20261002122830_harden_runtime_function_search_paths`.
- `approve_memory_candidate_atomic`, `confirm_sediment_atomic`, `promote_sediment_batch_atomic` e `prevent_character_event_mutation` agora têm `search_path=public, pg_temp`.
- Readback via catálogo confirmou a configuração nos quatro procedimentos. `anon` e `authenticated` continuam sem permissão de execução nos três procedimentos de memória; o trigger permanece executável apenas pelas regras normais de trigger.
- O advisor de segurança deixou de listar `function_search_path_mutable`.
- **RLS:** não foi habilitado em massa. A verificação anterior confirmou RLS desligado nas tabelas públicas, porém zero privilégios efetivos de tabela para `anon` e `authenticated`. Habilitar RLS sem políticas compatíveis arriscaria bloquear as rotas operadas pelo servidor.
- **PENDENTE:** `auth_leaked_password_protection` continua desativado. No painel autenticado, a organização aparece no plano Free. O Supabase rejeitou o salvamento da opção com a mensagem: `Configuring leaked password protection via HaveIBeenPwned.org is available on Pro Plans and up.` A alteração não salva foi descartada; nenhum upgrade ou cobrança foi feito. Referência: [Proteção de senhas do Supabase Auth](https://supabase.com/docs/guides/auth/password-security).

## Verificação

| Verificação | Resultado |
|---|---|
| `bun run test -- --reporter=dot` | **PASS** — 90 arquivos, 609 testes |
| Teste canônico isolado | **PASS** — 9 testes |
| `bun run typecheck` | **PASS** |
| `bun run lint` | **PASS** — 0 erros, 32 avisos |
| `bun run build` | **PASS** — avisos existentes do Vite sobre plugin/arquivos de teste em `src/routes` |
| `bun run check:local-migrations` | **PASS** — SQL_STATIC_CHECK; parser local não executado por falta de `psql` |
| Migração no projeto Supabase | **PASS** — aplicada; readback da configuração confirmado |
| `git diff --check` | **PASS** |
| `bun run deploy:kallistis` | **PASS** — guard Recovery confirmou repo, Worker, Supabase, Hyperdrive e R2 |

### Smoke público pós-deploy

- `https://kallistis.app/api/public/health` → **200**, `status=ok`.
- `https://kallistis.app/api/public/ready` → **200**, `status=ready` (confirma banco e schema; a resposta pública não divulga configuração do provedor de IA).
- `/`, `/chat`, `/personagens`, `/perfil`, `/agenda`, `/mapas`, `/mestre` e `/jogar/character-forge` → **200** na camada HTTP. Isso não substitui a interação autenticada da página.
- `/api/master/surface/mapa` sem sessão → **401**, acesso continua protegido.
- O endpoint `/mestre` serve o shell da SPA com HTTP 200; a autorização de Mestre é avaliada no cliente/rotas internas, portanto esse status não é prova de acesso Mestre.
- Sessão autenticada de jogador, `/mapas` → **PASS** visual; o iframe mostra a página explicativa de acesso restrito e o link de retorno; console sem erros.

### Revalidação final somente leitura — 2026-10-02

- **Base da revalidação inicial:** branch `master`, HEAD `6c8ff958b77fdea52bc042872b989fbc77c09bae`; autoridade confirmada por `.kallistis-authority.json` como Recovery.
- **Worker publicado após as correções responsivas:** `kallistis-recovery`, versão `ace474f0-7e2c-46cb-a2a3-6a3825d7ab45`, 100% do tráfego; versão implantada a partir do commit de código `5779e19`.
- **Saúde pública:** `/api/public/health` → `200`, `status=ok`; `/api/public/ready` → `200`, `status=ready`.
- **Rotas autenticadas do jogador:** carregaram `/home`, `/chat`, `/personagens`, `/jogar/character-forge.html`, `/jogar/velarim.html`, `/jogar/canon-explorer.html`, `/refugio`, `/galeria`, `/kallistis-presente`, `/jardim`, `/revisao`, `/registro-vivo`, `/agenda`, `/perfil` e `/mapas`. Em `/mapas`, o iframe exibiu a explicação legível de acesso exclusivo a Mestres.
- **Autorização:** `/mestre` e `/perfis` mostraram mensagem de acesso negado para a sessão de jogador. O console registrou três `AccessDeniedError` correspondentes a essas negativas esperadas; não foram observados erros de console nos fluxos permitidos.
- **Dados preexistentes:** as telas de personagens e Registro Vivo exibiram registros com nomes QA; nenhum dado foi criado, editado ou removido durante esta revalidação.
- **Logs Supabase, janela 2026-10-01 16:55 UTC a 2026-10-02 16:55 UTC:** `edge_logs` teve 1.556 respostas `200` e uma `204`, sem status `4xx`/`5xx`; `auth_logs` teve 1.712 eventos `info`. Em `postgres_logs`, 22 eventos tinham SQLSTATE `00000` e um SQLSTATE `08006` às 03:14:13 UTC (`could not receive data from client: Connection reset by peer`). Como não houve resposta HTTP `4xx`/`5xx` na janela, o evento isolado não comprova falha de usuário.
- **Supabase Free, ciclo 2026-09-23 a 2026-10-23:** painel informa que a cota Free não foi excedida. Log ingestion `0,116/1 GB` (12%); log query `12,293/100 GB` (12%); banco `0,037/0,5 GB` (7%, 34,98 MB); MAU `9/50.000`; egress e cached egress `0/5 GB`; Storage `0/1 GB`; Realtime `0/200` conexões e `0/2.000.000` mensagens; Edge Functions `0/500.000` invocações. O painel informa que excedentes não são cobrados no plano Free, mas podem causar restrições.
- **UX — achados, correção e reteste:** a navegação flutuante cobria parte das abas do Character Forge em viewport estreito. Após reposicionar a barra nos microapps Character Forge, Velarim e Canon Explorer, o reteste em produção confirmou os controles desobstruídos no Forge (~742 px) e nos outros dois microapps. A imagem do jogador mostrou outro caso menor (~455 px): as abas do Forge exibiam rolagem horizontal nativa. Ajustei-as para quebrar em duas linhas; o reteste nessa largura confirmou todas as seções visíveis e sem a barra horizontal. Nenhum dado da ficha foi alterado.
- **Cloudflare/R2:** Wrangler confirmou a publicação atual. O bucket `kallistis-media` está em Standard, com 1 objeto e `2,93 MB`. A cota documentada de R2 Standard inclui `10 GB-mês`, 1 milhão de operações Classe A e 10 milhões Classe B por mês ([preços e cota R2](https://developers.cloudflare.com/r2/pricing/)). Esse tamanho observado está abaixo da franquia de armazenamento, mas contagem de operações, plano Workers e faturas atuais não foram acessíveis: o painel Cloudflare pediu login. Os limites documentados de Workers Free são 100.000 solicitações/dia e 10 ms de CPU por invocação ([limites Workers](https://developers.cloudflare.com/workers/platform/limits/)); o uso diário/CPU e o plano atual da conta permanecem **UNVERIFIED**.

### Catálogo de arquivos do commit de código

- `src/routes/api/master/surface.$surface.ts`
- `src/lib/canonical-rules.server.ts`
- `src/server/chat/kallistis-chat-runtime.ts`
- `src/lib/sedimentar.functions.ts`
- Arquivos de lint/formatação: `src/components/loading-states.tsx`, `src/lib/canonical-rules.server.test.ts`, `src/routes/api/admin/mesa-memberships.ts`, `src/routes/api/admin/mesas.ts`, `src/routes/api/characters.ts`, `src/routes/api/master/characters.ts`, `src/routes/api/vtt/player-phrase.test.ts`, `src/routes/api/vtt/player-phrase.ts`, `src/server/chat/kallistis-chat-runtime.test.ts`.
- Migração: `supabase/migrations/20261002122830_harden_runtime_function_search_paths.sql`.

## Publicação

- Commits `d1b5701cfca6e3330de22f6a6f2df03404848d3c`, `4eeca7fd95e34ffc6da42696cb613933330cde70` e `5779e195dc54dd0e40a4ed6226ae22ac5ee4a896` enviados a `origin/master`.
- Worker `kallistis-recovery` publicado em 100% do tráfego com versão final `ace474f0-7e2c-46cb-a2a3-6a3825d7ab45`.
- Smoke executado após o deploy em `kallistis.app`; respostas verificadas acima.
- Este relatório é uma atualização documental posterior ao commit de código e não altera o Worker.

## Próxima ação exata

Autenticar no painel Cloudflare e fazer leitura de plano, faturas e métricas do `kallistis-recovery`; não alterar plano, billing ou configurações.
