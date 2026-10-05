# Câmara do Eco

A Câmara do Eco é a superfície de reuniões da Kaline.

Ela transforma texto de reunião em transcrição organizada, ata, decisões, pendências e candidatos à memória.

## Estado atual

- Rota: `/camara-do-eco`
- HTML visual: `public/camara-do-eco/index.html`
- Host: `src/components/microapps/CamaraDoEcoHost.tsx`
- Motor fase 1: `src/lib/camara-do-eco.functions.ts`
- Fallback determinístico: `src/lib/camara-do-eco-engine.ts`
- Status no registry: `real`

## Formatos

Nesta fase, a entrada real é texto colado de reunião/transcrição, com limite de 80.000 caracteres.

## Memória

A Câmara gera candidatos em `memory_candidates` com `source = "camara-do-eco"`. Ela não salva memória durável no Jardim.

Nada entra no Jardim/Mnemósine sem revisão humana.

## Próximos passos

Upload de áudio real, transcrição contínua e integração mais rica com ata/exportação podem avançar em PRs futuros.
