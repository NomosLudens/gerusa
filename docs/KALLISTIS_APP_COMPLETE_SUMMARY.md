# KALLISTIS APP — resumo estrutural autossuficiente

**Data de referência:** 2026-08-31
**Repositório:** `/home/tonyus-dev/Portifolio/KALLISTIS/kallistis`
**Estado de código de referência:** `master`, `d50f1258e7888f3ec7d949fd1917193dcf72a11f`
**Runtime de produção conhecido:** `/srv/kallistis` na VM Max, serviço `kallistis.service`
**Objetivo deste arquivo:** permitir que um agente entenda o produto, seus limites e seu estado sem depender de contexto de conversas anteriores.

> Este é o mapa operacional consolidado do KALLISTIS. “Existe no código” não significa “foi provado em produção”. Cada seção separa implementação, evidência e incerteza para não transformar intenção, mock ou legado em funcionalidade real.

## 1. Como interpretar o estado

- **REAL / PRODUÇÃO COMPROVADA:** houve fluxo manual e/ou prova operacional correspondente.
- **IMPLEMENTADO:** há código funcional e integração prevista, mas a aceitação de produção pode ser parcial.
- **UNVERIFIED:** não houve evidência suficiente do ambiente específico; não declarar pronto.
- **LEGADO / ISOLADO:** permanece no repositório ou tem rota protegida, mas não pertence ao núcleo ativo atual.
- **PLANEJADO:** aparece como intenção, contrato ou documentação, sem funcionalidade comprovada.
- **BLOQUEADO:** a prova exigida depende de uma capacidade ou autoridade ausente.

Regra permanente: build, lint e testes são evidência de código; não substituem abrir o app, executar o fluxo real, verificar a fonte real dos dados e provar o resultado no ambiente-alvo.

## 2. O que é o KALLISTIS

KALLISTIS é um universo narrativo e RPG digital centrado em identidade, memória, relação e possibilidade após a **Grande Fratura**. O produto combina:

1. uma conversa autenticada com o assistente Hermes;
2. criação, evolução e publicação de personagens;
3. superfícies de consulta do cânone, incluindo Velarim;
4. memória pessoal revisada e sedimentação progressiva;
5. registro, agenda, presença e revisão editorial;
6. microapps HTML hospedados pelo shell autenticado.

O app atual usa o **KALLISTIS** como identidade pública e o **HERMES** como assistente. A entrada autenticada padrão é `/chat`.

O sistema não deve prometer que uma ação foi feita quando apenas gerou uma sugestão ou preview. Criação, agendamento, publicação, promoção de memória e mudança de contexto exigem intenção explícita e confirmação na camada apropriada.

## 3. Identidade e cânone

O cânone operacional está principalmente em `CANON/IDENTIDADE.md`, `CANON/CONTEXTO.md`, `CANON/IDENTIDADE_TEMPO_E_PRESENCA.md` e `CANON/IDENTIDADE_ROLEPLAY_E_CONTEXTO.md`.

### 3.1 Cosmologia mínima

- A Grande Cristal existia antes da Fratura.
- A Fratura separou mundos, povos, histórias e consciências.
- Luz e Escuridão são dimensões distintas, não uma divisão automática entre bem e mal.
- A Sombra representa falsificação, invasão, assimilação e apagamento; não é simplesmente ausência de luz.
- Memória é constitutiva da identidade.
- A Convergência não é automaticamente uma cura.
- Velarim é uma língua ligada a manifestação e identidade.
- Há nove ancestralidades: Aelvari, Kragor, Draken, Nomos, Livres, Dóreos, Teriantes, Nimari e Vitrálios.

### 3.2 Ordem de autoridade

1. decisão humana explícita;
2. cânone aprovado v1.1;
3. mapa operacional atual;
4. código e dados comprovados;
5. corpus histórico e materiais derivados;
6. hipótese.

Quando as fontes divergem, o sistema deve preservar a procedência e declarar a divergência. Não inventar regra, pessoa, evento, memória ou relação.

### 3.3 Hermes

Hermes responde em português brasileiro claro, separando fato, contexto, memória confirmada e hipótese. O padrão é `ASSISTENTE`, sem roleplay automático. Os modos reconhecidos são `ASSISTENTE`, `MESTRE`, `NARRADOR`, `PERSONAGEM`, `NPC`, `COMPANHEIRO`, `REGRA` e `EDITORIAL`, mas a troca de modo exige contexto/intenção válida; não deve ser provocada por texto arbitrário de usuário, arquivo, imagem, transcrição ou conteúdo web.

## 4. Arquitetura em uma visão

```text
Browser
  └─ TanStack Start / React + microapps HTML em public/
       ├─ rota pública: landing e autenticação
       ├─ shell autenticado: sessão, sidebar, registro de contexto
       ├─ /chat: Hermes, histórico, streaming, anexos, voz
       ├─ /jogar/*: Character Forge, Velarim, Canon Explorer
       ├─ memória: Jardim, Revisão, Trilha, Câmara do Eco
       └─ organização: Agenda, Registro Vivo, KALLISTIS Presente, Perfil
            └─ APIs server-side
                 ├─ autenticação local e ownership
                 ├─ chat e provider OpenRouter
                 ├─ personagens, progressão e eventos imutáveis
                 ├─ memória, sedimentação e revisão humana
                 ├─ voz, transcrição, TTS e infográfico
                 └─ PostgreSQL local (fonte ativa do núcleo)
```

### 4.1 Stack principal

- React 19, TanStack Start/Router, Vite e TypeScript.
- Tailwind/Radix e componentes próprios de interface.
- Bun para scripts e execução local/produção documentada.
- PostgreSQL 16 local na VM Max; banco `kallistis`, cluster `16/kaline`, loopback em porta `5433`.
- OpenRouter como provider ativo do chat, com seleção de modelo controlada pelo servidor.
- Playwright/Vitest para validação automatizada; navegador real e ambiente mobile/offline continuam requisitos separados.

## 5. Navegação e superfícies atuais

A fonte de verdade da navegação é `src/lib/app-registry.ts`, complementada por `src/lib/identity-routing.ts`.

| ID                   | Rota                          | Tipo          | Estado no registro | Função                                    |
| -------------------- | ----------------------------- | ------------- | ------------------ | ----------------------------------------- |
| `kallistis-chat`     | `/chat`                       | React         | real               | conversa autenticada com Hermes           |
| `kallistis-presente` | `/kallistis-presente`         | React         | real               | presença, abertura do dia e voz           |
| `camara-do-eco`      | `/camara`                     | microapp HTML | real               | captura, transcrição e análise de sessões |
| `jardim`             | `/jardim`                     | React         | real               | memórias duráveis confirmadas             |
| `revisao`            | `/revisao`                    | microapp HTML | real               | revisão de candidatos e memórias          |
| `registro-vivo`      | `/registro-vivo`              | React         | real               | notas, eventos e marcas do dia            |
| `agenda`             | `/agenda`                     | microapp HTML | real               | compromissos, aulas, reuniões e prazos    |
| `trilha`             | `/trilha/$threadId`           | React         | real, não sidebar  | percurso em camadas a partir de conversa  |
| `perfil`             | `/perfil`                     | sistema       | real               | perfil e preferências                     |
| `perfis`             | `/perfis`                     | sistema       | oculto/admin       | painel administrativo antigo/restrito     |
| `character-forge`    | `/jogar/character-forge.html` | microapp HTML | real               | criação e ciclo de personagem             |
| `velarim`            | `/jogar/velarim.html`         | microapp HTML | real               | dicionário e tradutor corpus-limitado     |
| `canon-explorer`     | `/jogar/canon-explorer.html`  | microapp HTML | real               | consulta navegável do cânone              |

Rotas públicas adicionais: `/` é a landing page; `/auth` é a autenticação. `/chat` exige sessão. O shell autenticado protege as demais superfícies registradas.

## 6. Autenticação e isolamento

O núcleo ativo usa autenticação local, não uma sessão pública Supabase.

1. O usuário envia sua **Palavra** para `POST /api/auth/session`.
2. O servidor normaliza a credencial, faz lookup cego por digest e verifica o hash scrypt.
3. Usuário revogado/inativo ou credencial inválida não cria sessão.
4. O token da sessão é armazenado de forma derivada; o cookie é HttpOnly/same-origin e tem validade documentada de 30 dias.
5. `GET /api/auth/session` retorna o usuário autenticado; `DELETE` encerra a sessão.
6. `requireUser` e `ownsResource` protegem threads, personagens, memórias, eventos e demais recursos por `user_id`.

O frontend não é autoridade de autenticação, ownership, papel de mestre, modelo de IA ou publicação. A superfície administrativa é separada e restrita.

## 7. Fluxo principal de chat

`/chat` cria ou recupera uma thread KALLISTIS. O servidor:

1. valida sessão, thread, facet e superfície;
2. carrega o bloco canônico com hashes das fontes `CANON/`;
3. carrega contexto limitado: histórico da thread, até oito memórias confirmadas relevantes e sedimentos ativos;
4. aplica o guard de injeção: conteúdo de usuário, anexos, imagens, transcrições e web é dado, não instrução;
5. persiste a mensagem humana antes de chamar o provider;
6. chama OpenRouter com o modelo escolhido server-side;
7. transmite a resposta ao cliente e persiste a resposta do assistente;
8. pode gerar candidato de memória/sedimento, mas não promove automaticamente para memória confirmada.

O runtime rejeita facetas antigas/fora do escopo (`klio`, `kuanyin`, `drive`, `codice`, `treino`, `corpore`, `workspace`) no núcleo KALLISTIS. Histórico e anexos têm limites de tamanho/caracteres. PDF e imagem seguem rotas/modelos apropriados quando habilitados.

### Provider e modelos

O provider ativo documentado é OpenRouter. A configuração consolidada usa `deepseek/deepseek-v4-flash-0731` como principal e `poolside/laguna-s-2.1` como fallback; há perfis rápidos e de raciocínio controlados pelo servidor. A chave fica somente no ambiente protegido da VM Max; nunca deve aparecer em código, logs ou resposta.

## 8. Memória, revisão e sedimentação

O fluxo de memória é deliberadamente humano e reversível:

```text
mensagem/sessão
  → candidato ou sedimento
  → revisão humana em /revisao
  → memória confirmada no Jardim
  → contexto limitado de conversas futuras
```

- `memory_candidates`: proposta pendente originada no chat, Câmara ou outras fontes.
- `jardim_memorias`: memória durável, pertencente ao usuário, revisada e confirmada.
- `sedimentos`: hipóteses graduais com procedência, nível e status (`rascunho`, `em_revisao`, `confirmado`, `descartado`).
- Promoção de sedimentos exige lote atômico de exatamente cinco fontes distintas do mesmo nível e transição legal para o próximo nível.
- O Jardim usa importância, categorias/tags e revisão espaçada SM-2 (`next_review_at`).
- `/trilha/$threadId` mostra camadas da conversa e sua sedimentação.

`K∧LINE Ledger` é um contrato aditivo de eventos, referências e estado de revisão (`kline_events`, `kline_event_refs`, `kline_event_review_state`). Ele organiza handoff/proveniência; não autoriza promoção automática nem substitui a revisão do Jardim.

## 9. Character Forge

`/jogar/character-forge.html` é um microapp HTML conectado por bridge versionada ao backend local. O ciclo comprovado é:

```text
criar rascunho → salvar/recarregar → conversar com assistente
→ enviar → revisar/aprovar → publicar → usar quickref/contexto
→ solicitar progressão → aplicar nova versão/evento
```

O backend mantém:

- `characters` com estado de ciclo (`draft`, `submitted`, `approved`, `rejected`, `archived`);
- `character_versions` como snapshots;
- `character_events` imutáveis;
- `character_progression_requests` para progressão controlada;
- `character_creation_messages` para a conversa de criação.

Há ownership por usuário, capacidade de mestre/revisor conforme configuração e snapshot canônico separado do objeto visual do cliente. O hardening rejeita importações inválidas (por exemplo, técnica inventada ou campo numérico incorreto) antes de qualquer escrita.

Evidência histórica de PR4/PR5C: ciclo de criação, aprovação, publicação, evento e progressão Marco 1→2 foram provados; reaplicação duplicada foi bloqueada; limpeza dos dados sintéticos foi verificada; a regressão chegou a 50 suítes/371 testes. Isso não autoriza extrapolar para capacidades de campanha ou roleplay não implementadas.

## 10. Cânone, Velarim e conhecimento

### Velarim

`/jogar/velarim.html` contém um corpus embarcado de 68 palavras, dicionário, filtros por classe, detalhe de entrada, tradução Velarim↔Português, builder e gramática. A tradução é determinística e limitada ao corpus; histórico local tem no máximo 12 entradas deduplicadas. Não é um tradutor geral nem deve inventar vocabulário.

### Canon Explorer

`/jogar/canon-explorer.html` contém um dataset embarcado com metadados do Manual do Mundo, versão `Manuscrito Único FREEZE v1.3`, fingerprint `5dfa3332e488` e 420 entradas. Categorias: Mundo, História, Lugares, Povos, Ofícios, Conceitos, Velarim, Regras, Criaturas e Obra. Histórico, favoritos e consultas são locais e limitados. A integridade verificada incluiu IDs únicos, categorias válidas, relações válidas e ausência de referências externas.

Essas superfícies consultam dados embarcados; não devem ser descritas como busca live ou autoridade externa.

## 11. Outras superfícies funcionais

- **KALLISTIS Presente:** presença, regime do dia, voz e sinais de atividade; integra `use-presenca-regime`, `KittScanner` e `kitt-pulse`.
- **Câmara do Eco:** captura de áudio no browser (`getUserMedia`/`MediaRecorder`), segmentos, transcrição, análise estruturada, ata Markdown, infográfico SVG e candidatos para revisão. A publicação de memória ainda exige humano.
- **Agenda:** eventos por usuário, compromissos, aulas, reuniões, prazos e retornos; microapp em `public/microapps/agenda`.
- **Registro Vivo:** notas, acontecimentos e marcas de presença do dia.
- **Jardim:** leitura/gestão das memórias duráveis confirmadas.
- **Revisão:** fila de candidatos e revisão de memórias com espaçamento.
- **Trilha:** visualização do percurso e das camadas de uma thread.
- **Perfil:** perfil do usuário e preferências.
- **Voz:** captura de áudio, STT/transcrição, TTS e interação de voz por browser/API. O código existe; a prova de cada provider e dispositivo deve ser tratada separadamente.

Quando não houver relatório de aceitação específico para uma superfície, seu status correto é **IMPLEMENTADO/UNVERIFIED**, não “produção comprovada”.

## 12. APIs e capacidades server-side

As rotas em `src/routes/api` incluem, entre outras:

- `/api/auth/session` — sessão local;
- `/api/chat` e `/api/chat/thread` — threads, mensagens e streaming;
- `/api/transcribe` e `/api/tts` — voz;
- `/api/camara-transcribe-segment` — segmentos da Câmara;
- `/api/generate-infografico` — infográfico;
- `/api/characters` — ciclo e progressão de personagens;
- `/api/public/health` e `/api/public/ready` — saúde/readiness públicos;
- `/api/channels/telegram` e `/api/channels/telegram-dialogue` — integração de canal, isolada por credenciais/configuração;
- endpoints de bridge para microapps e recursos derivados.

Os handlers server-side devem validar sessão, ownership, payload canônico e permissões. Uma resposta HTTP 200 isolada não prova saúde integral, uso real de banco ou funcionamento ponta a ponta.

## 13. Banco de dados e migrações

As migrações ativas estão em `db/migrations/0001_identity.sql` até `0011_character_publication_and_progression_hardening.sql`. O ledger é `public.kallistis_schema_migrations`, com versão, nome, SHA-256 e estado de verificação.

Tabelas centrais:

`users`, `credentials`, `sessions`, `chat_threads`, `chat_messages`, `memory_candidates`, `jardim_memorias`, `sedimentos`, `kallistis_schema_migrations`, `characters`, `character_versions`, `character_events`, `character_progression_requests` e `character_creation_messages`.

Hardening relevante:

- funções atômicas de aprovação, confirmação e promoção de memória;
- ownership e status verificados no banco;
- idempotência para operações de memória/progressão;
- evento de personagem imutável;
- progressão limitada de Marco `n` para `n+1`;
- uma progressão ativa/aplicada por regra;
- grants reduzidos para runtime;
- defaults ambíguos de facet/surface removidos;
- UPDATE de mensagens restaurado somente onde o upsert real exige.

O PostgreSQL local é a autoridade ativa do core KALLISTIS. Migrações e integrações Supabase em `supabase/migrations_legacy`, `supabase/migrations_archive` e `src/integrations/supabase` são legado/isolamento histórico; sua presença no repositório não prova dependência de produção.

## 14. Runtime e operação

Em produção, `serve.mjs` envolve `dist/server/server.js`, serve estáticos de `dist/client`, usa HTML sem cache e assets versionados/imutáveis. O serviço `kallistis.service` roda no diretório `/srv/kallistis`, inicia com Bun e depende de `pg_isready` antes de subir.

O serviço `kaline.service` é separado. Em qualquer operação do KALLISTIS, não parar, reconfigurar ou misturar esse serviço sem autorização explícita. O deploy comprovado do PR6 exigiu rebuild remoto porque o serviço servia `dist/client`; editar fonte ou reiniciar sem rebuild não atualiza o browser.

Segredos (`OPENROUTER_API_KEY`, Palavra e credenciais de infraestrutura) pertencem ao ambiente protegido e nunca devem ser copiados para o repositório, comandos, screenshots ou relatório.

## 15. Histórico consolidado do trabalho

| Fase/PR               | Resultado                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Fundação e core local | chassis TanStack/React, shell, identidade, auth local e PostgreSQL; estados iniciais bloqueados foram posteriormente resolvidos                 |
| PR1                   | grant/fluxo de criação de thread, persistência e least privilege; `PASS`                                                                        |
| PR2 / PR2.1           | OpenRouter, identidade visual, streaming, persistência, reload, continuidade e lifecycle de auth; `PASS`                                        |
| PR3                   | hardening do core, ledger de migrações, modelo server-authoritative, separação de Supabase legado e freeze do core; `PASS`, `CORE_FREEZE=YES`   |
| PR4                   | ciclo de personagens, aprovação/publicação, quickref/contexto, eventos e progressão; `PASS`                                                     |
| PR5A / PR5B           | aceitação inicial de fluxos de usuário e importação encontrou falhas; não foram maquiadas                                                       |
| PR5C                  | snapshot canônico, correção da progressão, rejeição de import inválido, limpeza e regressão; `PR5C_STATUS=PASS`, `PR5B_STATUS=RESOLVED_BY_PR5C` |
| PR6                   | Velarim e Canon Explorer, correção do overlay de navegação JOGAR, rebuild/restart isolado; conhecimento `PASS_WITH_GATES_UNVERIFIED`            |
| PR6.1                 | tentativa de aceitação offline/mobile; sem controle real de Network Offline/Device Toolbar no conector disponível; sem mudança de código        |

O estado final do PR6 não deve ser chamado de `PASS_FROZEN`: a prova real de offline e mobile ficou **UNVERIFIED**, portanto o gate global permaneceu `FAIL`.

## 16. Evidências e limites atuais

Comprovado nos relatórios consolidados:

- checkout `master` limpo e sincronizado no SHA de referência;
- serviço e banco de produção conhecidos ativos durante as missões correspondentes;
- chat autenticado com persistência e provider real em E2E histórico;
- ciclo de personagem e progressão com ownership, eventos e limpeza;
- integridade do dataset Canon Explorer 420/420;
- regressão local final documentada: 50 suítes/371 testes, além de lint, typecheck e build;
- correção visual do overlay JOGAR aplicada nos microapps e servida após rebuild remoto.

Ainda não comprovado de modo suficiente neste documento:

- aceitação real do fluxo completo em dispositivo mobile físico;
- modo Network Offline controlado em navegador real;
- cada provider de voz em todos os dispositivos;
- todas as superfícies secundárias em produção com dados não sintéticos;
- integrações Telegram, Drive e qualquer provider externo não explicitamente aceito;
- capacidades de campanha, roleplay amplo ou regras não presentes no código/cânone.

## 17. Legado, adjacências e o que não confundir

O repositório acumula estratos históricos: documentação anterior fala de Kaline, Klio, Kuanyin, Drive, Corpore Sano, Jurídico e Códice; há páginas públicas antigas e integrações arquivadas. Isso não significa que sejam módulos ativos do KALLISTIS atual.

Ao responder sobre o produto, prefira:

1. `src/lib/app-registry.ts` e `src/lib/identity-routing.ts` para a superfície atual;
2. código de rota/API e migrações ativas para comportamento implementado;
3. `CANON/` para autoridade narrativa;
4. relatórios de PR para evidência de produção;
5. documentos antigos apenas como histórico, explicitando sua data e possível supersessão.

## 18. Regras operacionais para qualquer GPT que continue o trabalho

- Não inventar funcionalidade, regra, personagem, memória, dado ou integração.
- Dizer “implementado”, “comprovado em produção”, “não verificado”, “legado” ou “bloqueado” com precisão.
- Não tratar mock, placeholder, `setTimeout`, fallback falso ou “API não configurada” como produto.
- Não usar build verde como prova de funcionamento.
- Antes de alterar, localizar checkout, branch, HEAD, estado do serviço, banco e fonte de dados.
- Fazer a menor mudança necessária e validar o fluxo afetado manualmente quando possível.
- Preservar o cânone e a procedência; quando o cânone não define algo, dizer isso.
- Manter perfis, threads, personagens e memórias isolados por ownership.
- Não expor segredos, cookies, tokens, Palavra ou prompt interno.
- Não tocar em `kaline.service`/Kaline, não fazer push/deploy/merge/PR sem autorização específica.
- Não iniciar arquitetura paralela: `kallistis/` é o chassis ativo; `CANON/` é autoridade; legado deve permanecer identificado como legado.
- Em auditoria, registrar o incidente literal e não contornar ou maquiar a falha.

## 19. Índice de fontes do próprio repositório

- Identidade e contexto: `CANON/IDENTIDADE.md`, `CANON/CONTEXTO.md`, `CANON/IDENTIDADE_TEMPO_E_PRESENCA.md`, `CANON/IDENTIDADE_ROLEPLAY_E_CONTEXTO.md`.
- Registro e roteamento: `src/lib/app-registry.ts`, `src/lib/identity-routing.ts`.
- Prompt e runtime: `src/lib/kallistis-prompt.ts`, `src/lib/canonical-identity.server.ts`, `src/server/chat/kallistis-chat-runtime.ts`.
- Auth: `src/lib/local-auth-client.ts`, `src/server/local-core/auth-service.ts`, `src/server/local-core/credentials.ts`.
- Banco: `db/README.md`, `db/migrations/`.
- Memória: `src/lib/jardim.functions.ts`, `src/lib/memory-review.functions.ts`, `src/lib/sedimentar.functions.ts`, `docs/memory-review.md`.
- Personagens: `docs/CHARACTER_LIFECYCLE.md`, `src/`, `public/jogar/character-forge.html` e a bridge versionada referenciada no HTML.
- Câmara e voz: `docs/camara-do-eco.md`, `docs/camara-do-eco-microapp.md`, `docs/voice.md`.
- Runtime/deploy: `serve.mjs`, `package.json`, `docs/self-host-cloudflare.md`, `docs/observability.md`.
- Cânone/Velarim: `public/jogar/canon-explorer.html`, `public/jogar/velarim.html`.
- Histórico de aceitação: relatórios PR/FINAL produzidos durante as missões de validação; quando algum estiver disponível no checkout, preferir o relatório mais recente quando houver contradição.

**Resumo em uma frase:** KALLISTIS é um app autenticado de conversa, memória revisada, personagens e conhecimento canônico, rodando sobre um core local PostgreSQL com Hermes/OpenRouter e microapps HTML; grande parte do núcleo foi comprovada em produção, enquanto offline/mobile e algumas superfícies secundárias continuam gates explícitos, e o legado não deve ser confundido com o produto ativo.
