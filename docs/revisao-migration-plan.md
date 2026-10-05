# Plano de Migração: Revisão para Microapp HTML

## 1. Contexto

A rota `/revisao` (`src/routes/_authenticated/revisao.tsx`, 357 linhas) mistura **duas features**:

1. **Candidatos à memória** — a descrição do registry ("Aprovar, editar, recusar ou arquivar candidatos à memória"). Lista `memory_candidates` pendentes com ações de aprovar / editar-e-aprovar / recusar / arquivar.
2. **Revisão espaçada do Jardim** ("Ritual de memória") — fila de `jardim_memorias` vencidas hoje, flashcard com botões de qualidade SM-2 (errei/difícil/ok/fácil).

Diferente de Corpore Sano e Jurídico, **não há problema de segurança aqui**: toda a leitura/escrita já passa por `createServerFn` + `requireSupabaseAuth` (`src/lib/memory-review.functions.ts` e as funções `dueMemorias`/`reviewMemoria` de `src/lib/jardim.functions.ts`). Zero chamadas Supabase client-side na tela. Esta migração é puramente de superfície (HTML + Host), sem Fase 1 de motor.

Não há protótipo HTML morto em `public/revisao/` para limpar antes.

## 2. Escopo

Migra as duas seções juntas, como a tela React já faz hoje — um HTML com duas partes.

|                                                                   | Linhas     |
| ----------------------------------------------------------------- | ---------- |
| `revisao.tsx` (rota)                                              | 357        |
| `memory-review.functions.ts` (motor, já correto)                  | 237        |
| `jardim.functions.ts` (`dueMemorias`/`reviewMemoria`, já correto) | ~45 de 143 |
| **Total relevante**                                               | ~640       |

## 3. Paleta

Domínio `memory` não tem token CSS dedicado em `src/styles.css`. O React atual (`revisao.tsx` e `jardim.tsx`, ambos domínio `memory`) usa consistentemente cobre/âmbar (`#C98A65`/`#D9A441`) como acento — não é um desvio isolado como em Corpore Sano/Jurídico, é a identidade visual já estabelecida do grupo `memory` em duas telas. O HTML preserva essa paleta.

## 4. Fases

### Fase 1 — HTML

`public/revisao/index.html`:

- Seção "Candidatos à memória": lista de cards (fonte, domínio, sensibilidade, data, título, conteúdo, motivo) + 4 botões de ação; painel de edição inline (título, conteúdo, domínio, sensibilidade) antes de aprovar.
- Seção "Memórias que vencem hoje": flashcard (categoria, importância, contagem de revisões, título, corpo revelável) + 4 botões de qualidade SM-2.

### Fase 2 — Host + registry

- `src/components/RevisaoHost.tsx` — fala com `memory-review.functions.ts` (candidatos) e `jardim.functions.ts` (`dueMemorias`/`reviewMemoria`).
- `app-registry.ts`: `revisao` → `kind: "microapp-html"`.
- `microapp-events.ts`: novo `REVISAO_MICROAPP_ACTIONS`.
- Remove o React antigo (`RevisaoPage` dentro de `revisao.tsx`).

### Fase 3 — Testes

- `typecheck`/`lint`/`test`/`build` limpos.
- Validação em navegador (Playwright): listagem de candidatos, aprovar, editar e aprovar, recusar, arquivar, fila de revisão espaçada (revelar + qualidade).
- Ciclo real com usuário autenticado fora do escopo deste ambiente.

## 5. Status

- [x] Fase 1 — HTML
- [x] Fase 2 — Host + registry
- [x] Fase 3 — testes (validação em navegador via Playwright, simulando respostas do Host; ciclo real com usuário autenticado fora do escopo deste ambiente)
