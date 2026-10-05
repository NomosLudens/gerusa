# K∧LINE Ledger Adapter

Este documento descreve a primeira camada TypeScript do K∧LINE Ledger / Mnemósine Ledger.

## Objetivo

Oferecer funções pequenas, best-effort e não bloqueantes para gravar eventos, referências e estados de revisão no Ledger.

Há duas abordagens implementadas:

1. `src/lib/kline-ledger.ts`: Adapter principal que utiliza o singleton de browser do Supabase (`@/integrations/supabase/client`). Não deve ser usado em contextos puramente backend/API como `chat.ts`.
2. `src/lib/kline-ledger.server.ts`: Helper server-safe que exige injeção explícita de um client do Supabase (por exemplo, `supabaseAsUser`), isolando transações de segurança e garantindo o funcionamento em rotas de API server-side sem misturar tokens.

## Não integração

Este PR não chama o adapter a partir de chat, Jardim, Revisão, sedimentação, Registro Vivo, Kaline Presente, Câmara do Eco ou runtime.

## Best-effort

Falha no Ledger não pode quebrar o fluxo principal.

As funções retornam:

- ok: true
- ok: false

E não lançam exceção para o fluxo chamador.

## Append-only

O adapter só usa INSERT.

Não usa UPDATE.
Não usa DELETE.

## Próximo passo

PR futuro poderá integrar pontos específicos do app ao Ledger, começando por eventos simples e sempre com fallback.

## Revisão de Handoff

- `handoff.candidate` é criado pelo Runtime Boundary quando a Kaline Clean bloqueia escopos de Klio/Kuan.
- A revisão é append-only.
- Aprovar/rejeitar/arquivar adiciona novo estado em `kline_event_review_state`.
- Nenhum app externo é chamado automaticamente.
- A aprovação apenas registra decisão humana.
- UI adicionada no PR #131 (HandoffReviewPanel).

## UI de Revisão de Handoffs

- A aba Revisão exibe `handoff.candidate` pendentes.
- O usuário pode aprovar, rejeitar ou arquivar.
- A revisão é append-only.
- Aprovar não chama Klio, Kuan ou qualquer app externo.
- Aprovar apenas registra decisão humana no Ledger.
- Integração real com apps separados fica para PR futuro.
