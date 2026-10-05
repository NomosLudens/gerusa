# Slim Shell Visual

Este documento descreve a shell visual enxuta da Kaline Clean.

## Núcleo visível

- Chat
- Kaline Presente
- Câmara do Eco
- Calendário
- Registro Vivo
- Jardim
- Revisão
- Meu Perfil
- Semáforo da Presença

## Semáforo da Presença

O Semáforo da Presença é parte vital da Kaline Clean Shell.

Ele não é dashboard técnico.
Ele não é métrica falsa.
Ele não mede uptime de IA, Supabase ou OpenRouter.

Ele é o governador de regime da presença da Kaline no momento atual, modulando ritmo, densidade e iniciativa.

A Slim Shell deve manter o SemaforoPresence visível sem reintroduzir dashboards, gráficos, painéis KITT, métricas falsas ou widgets administrativos.

## Regra

A shell usa a identidade canônica definida em `src/lib/identity-routing.ts`.

A UI pública/autenticada não deve listar módulos arquivados, mesmo que as rotas continuem existindo para compatibilidade.

## Preservação

Este PR não apaga módulos legados.
Não altera runtime.
Não altera chat.
Não altera Supabase.
Não altera Ledger.
Não altera sedimentação.
Não altera Jardim/Revisão.

## Próximo passo

O próximo PR deve tratar Runtime Boundary + Ledger Handoff.
