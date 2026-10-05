# Runtime Boundary

A Kaline Clean pública roda como Kaline.

## Regra

A shell esconder módulos legados não basta.
O runtime também precisa respeitar a fronteira.

## Fluxo normal

- runtimeFacet: kaline
- prompt base: Kaline
- Semáforo da Presença continua modulando a resposta
- contexto vivo continua permitido
- sedimentação continua preservada

## Escopos fora da Kaline Clean

- Kuan-Yin: app comercial separado futuro
- Klio: app técnico/coder separado futuro
- Kháris: incorporada à Kaline como cuidado, presença e orientação simples

## Respostas controladas

Pedidos comerciais devem retornar mensagem controlada para Kuan-Yin.
Pedidos de código, debug, PR, repo, migration ou implementação devem retornar mensagem controlada para Klio.

## Handoff via Ledger

Quando a Kaline Clean bloqueia um escopo de Klio ou Kuan, ela não chama outro app diretamente.

Ela registra um evento `handoff.candidate` no K∧LINE / Mnemósine Ledger.

Esse evento fica pendente de revisão.

O Ledger sincroniza eventos aprováveis, não respostas automáticas.

A falha do Ledger não bloqueia a resposta controlada ao usuário.

## Fora de escopo deste PR

- persistência imediata das rotas removidas
- migrations
- novas APIs
- remoção de rotas
- prune de código legado
