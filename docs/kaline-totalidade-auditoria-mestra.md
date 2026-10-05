# Kaline Totalidade — auditoria mestra como hub de microapps

Data da varredura: 2026-06-29  
Escopo auditado: repositório local `/workspace/totalidade` na branch atual.  
Natureza desta entrega: diagnóstico documental; nenhuma feature grande foi implementada.

## 1. Sumário executivo

A Kaline já deixou parcialmente de ser apenas uma coleção de telas: o repositório contém rotas autenticadas, shell com sidebar, microapps HTML públicos para Códice, Modo Fala Klio, Kaline Presente e Câmara do Eco, hosts React para Códice e Câmara do Eco, APIs autenticadas para chat/transcrição/TTS e um conjunto considerável de migrações Supabase para memória, Câmara, livros/Códice e Kuan-Yin.

O problema principal é que a arquitetura de produto ainda não está cristalizada no shell. O código possui sinais simultâneos de três épocas:

1. app monolítico com telas React internas;
2. chat/facetas por rotas;
3. nova arquitetura de microapps HTML + hosts autenticados + motores preservados.

A consequência é uma experiência com nomes duplicados, rotas legadas, permissões inconsistentes, Home ainda com itens antigos e motores reais coexistindo com superfícies mockadas sem um registry/padrão único. O estado mais promissor é Códice e Câmara do Eco: ambos já têm HTML público e host autenticado, mas ambos ainda precisam de contrato de host, fallback, integração de motor e política PWA/cache mais limpa.

Diagnóstico direto:

- **Bom:** há base real de shell autenticado, Supabase, RLS, APIs protegidas por bearer, Códice com host, Câmara do Eco com host mockado, Kuan-Yin com tabelas comerciais e páginas públicas, PWA básico e docs específicas.
- **Confuso:** Klio usa thread/facet `kharis` no motor de chat; `/modo-fala` redireciona para `/klio`; Home ainda aponta para `/livros` e `/camara`; sidebar usa `/camara-do-eco`; `drive` não existe como faceta de autorização; Khora/Kháris/Drive aparecem misturados.
- **Mockado:** HTML da Câmara do Eco, partes visuais do Códice, microapp HTML de Kaline Presente, microapp HTML de Modo Fala Klio; showroom Kuan-Yin é iframe externo.
- **Implementado de verdade:** chat autenticado, transcrição autenticada, TTS autenticado, rota React legada `/camara` com sessões/segmentos/análise, rotas do Códice internas, preservação do motor Livros, Kuan-Yin admin/guardião/portal em parte, RLS em várias migrações.
- **Perigoso:** duplicidade de `CACHE_VERSION` no service worker; autorização por faceta bloqueia rotas que deveria permitir para Klio; host da Câmara valida `source`, mas não valida `origin`; `getAuthz` assume `admin` como fallback quando não há `profiles.role`; HTML público não deve receber dados privados sem contrato estrito; uso de `supabaseAdmin` em APIs precisa permanecer server-only.
- **Quebrado ou com risco funcional:** usuários `klio` podem ser redirecionados para `/klio` mas o motor de Klio abre thread `kharis`; `adminRoutes` bloqueia `/klio` para usuário comum mesmo quando `assigned_facet=klio`; `/livros` redireciona para `/klio/codice`, mas Home ainda exibe “Livros”; `/camara` e `/camara-do-eco` competem semanticamente.

Resposta à pergunta central: para virar um hub confiável, elegante, rápido, útil e vendável, a Kaline precisa primeiro consolidar o shell: registry de microapps, padrão único de host, matriz de rotas/facetas, Home limpa por domínio, sidebar coerente, cache PWA corrigido e estados de erro/vazio. Só depois deve integrar motores reais nas superfícies HTML.

## 2. Kaline como hub de microapps

Arquitetura-alvo confirmada pela auditoria:

```txt
Kaline shell autenticado
├── valida sessão, faceta, papel, contexto e navegação
├── renderiza hosts React
├── chama motores e APIs autenticadas
└── injeta somente dados autorizados nos microapps

Microapp HTML público
├── superfície visual
├── estado local/mock/visual
├── postMessage com ações declarativas
└── sem Supabase direto, sem segredo, sem token, sem dados privados por conta própria

Motor
├── chat
├── transcrição
├── TTS
├── leitura/PDF/resumo
├── Câmara/ata/análise
├── memória/revisão
└── Kuan-Yin comercial

Supabase/APIs
├── Auth
├── RLS
├── Storage
├── tabelas por domínio
└── server routes com bearer/service role quando necessário
```

O repo já contém exemplos dessa separação, mas ainda sem contrato central. `CodiceHost` e `CamaraDoEcoHost` são implementações independentes. O próximo passo arquitetural deve ser um `MicroappHost` ou registry declarativo, não uma refatoração ampla imediata.

## 3. Estado atual do repo

### Stack real

- TanStack Router/Start + Vite + React 19.
- Supabase JS client no navegador com publishable/anon key.
- Supabase service role restrito a módulos server/server handlers.
- APIs `/api/chat`, `/api/transcribe`, `/api/tts`, `/api/camara-transcribe-segment`.
- PWA com `manifest.webmanifest` e `public/sw.js`.
- Cloudflare configurado via `wrangler.toml` e docs de self-host.

### Artefatos existentes

- Microapps HTML em `public/codice/index.html` e `public/camara-do-eco/index.html`; os protótipos públicos simulados de voz foram removidos do deploy.
- Hosts reais: `CodiceHost`, `CamaraDoEcoHost`.
- Motores preservados: `LegacyLivrosEngine`, rota `/camara`, `camara.functions`, `transcribe.server`, APIs de TTS/transcrição/chat.
- Documentação prévia: Códice, Câmara do Eco, Cloudflare, Supabase.

### Limite da auditoria

Não foi possível verificar PRs remotos/issues do GitHub a partir do estado local sem inferir fora do repo. Esta auditoria classifica como “documentado” o que aparece em `docs/`, “implementado” o que possui rota/componente/migração, “mockado” o que possui HTML/host sem motor real integrado e “planejado” apenas quando a intenção aparece em docs/comentários sem implementação.

## 4. Mapa de domínios

| Domínio                   | Função correta                                     | Estado real no repo                                           | Diagnóstico                                                                |
| ------------------------- | -------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Kaline                    | shell pessoal, presença, hub, memória, organização | `/home`, `/chat`, `/kaline-presente`, Registro/Jardim/Revisão | Base real, mas Home ainda é cockpit admin e não hub modular por domínio.   |
| Klio                      | estudo, acessibilidade, Modo Fala, Códice          | `/klio`, `/modo-fala` redirect, `/klio/codice`                | Domínio existe, mas chat de Klio usa `kharis`, gerando confusão de faceta. |
| Códice                    | leitura/e-reader/acervo/fichamento/margem          | HTML + Host + rotas + schema + legado `/livros`               | Melhor candidato de microapp; integração de motor ainda parcial.           |
| Câmara do Eco             | reuniões/transcrição/ata/decisões                  | HTML mock + Host + rota nova + rota legada real `/camara`     | Boa separação visual/motor, mas ainda bifurcada.                           |
| Kuan-Yin                  | produto comercial vendável                         | várias rotas, tabelas, portal público, showroom externo       | Mais próximo de produto, mas fluxo vendável ainda fragmentado.             |
| Kháris                    | cuidado/acompanhamento                             | `/kharis`, prompts, chat                                      | Existe como faceta; escopo se mistura com Klio no motor.                   |
| Drive                     | mobilidade exclusiva                               | `/drive`, funções de drive                                    | Não é faceta em `use-authz`; aparece dentro de “Corpo · Khora”.            |
| Registro/Jardim/Mnemósine | memória, revisão, registro vivo                    | `/registro-vivo`, `/jardim`, `/revisao`, funções              | Base real; precisa ritual explícito para candidatos vindos de microapps.   |

## 5. Mapa de microapps HTML

| Microapp            | HTML público                                 | Rota autenticada               | Host React                                 | Domínio/faceta  | Status                               | Motor associado                                                        | Riscos                                                    | Próximo passo                                                        |
| ------------------- | -------------------------------------------- | ------------------------------ | ------------------------------------------ | --------------- | ------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| Códice              | `/codice/index.html`                         | `/klio/codice`                 | `CodiceHost`                               | Klio            | integrado visualmente; motor parcial | `LegacyLivrosEngine`, rotas Códice, tabelas `livros`, `codice_margens` | HTML recebe acervo via postMessage; contrato ainda ad hoc | padronizar host, integrar upload/acervo/margem/fichamento por ações. |
| Modo Fala Klio      | removido do deploy                           | `/klio`; `/modo-fala` redirect | não há host dedicado                       | Klio/Kháris     | fluxo React legado preservado        | `KlioVoiceView`, chat/transcribe/TTS                                   | fora do runtime canônico da Kaline Clean                  | não reativar o protótipo HTML.                                       |
| Câmara do Eco       | `/camara-do-eco/index.html`                  | `/camara-do-eco`               | `CamaraDoEcoHost`                          | Kaline/reuniões | mockado integrado                    | `/camara`, `camara.functions`, `/api/camara-transcribe-segment`        | host não valida origin; motor real fica em rota separada  | integrar motor em PR posterior sem apagar `/camara`.                 |
| Kaline Presente     | protótipo removido do deploy                 | `/kaline-presente`             | não há host; rota usa `KalinePresenteView` | Kaline/admin    | React real                           | chat/TTS/transcrição                                                   | nenhum protótipo público paralelo                         | manter a implementação React real.                                   |
| Kuan-Yin Showroom   | externo `https://showroom.nomosludens.ia.br` | `/kuan-yin/showroom`           | iframe inline                              | Kuan-Yin        | integrado como iframe externo        | motor comercial interno separado                                       | dependência externa, CSP/X-Frame pode bloquear            | criar fallback e, se virar produto, trazer host/contrato próprio.    |
| Registro Vivo       | inexistente como HTML                        | `/registro-vivo`               | não há                                     | Kaline/memória  | React interno real                   | `registro-vivo.functions`                                              | não precisa virar HTML agora                              | manter interno; priorizar ritual de memória.                         |
| Futuras superfícies | inexistente                                  | variam                         | inexistente                                | variam          | planejado                            | variam                                                                 | risco de copiar hosts ad hoc                              | criar registry antes da proliferação.                                |

Classificação rápida:

- HTML pronto/mockado: Códice, Câmara, Modo Fala Klio, Kaline Presente.
- Host criado: Códice, Câmara.
- Rota criada: Códice, Câmara, Kaline Presente, Klio.
- Sidebar atualizada: Códice e Câmara aparecem; Home ainda usa nomes/rotas legadas.
- Motor preservado: Códice/Livros e Câmara legada.
- Motor integrado: parcial em Códice; não integrado no HTML da Câmara; Klio/Kaline Presente usam React real.
- Supabase pendente: contratos de escrita/leitura por ação para HTML.
- PWA/cache pendente: service worker precisa limpeza de versão e estratégia por microapp.

## 6. Mapa de hosts React

| Host               | Existe? | Src                                    | Sandbox                                                       | postMessage                                            | Fallback               | Diagnóstico                                                         |
| ------------------ | ------: | -------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------- |
| `CodiceHost`       |     sim | `/codice/index.html?embedded=1`        | `allow-scripts allow-same-origin allow-forms allow-downloads` | valida `origin` e shape; não valida `source` do iframe | não                    | Bom começo; precisa fallback, timeout e validação de source.        |
| `CamaraDoEcoHost`  |     sim | `/camara-do-eco/index.html?embedded=1` | mesmo sandbox                                                 | valida `source` da janela e shape; não valida `origin` | não                    | Bom mock host; precisa origin e contrato de ações sensíveis.        |
| `MicroappHost`     |     não | n/a                                    | n/a                                                           | n/a                                                    | n/a                    | Deve ser criado como padrão, mas não neste PR documental.           |
| `KlioModoFalaHost` |     não | n/a                                    | n/a                                                           | n/a                                                    | n/a                    | Necessário somente se HTML de Modo Fala for produto, não protótipo. |
| `ShowroomHost`     |     não | showroom externo                       | sem sandbox                                                   | sem postMessage                                        | texto orienta nova aba | Pode virar host genérico externo com fallback.                      |

Padrão recomendado para PR futuro:

```ts
type MicroappHostProps = {
  title: string;
  src: string;
  allowedFacets?: FacetSlug[];
  embedded?: boolean;
  sandbox?: string;
  expectedOrigin?: string;
  expectedSource?: string;
  fallback?: React.ReactNode;
  onMessage?: (message: unknown) => void;
};
```

Regras obrigatórias do padrão:

- sempre validar `event.origin`;
- sempre validar `event.source === iframe.contentWindow` para iframes same-origin;
- validar `source`, `action` e schema de payload;
- nunca executar ação sensível sem sessão/permissão;
- fallback se iframe não carrega;
- loading/timeout acessível;
- altura calculada sem scroll duplo;
- `?embedded=1` centralizado.

## 7. Mapa de rotas

| Rota                                    | Existe? | Pública/autenticada    | Quem acessa hoje                                        | Estado vazio/erro         | Diagnóstico                                                |
| --------------------------------------- | ------: | ---------------------- | ------------------------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| `/`                                     |     sim | pública/entrada        | redireciona/landing conforme rota index                 | não auditado visualmente  | precisa ser consistente com PWA `start_url`.               |
| `/auth`                                 |     sim | pública                | login                                                   | não auditado              | base auth.                                                 |
| `/chat`                                 |     sim | autenticada            | admin e faceta Kaline, mas autorização tem exceções     | ChatView                  | rota real de Kaline conversa.                              |
| `/klio`                                 |     sim | autenticada            | admin e usuário `klio`, mas loader cria thread `kharis` | KlioVoiceView             | conflito conceitual Klio/Kháris.                           |
| `/modo-fala`                            |     sim | autenticada            | redirect para `/klio`                                   | n/a                       | legado saudável se documentado.                            |
| `/kaline-presente`                      |     sim | autenticada admin-only | admin                                                   | route boundary            | React real, HTML homônimo não integrado.                   |
| `/klio/codice`                          |     sim | autenticada            | admin; `klio` pode sofrer bloqueio por regra global     | route boundary            | rota preferencial correta.                                 |
| `/livros`                               |     sim | autenticada            | redirect para `/klio/codice`                            | n/a                       | compatibilidade correta, mas Home ainda rotula Livros.     |
| `/camara-do-eco`                        |     sim | autenticada            | aparece na sidebar geral                                | route boundary            | nova rota visual/mock.                                     |
| `/camara`                               |     sim | autenticada            | admin; Home aponta para ela                             | estados internos          | motor real legado; precisa ser rotulada como motor/legado. |
| `/kuan-yin`                             |     sim | autenticada            | faceta Kuan-Yin/admin                                   | ChatView                  | produto comercial interno.                                 |
| `/kuan-yin/*`                           |     sim | autenticada            | admin em sidebar; rotas internas                        | variado                   | clientes/guardioes/config/agendamentos/pagamentos/pedidos. |
| `/g/$guardianId`                        |     sim | pública                | cliente final                                           | não auditado por execução | base para página pública sem login.                        |
| `/portal/$token`                        |     sim | pública                | cliente com token                                       | não auditado por execução | base portal restrito.                                      |
| `/kharis`                               |     sim | autenticada            | faceta Kháris/admin                                     | ChatView provável         | domínio de cuidado.                                        |
| `/drive`                                |     sim | autenticada            | admin por sidebar; não faceta                           | variado                   | falta faceta `drive` em authz.                             |
| `/registro-vivo`, `/jardim`, `/revisao` |     sim | autenticadas           | admin atualmente                                        | states parciais           | memória existe, mas precisa ritual de candidatos.          |

Problema de autorização central: a rota global `_authenticated` redireciona usuários comuns por faceta. Para `klio`, `allowedPrefixes` permite `/klio`, mas `adminRoutes` também contém `/klio`, então a intenção fica contraditória e pode bloquear o usuário comum dependendo do fluxo. Além disso, `getChatRouteForFacet('kaline')` retorna `/home`, enquanto `allowedPrefixes.kaline` é `/chat`.

## 8. Mapa de facetas/permissões

Facetas no código de autorização: `kaline`, `kharis`, `kuanyin`, `klio`. Não há `drive` como facet.

Regras reais observadas:

- `role === 'admin'` vê todas as facetas.
- usuário comum recebe apenas `assigned_facet`.
- fallback sem `role` assume `admin`, o que é conveniente para legado mas perigoso.
- `getChatRouteForFacet('klio')` retorna `/klio`.
- API `/api/chat` aceita apenas `kaline`, `kharis`, `kuanyin`; não aceita `klio`.
- Klio visual chama `ensureThread('kharis')`, então Klio acadêmica ainda opera tecnicamente por Kháris.

Respostas objetivas:

- Admin vê quase tudo: sim, por `allowedFacets=ALL_FACETS` e sidebar admin.
- Usuário Klio cai em Klio/Modo Fala/Códice: intenção sim, implementação conflita com bloqueio de `/klio` em `adminRoutes` e chat sem facet `klio`.
- Usuário Kuan-Yin cai no domínio comercial: sim, `/kuan-yin`.
- Usuário Kháris cai no cuidado: sim, `/kharis`.
- Cliente final Kuan-Yin sem login: existem rotas públicas `/g/$guardianId` e `/portal/$token`; precisa teste manual de fluxo real.
- Existe legado `/klio-estudo`: sim, rota presente; precisa decidir redirect/compatibilidade.
- Existe rota visível sem permissão: sidebar mostra Modo Fala e Câmara sem facet específica; pode ser intencional, mas precisa matriz.
- Existe rota bloqueada indevidamente: provável para Klio/Códice de usuário `assigned_facet=klio`.

## 9. Diagnóstico UX

A UX tem uma base estética forte, mas ainda comunica “pilha de experimentos” em pontos centrais:

- Home usa “cockpit” com cards de Registro/Jardim e satélites, mas não organiza claramente microapps por domínio.
- Sidebar mistura Conversas, Cockpit, Estudo, Corpo/Khora, Negócio e Sistema; isso é melhor que uma lista plana, porém ainda contém legados e nomes inconsistentes.
- Existem duas Câmaras: `/camara-do-eco` como microapp e `/camara` como motor real antigo.
- Existem duas experiências “presente/fala”: HTML público e React real.
- Usuário final não sabe quando está em mock, motor real, legado ou protótipo.

A Home ideal deve responder em uma tela:

1. qual domínio está ativo para meu perfil;
2. quais microapps posso abrir;
3. quais pendências reais existem;
4. quais ações estão mockadas/indisponíveis;
5. onde retomar trabalho.

## 10. Diagnóstico sidebar/home

### Sidebar

Pontos bons:

- Usa grupos.
- Filtra itens por facetas permitidas em parte.
- Inclui Códice e Câmara do Eco.
- Tem instalação PWA.

Pontos confusos:

- “Modo Fala” não está dentro do grupo Estudo/Klio.
- “Câmara do Eco” está em Conversas, mas é domínio de reuniões.
- “Drive” aparece em “Corpo · Khora”, não em domínio exclusivo de mobilidade.
- “Klio” e “Códice” são adminOnly por grupo, o que contradiz usuário comum `klio`.
- `FACET_APPLE` não inclui `klio`.
- Home ainda aponta para `/livros` e `/camara`, não para `/klio/codice` e `/camara-do-eco`.

### Home

Pontos bons:

- Mostra presença, KITT, registros recentes e revisão.
- Tem estados vazios para registros.

Pontos confusos:

- Home é admin/cockpit, não hub por faceta.
- Satélites incluem itens legados.
- Não há seção “Microapps”.
- Não indica status mock/real.

Recomendação: PR separado para transformar Home em hub modular com cards: Kaline, Klio/Modo Fala, Códice, Câmara do Eco, Kuan-Yin, Kháris, Drive, Memória. Cada card deve conter status: real, mock, legado, pendente.

## 11. Diagnóstico Códice

Estado real:

- `public/codice/index.html` existe.
- `CodiceHost` existe e carrega `/codice/index.html?embedded=1`.
- `/klio/codice` existe.
- `/livros` redireciona para `/klio/codice`.
- Rotas internas existem: `/klio/codice/subir`, `/acervo`, `/fichamento`, `/margem`, `/tela-acesa`.
- Motor legado `LegacyLivrosEngine` existe.
- Migrações criam/expandem `livros`, `codice_margens` e storage local-first.
- Host envia acervo autorizado ao iframe via `postMessage` após consultar Supabase.

Classificação:

- mock visual pronto: sim.
- host pronto: parcialmente.
- rota pronta: sim.
- motor integrado: parcial; ações navegam para rotas motor, mas HTML não executa fluxo completo.
- upload real: provável nas rotas internas/legado, não no HTML principal.
- acervo real: sim, enviado pelo host.
- margem real: schema existe; integração visual pendente.
- fichamento real: rota existe; integração precisa teste.

Risco central: o HTML é superfície visual, mas o contrato de ações ainda é ad hoc e sem versionamento. O correto é definir actions suportadas, payloads e respostas do host.

## 12. Diagnóstico Câmara do Eco

Estado real:

- `public/camara-do-eco/index.html` existe.
- `CamaraDoEcoHost` existe.
- `/camara-do-eco` existe.
- `docs/camara-do-eco-microapp.md` documenta que o HTML é mockado.
- Rota legada `/camara` contém motor real de sessões, texto, áudio, segmentos, transcrição, análise e semeadura.
- API `/api/camara-transcribe-segment` existe e valida usuário/segmento.
- `camara.functions` existe para análise/síntese/semeadura.

Classificação:

- HTML pronto: sim, mockado.
- host criado: sim.
- rota criada: sim.
- sidebar atualizada: sim.
- motor preservado: sim, `/camara`.
- motor integrado no HTML: não.
- Supabase pendente no microapp: sim, via host/motor futuro.
- PWA/cache pendente: sim.

Plano recomendado permanece:

1. manter HTML mock em `public/camara-do-eco/index.html`;
2. manter `/camara` como motor legado/real;
3. criar contrato host→motor em PR específico;
4. conectar upload/texto/transcrição em etapas;
5. gerar candidatos à memória, nunca salvar memória durável direto.

## 13. Diagnóstico Modo Fala/Kaline Presente

### Modo Fala Klio

Estado:

- O protótipo HTML público simulado foi removido do deploy.
- Rota `/modo-fala` apenas redireciona para `/klio`.
- `/klio` usa `KlioVoiceView` com `ensureThread('kharis')`.
- Motor real de transcrição/TTS/chat existe por APIs e hooks.

Diagnóstico: o fluxo legado React foi preservado. O protótipo HTML não deve ser reativado.

### Kaline Presente

Estado:

- O protótipo HTML público simulado foi removido do deploy.
- Rota `/kaline-presente` é admin-only e usa `KalinePresenteView`.
- Usa thread `kaline` e motor real de conversa/voz conforme componente.

Diagnóstico: deve continuar React real. A remoção do protótipo público não altera o fluxo autenticado.

## 14. Diagnóstico Kuan-Yin

Estado real:

- Rotas internas: `/kuan-yin`, clientes, guardiões, config, onboarding, pagamentos, pedidos, agendamentos, showroom.
- Rotas públicas: `/g/$guardianId`, `/portal/$token`.
- Migrações para `business_contexts`, `kuanyin_clients`, `kuanyin_appointments`, `kuanyin_orders`, `kuanyin_payments`, `kuanyin_guardians`, portal tokens e hardening público.
- Showroom é iframe externo.
- Prompt/funções de Kuan-Yin existem.

Fluxo vendável mapeado:

| Etapa                               | Estado                                              |
| ----------------------------------- | --------------------------------------------------- |
| admin cadastra guardião             | existe base de guardiões/admin controls             |
| guardião configura negócio          | existe config/business context                      |
| cliente final acessa página pública | existe `/g/$guardianId`                             |
| cliente conversa com Kuan-Yin       | provável via funções públicas, precisa teste manual |
| cliente agenda                      | tabelas/rotas existem                               |
| guardião recebe calendário          | agendamentos existem, integração precisa validação  |
| comprovantes/pagamento              | tabelas/rotas existem, fluxo precisa validação      |

Principal lacuna: falta uma narrativa de produto e critérios de aceite ponta-a-ponta. Kuan-Yin já tem muito backend, mas precisa ser testado como funil vendável real.

## 15. Diagnóstico memória/Revisão/Jardim

Estado:

- `registro-vivo.functions`, `jardim.functions`, `sedimentar.functions` existem.
- Rotas `/registro-vivo`, `/jardim`, `/revisao` existem.
- Home exibe registros e memórias para revisar.

Risco: microapps futuros podem querer “salvar na memória” diretamente. A regra deve ser formalizada: Códice e Câmara geram candidatos à memória; Revisão/Jardim aprova, edita, descarta ou sedimenta. Nada durável sem ritual humano.

Próximo passo: schema/UX de `memory_candidates` ou equivalente, com origem (`codice`, `camara-do-eco`, `chat`, `registro-vivo`), payload, privacidade, status e revisão.

## 16. Diagnóstico PWA/cache

Estado:

- Manifest existe com `start_url: /`, `scope: /`, `display: standalone`.
- Service worker usa network-first para HTML e stale-while-revalidate para assets.
- Service worker ignora `/api/`.
- Há bug documental/técnico: `public/sw.js` define `CACHE_VERSION` duas vezes, uma para Códice e outra para Câmara. Em JavaScript isso causa `SyntaxError: Identifier 'CACHE_VERSION' has already been declared` se ambas forem `const` no mesmo escopo. Isso pode quebrar registro do service worker e PWA instalado.

Recomendação P0: corrigir `public/sw.js` em PR pequeno, mantendo uma única versão e testes manuais de instalação/update.

## 17. Diagnóstico Supabase

Pontos bons:

- Cliente público usa publishable/anon key.
- Service role fica em `client.server.ts` com aviso explícito.
- APIs sensíveis exigem bearer via `requireUser`.
- Muitas tabelas têm RLS e índices por `user_id`.
- Kuan-Yin teve hardening removendo grants anon diretos em migração posterior.

Riscos:

- Fallback de role para `admin` quando `profiles.role` ausente.
- Uso de `supabaseAdmin` em APIs deve sempre validar ownership antes de operar; `/api/camara-transcribe-segment` faz isso corretamente.
- HTML público não pode receber dados privados exceto via host com contrato. Códice já recebe acervo; isso é aceitável por ser same-origin e autenticado, mas precisa versionamento e validação de destino.
- Storage precisa revisão manual dos buckets `camara-audio`, `livros-docs` e políticas. A auditoria identificou referências, mas não executou banco remoto.

## 18. Diagnóstico Cloudflare/deploy

Estado:

- `wrangler.toml` define nome, compatibilidade e várias env vars públicas/não secretas.
- Docs instruem secrets para `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
- Cliente Supabase suporta config runtime `window.__TOTALIDADE_CONFIG__`.

Riscos Cloudflare:

- TanStack Start/server routes precisam rodar no runtime configurado; qualquer dependência Node-only em APIs pode quebrar.
- Transcrição/TTS/PDF podem ser pesados para Worker se processarem blobs grandes.
- `mammoth`, `pdfjs-dist` e conversões de arquivo devem ser lazy e/ou server-compatible.
- Uploads grandes de áudio (25MB) podem bater limites dependendo do plano/rota.
- Secrets ausentes geram 503 amigável em IA/TTS, mas build/deploy deve validar env obrigatória.

Resposta: o app está parcialmente pronto para Cloudflare, com documentação boa, mas precisa checklist de runtime para APIs pesadas e teste de upload/transcrição no ambiente real.

## 19. Diagnóstico segurança

Pontos bons:

- APIs de IA/transcrição/TTS exigem autenticação.
- Rate limit existe em chat/transcrição/TTS.
- Chat valida ownership de thread antes de chamar modelo.
- Prompt tem bloco anti-injection.
- Kuan-Yin anon foi endurecido por migração específica.

Riscos:

- `CamaraDoEcoHost` não valida `event.origin`.
- `CodiceHost` valida origin, mas não source do iframe.
- `sandbox` com `allow-same-origin` + `allow-scripts` dá mais poder ao iframe same-origin; aceitável para microapp próprio, mas exige disciplina de conteúdo público.
- Não há CSP auditado no documento final, embora exista `src/lib/csp.ts`.
- Logs podem conter mensagens de erro do provedor; evitar payloads privados em `console.error`.
- HTML público deve ser tratado como não confiável para segredos.

## 20. Diagnóstico performance

Prováveis pesos iniciais:

- Home importa muitos ícones e componentes visuais.
- Rotas de leitura/PDF (`pdfjs-dist`, `mammoth`) devem permanecer lazy/fora da Home.
- Chat com `react-markdown` deve ser lazy quando possível; há `LazyMarkdown`.
- Microapps HTML podem reduzir bundle React se forem carregados apenas por rota, mas podem aumentar custo se duplicarem CSS/JS e cache.
- Iframes adicionam custo de documento, mas isolam experiência e reduzem acoplamento.

Recomendação: medir bundle com `vite build` + análise posterior. PR de performance deve focar em lazy routes, retirar motores pesados da Home e padronizar iframe loading/fallback.

## 21. Problemas priorizados

## [CRÍTICO] Service worker possui `CACHE_VERSION` duplicado

**Área:** PWA / Código  
**Status:** quebrado  
**Arquivos envolvidos:**

- `public/sw.js`
  **Sintoma:** PWA pode falhar ao registrar/ativar service worker, deixando app instalado preso em cache antigo ou sem offline/update confiável.  
  **Causa provável:** merge incremental de versões de Códice e Câmara declarou `const CACHE_VERSION` duas vezes.  
  **Impacto:** quebra atualização do app instalado e mina confiança em microapps HTML.  
  **Correção recomendada:** consolidar uma única versão de cache, limpar comentários duplicados e testar registro/update.  
  **Risco da correção:** Baixo  
  **Prioridade:** P0

## [ALTO] Faceta Klio está conceitualmente separada, mas motor de chat usa Kháris

**Área:** Auth / Produto / Código  
**Status:** legado/confuso  
**Arquivos envolvidos:**

- `src/routes/_authenticated/klio.tsx`
- `src/routes/api/chat.ts`
- `src/lib/use-authz.ts`
  **Sintoma:** Klio aparece como domínio de estudo, mas conversas são criadas como `kharis`; API de chat não aceita `klio`.  
  **Causa provável:** renomeações históricas de Kalisto/Klio/Kháris e absorção parcial de Klio.  
  **Impacto:** permissões, prompts, histórico e UX podem misturar cuidado com estudo.  
  **Correção recomendada:** decidir oficialmente se Klio terá facet de chat própria ou se é superfície de Kháris; ajustar API, prompts e docs.  
  **Risco da correção:** Médio  
  **Prioridade:** P0

## [ALTO] Matriz de autorização bloqueia ou expõe rotas de forma contraditória

**Área:** Auth / UX  
**Status:** implementado/confuso  
**Arquivos envolvidos:**

- `src/routes/_authenticated/route.tsx`
- `src/lib/use-authz.ts`
- `src/components/app-sidebar.tsx`
  **Sintoma:** Usuários comuns por faceta podem ser redirecionados de rotas que deveriam acessar; sidebar e beforeLoad não têm a mesma matriz.  
  **Causa provável:** regras hardcoded em arrays separados.  
  **Impacto:** usuário Klio pode não acessar Códice; Drive não é facet; admin/user têm experiências inconsistentes.  
  **Correção recomendada:** criar matriz central de rotas por facet e usar no beforeLoad/sidebar/Home.  
  **Risco da correção:** Médio  
  **Prioridade:** P0

## [ALTO] Home e sidebar ainda apontam para rotas/nomes legados

**Área:** UX / Produto  
**Status:** legado  
**Arquivos envolvidos:**

- `src/routes/_authenticated/home.tsx`
- `src/components/app-sidebar.tsx`
  **Sintoma:** Home mostra “Livros” e `/camara`, enquanto arquitetura nova usa Códice e Câmara do Eco.  
  **Causa provável:** migração visual incompleta.  
  **Impacto:** usuário não entende o hub; mock e motor real se confundem.  
  **Correção recomendada:** Home com cards de microapps/domínios e status real/mock/legado; sidebar alinhada.  
  **Risco da correção:** Médio  
  **Prioridade:** P1

## [ALTO] Hosts de microapp não seguem contrato único

**Área:** Microapp / Host / Segurança  
**Status:** implementado parcial  
**Arquivos envolvidos:**

- `src/components/CodiceHost.tsx`
- `src/components/microapps/CamaraDoEcoHost.tsx`
  **Sintoma:** Cada host valida mensagens e layout de forma diferente; fallback inexistente.  
  **Causa provável:** evolução orgânica por microapp.  
  **Impacto:** risco de segurança, bugs de iframe, scroll duplo e ações sensíveis inconsistentes.  
  **Correção recomendada:** PR para `MicroappHost`/registry com validação `origin/source/action`, fallback e loading.  
  **Risco da correção:** Médio  
  **Prioridade:** P1

## [MÉDIO] Câmara do Eco tem superfície mockada e motor real separados

**Área:** Microapp / Produto  
**Status:** mockado + legado real  
**Arquivos envolvidos:**

- `public/camara-do-eco/index.html`
- `src/components/microapps/CamaraDoEcoHost.tsx`
- `src/routes/_authenticated/camara.tsx`
- `src/routes/api/camara-transcribe-segment.ts`
  **Sintoma:** usuário pode abrir Câmara visual sem motor real ou rota antiga com motor sem visual novo.  
  **Causa provável:** migração correta em duas etapas, ainda não finalizada.  
  **Impacto:** expectativa falsa de feature pronta.  
  **Correção recomendada:** rotular claramente mock; depois integrar texto/upload/transcrição por ações.  
  **Risco da correção:** Médio  
  **Prioridade:** P1

## [MÉDIO] Kaline Presente e Modo Fala têm HTML público não integrado

**Área:** Microapp / UX  
**Status:** resolvido
**Arquivos envolvidos:**

- protótipos HTML públicos simulados, removidos do deploy
- `src/routes/_authenticated/klio.tsx`
- `src/routes/_authenticated/kaline-presente.tsx`
  **Sintoma anterior:** existiam superfícies HTML, mas as rotas usavam React real.
  **Causa:** protótipos visuais conviviam com motores reais.
  **Impacto removido:** manutenção duplicada e expectativa falsa de funcionamento.
  **Correção aplicada:** os protótipos públicos foram removidos e a implementação React real foi preservada.
  **Risco da correção:** Baixo  
  **Prioridade:** P2

## [MÉDIO] Kuan-Yin tem base rica, mas falta teste de fluxo vendável ponta-a-ponta

**Área:** Produto / Supabase / UX  
**Status:** implementado parcial  
**Arquivos envolvidos:**

- `src/routes/_authenticated/kuan-yin.*.tsx`
- `src/routes/g.$guardianId.tsx`
- `src/routes/portal.$token.tsx`
- `supabase/migrations/*kuanyin*.sql`
  **Sintoma:** há muitas peças comerciais, mas não há checklist claro de venda real.  
  **Causa provável:** implementação por módulos sem narrativa final única.  
  **Impacto:** produto difícil de vender/demonstrar.  
  **Correção recomendada:** criar fluxo de aceite: guardião → página pública → conversa → agendamento → calendário → comprovante.  
  **Risco da correção:** Médio  
  **Prioridade:** P1

## [MÉDIO] Memória precisa ritual formal de candidatos

**Área:** Memória / Segurança / Produto  
**Status:** implementado parcial  
**Arquivos envolvidos:**

- `src/routes/_authenticated/revisao.tsx`
- `src/routes/_authenticated/jardim.tsx`
- `src/lib/jardim.functions.ts`
- `src/lib/sedimentar.functions.ts`
  **Sintoma:** microapps podem gerar conteúdos importantes sem fluxo explícito de aprovação.  
  **Causa provável:** Registro/Jardim existem antes da padronização dos microapps.  
  **Impacto:** risco de memória falsa, privada ou prematura.  
  **Correção recomendada:** criar candidatos à memória com revisão humana obrigatória.  
  **Risco da correção:** Médio  
  **Prioridade:** P1

## [BAIXO] Showroom Kuan-Yin externo não tem host/fallback padronizado

**Área:** Microapp / UX  
**Status:** implementado parcial  
**Arquivos envolvidos:**

- `src/routes/_authenticated/kuan-yin.showroom.tsx`
  **Sintoma:** iframe externo pode falhar por política do site/WebView.  
  **Causa provável:** integração direta sem host genérico.  
  **Impacto:** demo comercial pode quebrar.  
  **Correção recomendada:** usar padrão de host externo com fallback e health check visual.  
  **Risco da correção:** Baixo  
  **Prioridade:** P2

## 22. Roadmap em fases

### Fase 1 — Coerência do shell

- Corrigir `public/sw.js`.
- Criar matriz central de domínios/rotas/facetas.
- Limpar Home para hub modular.
- Limpar sidebar com grupos: Kaline, Klio, Códice, Câmara do Eco, Kuan-Yin, Kháris, Drive, Memória.
- Definir compatibilidade `/livros` e `/camara`.
- Criar status visual real/mock/legado.
- Padronizar estados de erro/fallback.

### Fase 2 — Superfícies HTML validadas

- Criar `MicroappHost`/registry.
- Migrar `CodiceHost` para padrão.
- Migrar `CamaraDoEcoHost` para padrão.
- Decidir Modo Fala e Kaline Presente: React real vs híbrido vs HTML.
- Manter rotas legadas com redirect ou aviso.

### Fase 3 — Motores reais integrados

- Códice: upload/acervo/margem/fichamento/tela acesa reais por contrato host.
- Câmara: upload/texto/transcrição/ata/decisões/pendências reais.
- Modo Fala: estados confiáveis de voz, parar, timeout e fallback.
- Kaline Presente: presença conversável com TTS robusto.

### Fase 4 — Memória com ritual

- Criar candidatos à memória.
- Revisão humana obrigatória.
- Jardim/Mnemósine como sedimentação.
- Edição/exclusão/privacidade.
- Códice e Câmara enviam candidatos, não fatos duráveis.

### Fase 5 — Produto vendável

- Kuan-Yin Guardião ponta-a-ponta.
- Página pública sem login.
- Serviços/agendamento/calendário.
- Comprovantes/pagamento.
- Showroom confiável.
- Painel do guardião com onboarding.

### Fase 6 — Robustez

- Observabilidade com `trace_id`.
- Logs categorizados sem payload privado.
- Cloudflare runtime checklist.
- Offline/online bridge.
- Performance premium e lazy loading.

## 23. Quick wins

1. Corrigir `CACHE_VERSION` duplicado em `public/sw.js`.
2. Trocar Home: “Livros” → “Códice” e `/livros` → `/klio/codice`.
3. Trocar Home: “Câmara de Eco” → “Câmara do Eco” e `/camara` → `/camara-do-eco`, deixando `/camara` como “motor legado” se necessário.
4. Adicionar validação `event.origin` em `CamaraDoEcoHost`.
5. Adicionar validação `event.source` em `CodiceHost`.
6. Criar pequena doc `docs/microapps-host-contract.md` antes de refatorar.
7. Ajustar `FACET_APPLE` para incluir Klio ou remover dependência visual incompleta.
8. Explicitar na UI da Câmara que a superfície atual é mockada.

## 24. PRs recomendados

### PR 1 — auditoria documental

**Objetivo:** registrar esta varredura mestra como base de decisão.  
**Arquivos prováveis:** `docs/kaline-totalidade-auditoria-mestra.md`.  
**Risco:** baixo.  
**Critérios de aceite:** documento responde arquitetura real, microapps, hosts, rotas, facetas, riscos e roadmap.  
**Testes:** `npm run build`, `npm run typecheck`, `npm run test`, `npm run lint`.

### PR 2 — corrigir PWA/cache e compatibilidade de app instalado

**Objetivo:** consertar service worker, versão única de cache e fallback offline.  
**Arquivos prováveis:** `public/sw.js`, talvez `public/manifest.webmanifest`.  
**Risco:** baixo.  
**Critérios de aceite:** service worker registra sem erro; app instalado atualiza HTML de microapps.  
**Testes:** build, install/update manual, DevTools Application.

### PR 3 — matriz de rotas/facetas do shell

**Objetivo:** centralizar autorização e visibilidade por domínio.  
**Arquivos prováveis:** `src/lib/use-authz.ts`, novo `src/lib/app-registry.ts`, `src/routes/_authenticated/route.tsx`, `src/components/app-sidebar.tsx`.  
**Risco:** médio.  
**Critérios de aceite:** admin vê tudo; klio vê `/klio`, `/modo-fala`, `/klio/codice`; kuanyin vê Kuan-Yin; kharis vê Kháris; kaline vê hub pessoal.  
**Testes:** typecheck, testes manuais por perfis.

### PR 4 — padrão `MicroappHost`

**Objetivo:** criar host genérico com validação de origin/source/action, fallback e loading.  
**Arquivos prováveis:** `src/components/microapps/MicroappHost.tsx`, migração leve de Códice/Câmara.  
**Risco:** médio.  
**Critérios de aceite:** Códice e Câmara continuam abrindo; mensagens inválidas são ignoradas; fallback aparece em erro.  
**Testes:** typecheck, testes manuais de postMessage.

### PR 5 — limpar Home/sidebar para arquitetura de hub

**Objetivo:** alinhar nomes, grupos e links à arquitetura real.  
**Arquivos prováveis:** `src/routes/_authenticated/home.tsx`, `src/components/app-sidebar.tsx`.  
**Risco:** médio.  
**Critérios de aceite:** sem “Livros” como destino primário; Câmara nova em destaque; status real/mock/legado visível.  
**Testes:** build, navegação manual mobile/desktop.

### PR 6 — concluir Códice por contrato de ações

**Objetivo:** integrar upload/acervo/margem/fichamento com host sem Supabase direto no HTML.  
**Arquivos prováveis:** `CodiceHost`, rotas `klio.codice.*`, `LegacyLivrosEngine`, libs de Códice.  
**Risco:** médio/alto.  
**Critérios de aceite:** upload real, acervo real, margem salva, fichamento gerado, `/livros` compatível.  
**Testes:** upload PDF/texto, leitura, offline/local-first.

### PR 7 — integrar motor real da Câmara do Eco

**Objetivo:** conectar HTML mockado a motor de texto/upload/transcrição/ata.  
**Arquivos prováveis:** `CamaraDoEcoHost`, `/camara`, `camara.functions`, API de transcrição, novas actions.  
**Risco:** alto.  
**Critérios de aceite:** texto colado gera ata; áudio gera transcrição; decisões/pendências aparecem; candidatos à memória não salvam direto.  
**Testes:** transcrição curta, texto colado, erro sem OpenRouter.

### PR 8 — Kuan-Yin vendável ponta-a-ponta

**Objetivo:** validar fluxo guardião→cliente→agenda→comprovante.  
**Arquivos prováveis:** rotas `kuan-yin.*`, `g.$guardianId`, `portal.$token`, funções públicas.  
**Risco:** médio/alto.  
**Critérios de aceite:** cliente sem login agenda e guardião vê no calendário com dados corretos.  
**Testes:** fluxo manual com usuário guardião e cliente anônimo.

## 25. Testes manuais sugeridos

### Shell/auth

- Login admin → `/home`, sidebar completa, todos os microapps abrem.
- Login `assigned_facet=klio` → deve cair em `/klio`, ver Códice e Modo Fala, não ser bloqueado.
- Login `assigned_facet=kuanyin` → deve cair em `/kuan-yin`, sem ver rotas pessoais indevidas.
- Login `assigned_facet=kharis` → deve cair em `/kharis`.
- Login `assigned_facet=kaline` → deve cair no hub pessoal coerente.

### Microapps

- Abrir `/klio/codice` e verificar iframe, ações e acervo.
- Abrir `/livros` e confirmar redirect compatível.
- Abrir `/camara-do-eco` e verificar estados mockados.
- Abrir `/camara` e confirmar motor legado real ainda funciona.
- Simular `postMessage` inválido e confirmar que host ignora.

### Voz/IA

- Modo Fala: gravar, transcrever, enviar chat, ouvir TTS, parar fala.
- Kaline Presente: repetir fluxo e testar erro sem TTS.
- Transcrição: arquivo suportado, arquivo grande, tipo inválido.
- TTS: texto longo > limite e chunking/fallback.

### Kuan-Yin

- Criar guardião.
- Configurar negócio.
- Abrir página pública sem login.
- Criar agendamento/pedido.
- Ver no painel do guardião.
- Testar portal por token.

### PWA

- Instalar app.
- Abrir offline.
- Atualizar service worker.
- Abrir microapps após deploy novo.
- Verificar ausência de tela preta/chunk antigo.

## 26. Critérios de “Kaline app foda”

A Kaline só deve ser considerada pronta para vender/encantar quando cumprir estes critérios:

1. **Clareza:** usuário sabe em qual domínio está e por que.
2. **Confiança:** nada mockado se apresenta como real.
3. **Velocidade:** Home carrega leve; motores pesados são lazy.
4. **Coerência:** sidebar, Home, rotas e permissões contam a mesma história.
5. **Segurança:** HTML público nunca toca segredo, token ou Supabase direto.
6. **Utilidade:** Códice lê de verdade; Câmara processa reunião de verdade; Kuan-Yin agenda de verdade; voz responde de verdade.
7. **Memória responsável:** fatos importantes passam por revisão humana.
8. **PWA robusto:** app instalado atualiza sem tela preta e sem cache velho.
9. **Produto vendável:** Kuan-Yin tem fluxo completo demonstrável para cliente final e guardião.
10. **Arquitetura modular:** novo microapp entra por registry/host, não por gambiarra.
11. **Estados humanos:** vazios e erros explicam o que aconteceu e o próximo passo.
12. **Observabilidade:** falhas têm categoria, trace e solução provável sem vazar dados privados.

## Respostas finais aos critérios da varredura

1. **Arquitetura real atual:** shell autenticado React com rotas TanStack, algumas superfícies HTML em `public/`, hosts específicos para Códice/Câmara, motores reais em rotas React/APIs/Supabase.
2. **Microapps HTML existentes:** Códice, Câmara do Eco, Modo Fala Klio, Kaline Presente.
3. **Microapps planejados/candidatos:** Registro Vivo como superfície, Kuan-Yin showroom próprio, futuras superfícies Kaline.
4. **Hosts existentes:** `CodiceHost`, `CamaraDoEcoHost`; showroom usa iframe direto; não há `MicroappHost`.
5. **Motores a preservar:** Livros/PDF/resumo, Câmara `/camara`, transcrição, TTS, chat, Kuan-Yin comercial, Registro/Jardim.
6. **Rotas certas:** `/klio/codice`, `/camara-do-eco`, `/kuan-yin`, `/kharis`, `/drive`, `/registro-vivo`, `/jardim`, `/revisao` existem.
7. **Rotas quebradas/legadas:** `/livros` é redirect bom, mas Home ainda usa nome legado; `/camara` é motor real legado; `/modo-fala` redirect; `/klio-estudo` precisa decisão.
8. **Permissões confusas:** Klio vs Kháris; fallback admin; Drive sem facet; matriz duplicada em sidebar/beforeLoad.
9. **Partes mock:** HTML da Câmara, HTML de Códice em parte, HTML de Modo Fala/Kaline Presente, showroom externo como demo.
10. **Partes reais:** chat, TTS, transcrição, Câmara legada, Kuan-Yin tabelas/rotas, memória básica, Códice schema/rotas.
11. **Primeiro a fazer:** corrigir PWA cache, matriz de facetas/rotas, Home/sidebar, contrato de host.
12. **O que esperar:** integração profunda dos motores Códice/Câmara e memória candidata.
13. **Sequência ideal de PRs:** auditoria → PWA/cache → matriz shell → MicroappHost → Home/sidebar → Códice real → Câmara real → Kuan-Yin vendável.
