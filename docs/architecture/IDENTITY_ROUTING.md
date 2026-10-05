# Roteador de identidade do KALLISTIS

## Contrato vigente

- Produto: **KALLISTIS**
- Assistente: **HERMES**
- Autenticação: PostgreSQL local na VM Max.
- Rota autenticada padrão: `/chat`.
- Modo padrão: `ASSISTENTE`.
- Código do roteador: `src/lib/identity-routing.ts`.

As fontes de autoridade são `CANON/IDENTIDADE.md`, `CANON/CONTEXTO.md`,
`CANON/IDENTIDADE_TEMPO_E_PRESENCA.md` e
`CANON/IDENTIDADE_ROLEPLAY_E_CONTEXTO.md`.

O roteador falha fechado: não inventa vínculos ausentes, não atravessa o
escopo autenticado e não transforma conversa em autorização. Roleplay não é
autenticação, e Hermes não é KALLISTIS.

Facets ou identidades históricas não são identidade operacional ativa do core.
O chat público envia apenas `surface=kallistis` e `facet=kallistis`; o servidor
é a autoridade final.

## Histórico / superseded context

Documentos antigos podem mencionar Kaline, `viva.md`, Supabase, facets
históricas ou Slim Shell. Esses termos descrevem fases anteriores e não são
contrato vigente do núcleo KALLISTIS. Código legado permanece isolado quando
não é alcançado pelas superfícies públicas congeladas.
