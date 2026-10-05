# App registry da Kaline

A Kaline é o shell autenticado e o hub principal. O registry em `src/lib/app-registry.ts` é a matriz central para domínios, superfícies, rotas, permissões de acesso, facetas técnicas de motor, status e navegação.

## Vocabulário arquitetural

- **Domínio**: área visível de produto, como `kaline`, `kharis`, `kuanyin`, `drive` ou `memory`.
- **Superfície**: tela, host React ou microapp HTML que o usuário abre, como `klio`, `codice` ou `camara-do-eco` (microapp HTML desde a remigração — ver seção "Câmara do Eco").
- **Motor**: capacidade técnica compartilhada por chat, histórico, memória e sedimentação. O tipo `EngineFacet` aceita apenas `kaline`, `kharis` e `kuanyin`.
- **Faceta/permissão de acesso**: perfil de autorização e navegação. `klio` pode existir aqui como permissão restrita.

## Decisão Kháris/Klio

Kháris é o domínio visível do cuidado. Klio é uma camada pedagógica dentro de Kháris: pode ser permissão e pode ser interface HTML, mas não é motor, banco, memória nem sedimentação separada.

Frase-guia: **Klio ensina. Kháris cuida. Klio usa Kháris por baixo.**

Um usuário com permissão `klio` entra pela interface Klio, mas usa `engineFacet: "kharis"` para chat, histórico, sedimentação e memória sensível. Isso evita duplicar motores, persistência ou enum técnico `chat_facet = klio`.

O PR de voz unificada consolida essa decisão: `/kharis` é a casa visível do cuidado, `/klio` é o Modo Fala Klio dentro dela, e Códice permanece como leitura, margem e fichamento assistido no mesmo domínio. A arquitetura de voz está documentada em [`docs/voice.md`](./voice.md) e a experiência Kháris/Klio em [`docs/kharis-klio.md`](./kharis-klio.md).

## Invariantes do shell

1. Toda rota navegável deve existir no `app-registry`.
2. Toda superfície visível deve ter `status: "real"`, `"mock"`, `"legacy"`, `"planned"` ou `"hidden"`.
3. Klio não é `EngineFacet`.
4. Klio vive dentro de Kháris como camada pedagógica.
5. Rotas legadas devem ter redirect explícito.
6. A sidebar e a Home não devem manter listas manuais paralelas.
7. HTML público não acessa Supabase, OpenRouter ou dados privados diretamente.

## Como adicionar uma rota ou microapp HTML

1. Adicione uma entrada em `APP_REGISTRY` com `id`, `label`, `path`, `domain`, `surface`, `kind`, `status` e permissões.
2. Use `kind: "microapp-html"` para superfícies HTML especializadas e `kind: "react"` para hosts React.
3. Defina `engineFacet` somente quando a superfície conversar com motor/chat/memória. Para Klio/Códice/Modo Fala, use sempre `engineFacet: "kharis"`.
4. Use `legacyPaths` para links antigos; `resolveLegacyPath` centraliza os redirects.
5. Use `sidebar: true` e/ou `home: true` apenas quando a superfície deve aparecer na navegação.

## Status

- `real`: tela funcional atual.
- `mock`: superfície navegável, visual ou preparatória, sem motor real completo.
- `legacy`: rota mantida por compatibilidade, normalmente redirecionada.
- `planned`: planejada; não deve aparecer sem tela segura.
- `hidden`: catalogada para autorização/roteamento, mas fora da UI.

## Exemplos principais

| id                    | path                 | domain    | surface         | permission/access facet | engine facet | status    | observação                                                                                                |
| --------------------- | -------------------- | --------- | --------------- | ----------------------- | ------------ | --------- | --------------------------------------------------------------------------------------------------------- |
| `klio`                | `/klio`              | `kharis`  | `klio`          | `klio`, `kharis`        | `kharis`     | `real`    | Usuário Klio entra pela interface HTML, mas usa motor, histórico e sedimentação de Kháris.                |
| `codice`              | `/klio/codice`       | `kharis`  | `codice`        | `klio`, `kharis`        | `kharis`     | `real`    | Acervo textual, leitura, margem e fichamento; legado `/livros` resolve para este caminho.                 |
| `modo-fala-klio`      | `/klio`              | `kharis`  | `klio`          | `klio`, `kharis`        | `kharis`     | `legacy`  | Entrada de navegação/compatibilidade para modo pedagógico de fala; `/modo-fala` redireciona para `/klio`. |
| `camara-do-eco`       | `/camara`            | `kaline`  | `camara-do-eco` | `kaline`                | `kaline`     | `real`    | Transcrição, ata, decisões, pendências e candidatos à memória de reuniões.                                |
| `revisao`             | `/revisao`           | `memory`  | `revisao`       | `kaline`, `kharis`      | `kaline`     | `real`    | Aprovar, editar, recusar ou arquivar candidatos à memória.                                                |
| `kuanyin`             | `/kuan-yin`          | `kuanyin` | `kuanyin`       | `kuanyin`               | `kuanyin`    | `real`    | Domínio comercial e de atendimento do Guardião autenticado.                                               |
| `kuanyin-public-page` | `/g/:guardianSlug`   | `kuanyin` | `kuanyin`       | `kuanyin`               | `kuanyin`    | `real`    | Página pública do Guardião para cliente final sem login; não aparece na navegação autenticada.            |
| `diagnostico`         | `/admin/diagnostico` | `system`  | `admin`         | admin                   | —            | `planned` | Consulta visual de eventos e `trace_id`; por enquanto consultar logs e metadata.                          |
| `drive`               | `/drive`             | `drive`   | `drive`         | `drive`                 | —            | `real`    | Mobilidade, veículo e combustível; não usa motor de chat próprio.                                         |

## Regras de autorização

`src/lib/use-authz.ts` consome o registry para calcular apps permitidos, sidebar, home e fallback padrão. Admin acessa tudo que não esteja `hidden`. Usuário `klio` vê apenas superfícies explicitamente liberadas para `klio` e não vê o chat geral `/chat`. Usuário `kharis` vê Kháris e as superfícies pedagógicas associadas. Usuário `kuanyin` não vê Kháris/Klio/Códice. Usuário `drive` vê Kaline Drive.

## Home e Sidebar governadas pelo registry

A Home e a Sidebar nao mantem listas paralelas de navegacao. Elas consomem `getHomeApps(authz)` e `getSidebarApps(authz)`, que filtram o `APP_REGISTRY` por visibilidade, permissao e status. Depois disso, `groupAppsForNavigation` aplica grupo e ordem de forma previsivel.

Para uma superficie aparecer na Home, a entrada precisa ter `home: true`, rota principal em `path`, `status` visivel e permissao compativel em `allowedFacets`, `allowedRoles` ou `adminOnly`. Para aparecer na Sidebar, vale a mesma regra usando `sidebar: true`. A Sidebar pode manter apenas mapas visuais locais, como icones; a decisao de rota, grupo, ordem, label e permissao vem do registry.

Os campos opcionais de navegacao sao `group`, `order`, `groupOrder`, `shortLabel`, `sidebarLabel`, `homeDescription` e `badge`. Os grupos visuais atuais sao `kaline`, `kharis`, `memory`, `kuanyin`, `drive` e `admin`.

Status nao deve aparecer cru na interface comum. A UI traduz `real` para `Funcional`, `mock` para `Mock visual`, `legacy` para `Legado`, `planned` para `Planejado` e nao mostra `hidden`.

Rotas legadas continuam em `legacyPaths` e sao tratadas por `resolveLegacyPath`, mas nao devem ser usadas como links principais na Home ou Sidebar. Exemplo: Codice aponta para `/klio/codice`, nao para `/livros`; Camara do Eco aponta para `/camara`, nao para `/camara-do-eco` (legado).

Klio permanece dentro de Kharis: pode aparecer como camada pedagogica, modo ou superficie, mas usa `engineFacet: "kharis"`. A navegacao principal deve apresentar Modo Fala Klio e Codice sob o grupo Kharis, sem criar `klio` como faceta tecnica independente.

## Microapps HTML

Para apps com `kind: "microapp-html"`, use o padrão documentado em [`docs/microapp-host.md`](./microapp-host.md). O registry continua sendo a fonte de verdade para `id`, `label`, `path`, `status`, `domain`, `surface` e `engineFacet`; o `MicroappHost` resolve esses dados por `appId` e centraliza iframe, `?embedded=1`, loading, fallback, sandbox e validação de `postMessage`.

## Câmara do Eco

A Câmara do Eco é a superfície de reuniões da Kaline: grava áudio em blocos, transcreve por segmento, gera análise estruturada (resumo, interlocutores, temas, decisões, sinais, próximos gestos), ata em Markdown e infográfico SVG, e permite semear hipóteses no Jardim ou criar retornos na Agenda — sempre com confirmação humana.

O protótipo original era um microapp HTML mockado; foi substituído por uma tela React própria com motor real e depois remigrado para o padrão microapp HTML (`kind: "microapp-html"`), agora com motor real por baixo — ver [`docs/camara-migration-plan.md`](./camara-migration-plan.md).

- Rota principal: `/camara` (`src/routes/_authenticated/camara.tsx`, renderiza `CamaraHost`)
- `kind`: `microapp-html`
- HTML: `public/camara/index.html`; host: `src/components/CamaraHost.tsx`
- Rota legada: `/camara-do-eco`, mantida em `legacyPaths`, redireciona para `/camara`
- Server functions: `src/lib/camara.functions.ts` (CRUD de sessões/segmentos, análise, semear hipótese, retorno Kairós); transcrição por segmento via `POST /api/camara-transcribe-segment`
- Captura de áudio (`getUserMedia`/`MediaRecorder`) roda inteiramente no Host, não no HTML — evita depender de permissão de microfone em iframe sandboxed
- Candidatos à memória vão para `memory_candidates`; nada entra no Jardim/Mnemósine sem revisão humana em `/revisao`

## Agenda

Agenda pessoal (compromissos, aulas, reuniões, eventos e prazos) migrada para o padrão microapp HTML.

- Rota principal: `/agenda` (`src/routes/_authenticated/agenda.tsx`, renderiza `AgendaHost`)
- `kind`: `microapp-html`
- HTML: `public/microapps/agenda/index.html`; host: `src/components/AgendaHost.tsx`
- Server functions: `src/lib/agenda.functions.ts` (CRUD de eventos, sempre restrito a `user_id`)
- Domínio `kaline`; paleta usa `--kaline: #ff4400` (ver [`docs/microapp-host.md`](./microapp-host.md#71-cor-do-domínio-no-html))

## Corpore Sano

Corpore Sano (treinos, sinais corporais, recuperação) migrado para microapp HTML — ver [`docs/corpore-sano-migration-plan.md`](./corpore-sano-migration-plan.md).

- Rota principal: `/corpore-sano` (`src/routes/_authenticated/corpore-sano.tsx`, renderiza `CorporeSanoHost`); legado `/treinos` resolve para esta rota
- `kind`: `microapp-html`
- HTML: `public/corpore-sano/index.html`; host: `src/components/CorporeSanoHost.tsx`
- Server functions: `src/lib/treinos.functions.ts` (treino finalizado, sinais corporais, histórico, PRs)
- Arquitetura **local-first híbrida**: exercícios, treino do dia, templates e plano semanal vivem só no `localStorage` (`kaline.treinos.v1`), compartilhado com o editor de templates em `/perfil`; só treino finalizado e sinais corporais sincronizam com o Supabase via motor
- Paleta usa tons cobre/âmbar da persona Khora (variante clara de `--khora: #a56a43`), não o laranja `--kaline` puro — mesma lógica de legibilidade do Kháris no Códice (ver `docs/microapp-host.md#71-cor-do-domínio-no-html`)

## Jurídico

O domínio jurídico tem 3 entradas no registry, mas só 2 features reais, migradas para microapp HTML — ver [`docs/juridico-migration-plan.md`](./juridico-migration-plan.md).

- **Corpus curado** (`juridico`, `/juridico`): busca em `legal_documents`/`legal_chunks` (constituição, leis, súmulas importadas por admin) + painel de importação, sem geração por IA. HTML: `public/juridico/index.html`; host: `src/components/JuridicoHost.tsx`; server functions: `src/lib/legal.functions.ts`.
- **Acervo assistido por IA** (`legislacao` em `/legislacao`, `jurisprudencia` em `/jurisprudencia`): busca via LLM (OpenRouter) + acervo pessoal salvo pelo usuário. Compartilham o mesmo HTML (`public/juridico-acervo/index.html`), parametrizado por `?modo=legislacao|jurisprudencia` no `src` do iframe; host: `src/components/JuridicoAcervoHost.tsx`; server functions: `src/lib/juridico.functions.ts` (`pesquisarJuridico`, `listarAcervoJuridico`, `salvarAcervoJuridico`, `removerAcervoJuridico`).
- Domínio `kaline`; paleta usa `--kaline: #ff4400` nos dois HTMLs (o React antigo do corpus curado usava tons cobre/âmbar por engano — corrigido nesta migração).

## Revisão e Jardim

Revisão e Jardim vivem no grupo `memory`.

- Revisão: `/revisao`, `surface: "revisao"`, `status: "real"`, `kind: "microapp-html"` — migrada para microapp HTML, ver [`docs/revisao-migration-plan.md`](./revisao-migration-plan.md). A rota mistura duas seções: candidatos à memória (aprovar/editar/recusar/arquivar) e revisão espaçada (SM-2) das memórias do Jardim vencidas hoje. HTML: `public/revisao/index.html`; host: `src/components/RevisaoHost.tsx`; server functions: `src/lib/memory-review.functions.ts` (candidatos) e `src/lib/jardim.functions.ts` (`dueMemorias`/`reviewMemoria`). Motor já era 100% server function antes da migração — sem correção de segurança envolvida, só troca de superfície. Paleta cobre/âmbar (`#C98A65`/`#D9A441`), consistente com Jardim (ainda React).
- Jardim/Mnemósine: `/jardim`, `surface: "jardim"`, `status: "real"`.
- Candidatos ficam em `memory_candidates`.
- Memórias aprovadas ficam em `jardim_memorias`.

Câmara do Eco, Códice, Registro Vivo e fluxos futuros devem gerar candidatos. A aprovação humana em `/revisao` é o único caminho para criar memória durável.
