# Plano de Migração: Câmara do Eco para Microapp HTML

## 1. Visão Geral

Migrar Câmara do Eco de React puro para microapp-html, seguindo o padrão consolidado:

- **HTML puro** (`/public/camara/index.html`) — superfície visual
- **Host React** (`src/routes/_authenticated/camara.tsx`) — autenticação + ponte
- **Motor consolidado** (`src/lib/camara.functions.ts`) — lógica real

## 2. Estado Atual (Análise)

### ✅ Já Separado Corretamente

- Motor de análise/síntese em `camara.functions.ts`
- Server functions existentes: `analisarCamara`, `semearHipoteseCamara`, `criarRetornoKairos`
- UI pura: 6 componentes (StatusPill, Bloco, AtaEstruturada, etc.)

### ✅ Já Correto (não precisa migrar)

- `/api/camara-transcribe-segment`: rota server-side já autenticada, valida ownership, chama `transcribeAudioBlob`, atualiza `camara_segmentos`. Nada a fazer aqui.
- `camara-blob-store.ts`: cache local em IndexedDB para retry de upload. É armazenamento do navegador, não Supabase — permanece como está, tanto no Host quanto (futuramente) acessível só pelo Host.

### ❌ Problema: Supabase Direto no Cliente

8 operações de Supabase precisam virar server functions:

**Em CamaraPage:**

- `load()` — SELECT sessões
- `criarAudio()` — INSERT sessão (audio)
- `salvarTexto()` — INSERT sessão (texto)
- `remover()` — SELECT audio_path + storage.remove() + DELETE

**Em SessaoDetalhe:**

- `load()` — SELECT segmentos
- `enviarBloco()` — storage.upload() + UPDATE audio_path (fire-and-forget)
- `criarSegmentoEEnviar()` — INSERT segmento
- `stop()` — UPDATE sessão → finalizado

### ⚠️ Decisão de arquitetura: captura de áudio fica no Host, não no HTML

Gravar áudio (`getUserMedia` + `MediaRecorder`) é uma operação sensível — a própria regra do projeto diz que HTML não executa motor sensível. Em vez de tentar liberar `allow="microphone"` no iframe (risco técnico incerto, depende de política de permissão do navegador dentro de sandbox), a captura continua acontecendo **inteiramente no Host React**, que roda na página principal autenticada, não dentro do iframe.

Fluxo:

```
HTML (iframe)                     Host React (página principal)
  botão "gravar"    ──postMessage──▶  getUserMedia + MediaRecorder
  cronômetro         ◀──postMessage── "gravando há Ns"
  status do bloco    ◀──postMessage── "bloco 2 enviado" / "transcrevendo" / "falhou"
  botão "parar"      ──postMessage──▶  stop() + finalizar sessão
```

O HTML nunca chama `getUserMedia`. Isso elimina o risco de permissão de microfone em iframe sandboxed e mantém a regra arquitetural (motor sensível fora do HTML público).

## 3. Plano de Execução

### Fase 1: Consolidar Motor (2-3 dias)

Criar 7 server functions em `src/lib/camara.functions.ts`:

```
1. listarSessoes() — SELECT com RLS
2. criarSessao(titulo, modo, textoRapido?) — INSERT (audio|texto)
3. finalizarSessao(sessaoId) — UPDATE status → "finalizado"
4. deletarSessao(sessaoId) — SELECT audio_paths + storage cleanup + DELETE
5. listarSegmentos(sessaoId) — SELECT segmentos
6. criarSegmento(sessaoId, ordem, inicioSeg, fimSeg) — INSERT segmento (status "queued")
7. confirmarAudioPath(segmentoId, audioPath) — UPDATE audio_path após upload
```

Upload do blob de áudio para o Storage e chamada a `/api/camara-transcribe-segment` continuam feitos pelo Host (não pelo HTML) — não fazem parte desta fase porque já passam por caminho autenticado/server-side hoje.

### Fase 2: Refatorar Host React (2 dias)

`src/routes/_authenticated/camara.tsx`:

- Remover chamadas diretas a Supabase
- Usar server functions em vez disso
- Separar componentes "caminho crítico" dos "visuais"

### Fase 3: Extrair HTML Puro (1-2 dias)

Criar `/public/camara/index.html`:

- Migrar UI: 6 componentes visuais
- Remover lógica/estado
- Implementar postMessage para:
  - `camara:load-sessoes`
  - `camara:criar-sessao`
  - `camara:deletar-sessao`
  - `camara:abrir-sessao`
  - `camara:enviar-bloco`
  - `camara:finalizar-sessao`

### Fase 4: MicroappHost Fino (1 dia)

Adaptar/criar MicroappHost para Câmara:

- Validar `source: "camara"`
- Validar `allowedActions` (list acima)
- Chamar server functions
- Enviar respostas para iframe

### Fase 5: Atualizar Registry (1 dia)

Em `src/lib/app-registry.ts`:

```ts
{
  id: "camara-do-eco",
  kind: "microapp-html",  // ← muda de "react"
  status: "real",
  // ... resto igual
}
```

### Fase 6: Testes (2 dias)

- Ciclo: criar sessão → gravar → transcrever → analisar → semear
- Validar permissões (RLS)
- Testar em mobile/PWA

## 4. Contrato de Mensagens

HTML → Host:

```ts
{
  source: "camara",
  action: "camara:load-sessoes",
  payload?: { limit?: number }
}
```

Host → HTML (resposta):

```ts
{
  source: "camara",
  action: "camara:sessoes-loaded",
  payload: { sessoes: Sessao[] }
}
```

**Ações esperadas:**

- `camara:load-sessoes` → `camara:sessoes-loaded`
- `camara:criar-sessao` → `camara:sessao-criada`
- `camara:abrir-sessao` → `camara:sessao-aberta` (+ segmentos)
- `camara:enviar-bloco` → `camara:bloco-enviado`
- `camara:analisar` → `camara:analise-pronta`
- `camara:semear` → `camara:hipotese-semeada`
- `camara:criar-kairos` → `camara:kairos-criado`
- `camara:finalizar` → `camara:sessao-finalizada`
- `camara:deletar` → `camara:sessao-deletada`

## 5. Checklist de Implementação

### Motor (camara.functions.ts)

- [x] `listarSessoesCamara()`
- [x] `criarSessaoCamara()`
- [x] `finalizarSessaoCamara()`
- [x] `deletarSessaoCamara()`
- [x] `listarSegmentosCamara()`
- [x] `criarSegmentoCamara()` + `confirmarAudioPathCamara()`
- [ ] Testes unitários dedicados (validado até aqui via typecheck/lint/build + teste manual em navegador)

### Host React (camara.tsx → CamaraHost.tsx)

- [x] Remover supabase direto do componente de rota
- [x] Usar server functions
- [x] Captura de áudio (`getUserMedia`/`MediaRecorder`) mantida no Host, não no HTML
- [x] Wake lock durante gravação/transcrição/finalização

### HTML Puro (public/camara/index.html)

- [x] Views: lista, criar (áudio/texto), sessão/gravação, blocos, análise, modais (semear/Kairós)
- [x] Implementar postMessage sender/listener
- [x] Suporte a `?embedded=1`
- [x] CSS isolado (paleta própria, sem depender do Tailwind do shell)
- [x] Sem acesso a Supabase

### Host MicroappHost (components/microapps/)

- [x] Criar `CamaraHost.tsx`
- [x] Contrato de ações em `CAMARA_MICROAPP_ACTIONS` (microapp-events.ts)
- [x] Validação de mensagens via `MicroappHost` existente (origem, janela, source, allowedActions)

### Registry

- [x] Mudar `kind: "react"` → `"microapp-html"` para `camara-do-eco`
- [x] Manter `legacyPaths: ["/camara-do-eco"]`
- [x] `allowedActions` = `CAMARA_MICROAPP_ACTIONS`

### Testes

- [x] Testado em navegador (Playwright) com respostas do Host simuladas: lista, criar sessão, abrir sessão, blocos com status/retry, gravação (timer), análise completa, ata, infográfico SVG, modal de semear
- [x] `typecheck` + `lint` (zero erros/warnings) + `vitest` (51 testes) + `build` de produção
- [ ] Ciclo real de ponta a ponta com usuário autenticado (gravar áudio real → transcrever → analisar) — requer sessão logada, não testado neste ambiente
- [ ] Semear hipótese → aparecer em `/revisao` (fluxo real)
- [ ] Criar retorno Kairós → aparecer em `/agenda` (fluxo real)
- [ ] Mobile + PWA
- [ ] RLS (usuário A não vê sessões de B) — já coberto pelas server functions (`.eq("user_id", context.userId)` em toda query), mas sem teste de integração dedicado

## 6. Riscos e Mitigação

| Risco                     | Mitigação                                         |
| ------------------------- | ------------------------------------------------- |
| Perder dados de sessão    | Copiar DB em dev, testar migração em staging      |
| Áudio não grava em iframe | Testar MediaRecorder em iframe sandbox do projeto |
| RLS quebrado              | Validar cada server function com testes de RBAC   |
| UI diferente              | Manter CSS, testar lado-a-lado                    |
| Performance               | Monitor de requisições iframe/postMessage         |

## 7. Timeline Estimada

- **Fase 1** (Motor): 2-3 dias
- **Fase 2** (Host): 2 dias
- **Fase 3** (HTML): 1-2 dias
- **Fase 4** (MicroappHost): 1 dia
- **Fase 5** (Registry): 1 dia
- **Fase 6** (Testes): 2 dias

**Total: ~10-12 dias de trabalho**

## 8. Sucesso = ?

✅ HTML em `/public/camara/index.html` renderiza em iframe
✅ Host valida e encaminha mensagens
✅ Motor executa (análise + semear + Kairós)
✅ Sessões aparecem na UI (listar + abrir)
✅ Gravação → transcrição → análise flui
✅ Semear cria candidatos em `/revisao`
✅ Kairós cria eventos em `/agenda`
✅ RLS funciona (isolamento de usuários)
✅ Mobile/PWA OK
✅ Registry reflete mudança (kind: "microapp-html")
