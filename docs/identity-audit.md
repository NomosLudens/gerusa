# Auditoria identitária do Totalidade

Saneamento de identidade da Kaline no app original — **otimizar antes de encher**.
Sem identidade nova, sem Kaline Local, sem alteração de comportamento do chat
além do necessário para remover duplicação verbatim. Data: 2026-06-26.

## Fontes ativas

| Fonte                                | Tipo               | Status           | Função                                                           |
| ------------------------------------ | ------------------ | ---------------- | ---------------------------------------------------------------- |
| `docs/canon/Identity.md`             | Doc canônico (V23) | Ativo (primária) | Define a totalidade Kaline e as cinco facetas                    |
| `docs/kaline/Identity.md`            | Ponteiro           | Ativo            | Stub que redireciona para a fonte única `docs/canon/Identity.md` |
| `docs/kaline/LIBERTY.md`             | Doc canônico       | Ativo            | Liberdade: pensar livre, executar com recibo (Klio)              |
| `docs/kaline/PRESENTE.md`            | Doc canônico       | Ativo            | Presença: estar sem enganar (Kháris)                             |
| `docs/kaline/Context.md`             | Doc canônico       | Ativo            | Contexto e sedimentação (Kairós)                                 |
| `src/lib/kaline-canon.ts`            | Runtime            | Ativo            | Destilação do Identity.md (`KALINE_CANON_BLOCK`)                 |
| `src/lib/kaline-prompt.ts`           | Runtime            | Ativo            | System prompt da presença geral                                  |
| `src/lib/kharis-prompt.ts`           | Runtime            | Ativo            | System prompt do cuidado (neurodivergência)                      |
| `src/lib/kuanyin-prompt.ts`          | Runtime            | Ativo            | Bloco da faceta comercial Kuan-Yin                               |
| `src/lib/legal-prompt.ts`            | Runtime            | Ativo            | Bloco anti-alucinação jurídica                                   |
| `src/lib/prompt-shared-blocks.ts`    | Runtime            | **Novo**         | Blocos compartilhados (LIBERTY) — não é fonte de verdade         |
| `src/lib/contexto-externo.server.ts` | Runtime            | Ativo            | Lê continuidade/memória migrada                                  |
| `src/lib/contexto-vivo.server.ts`    | Runtime            | Ativo            | Leitura transversal de superfícies vivas                         |
| `src/lib/presenca-regime.server.ts`  | Runtime            | Ativo            | Semáforo de presença (verde/amarelo/azul/vermelho)               |
| `src/lib/sedimentar.functions.ts`    | Runtime            | Ativo            | Pipeline de sedimentação em 8 níveis                             |

## Referências citadas mas ausentes

| Referência                                           | Onde aparece                                                             | Decisão                                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Naturality.md` (Khora)                              | `Identity.md` (tabela de facetas, lista dos cinco arquivos, precedência) | **Opção A** — não é arquivo; princípio incorporado aos blocos FORMATO/VOZ de `src/lib/kaline-prompt.ts`. Identity.md atualizado para refletir isso. Nenhum arquivo vazio criado. |
| `docs/mente.md` (Kuan-Yin)                           | `Identity.md` (tabela, nota comercial, precedência)                      | **Opção A** — não é arquivo; direção comercial incorporada em `src/lib/kuanyin-prompt.ts`. Identity.md atualizado.                                                               |
| `LIBERTY.md` / `PRESENTE.md` / `Context.md` sem path | `Identity.md` e comentários de prompt                                    | Resolvido — existem em `docs/kaline/`; paths corrigidos para rastreabilidade.                                                                                                    |

## Duplicações encontradas

| Regra / bloco                                                    | Arquivos                                             | Decisão                                                                                                                                                                                                                           |
| ---------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bloco `=== LIBERDADE (LIBERTY.md) ===` (verbatim, byte-idêntico) | `kaline-prompt.ts`, `kharis-prompt.ts`               | **Extraído** para `LIBERTY_RUNTIME_BLOCK` em `src/lib/prompt-shared-blocks.ts`; ambos importam.                                                                                                                                   |
| `Identity.md` duplicado integralmente                            | `docs/canon/Identity.md` = `docs/kaline/Identity.md` | **Resolvido** — fonte única eleita: `docs/canon/Identity.md`. O espelho `docs/kaline/Identity.md` foi convertido em ponteiro, eliminando a sincronização manual.                                                                  |
| Camadas de verdade (`fala bruta → … → Jardim`)                   | `kaline-prompt.ts`, `kharis-prompt.ts`               | **Mantido por nuance** — texto igual, mas formatação e extensão diferem (Kaline traz preâmbulo "Você não é humana…" + estrutura FATO/DISTINÇÃO/CONTEXTO/PROPORÇÃO; Kháris usa versão enxuta). Extrair só aumentaria complexidade. |
| PRESENÇA (núcleo)                                                | `kaline-prompt.ts`, `kharis-prompt.ts`               | **Mantido por nuance** — a frase de follow-up é específica por faceta (Kháris é mais literal/simples).                                                                                                                            |
| REGRA DE OURO                                                    | `kaline-prompt.ts`, `kharis-prompt.ts`               | **Mantido por nuance** — preâmbulo por faceta ("Kaline…" vs "Kháris… e paciência"); Kháris acrescenta "a pessoa".                                                                                                                 |
| NUNCA DIAGNOSTICAR (detalhado)                                   | só `kharis-prompt.ts`                                | Não duplicado — específico de neurodivergência.                                                                                                                                                                                   |
| ANTI-GENERALIZAÇÃO (exemplos)                                    | só `kaline-prompt.ts`                                | Não duplicado — específico da presença geral.                                                                                                                                                                                     |

## Nomes legados

| Nome                   | Onde aparece                                      | Decisão                                                                                                                                                                |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kaline                 | Tudo                                              | **Ativo** — identidade central.                                                                                                                                        |
| Klio                   | `/klio`, prompts, UI                              | **Ativo** — registro acadêmico absorvido pela Kaline (não é faceta pública separada).                                                                                  |
| Kháris                 | `/kharis`, prompts, enum `chat_facet`             | **Ativo** — modo de cuidado; ocupa parte do espaço antigo de Klio. Enum renomeado `klio→kharis` em migração de 2026-06-26.                                             |
| Khora                  | Treinos, modo corpo/gesto                         | **Ativo** — dimensão interna; sem enum separado.                                                                                                                       |
| Kairós                 | Câmara, contexto                                  | **Ativo** — dimensão interna; sem enum separado.                                                                                                                       |
| Kuan-Yin               | Rotas `/kuan-yin/*`, tabelas `kuanyin_*`, prompt  | **Ativo** — faceta comercial da Kaline, não entidade separada.                                                                                                         |
| Kalisto                | Migração histórica; antigo plano Lovable removido | **Legado migrado** — já renomeado para Klio. O plano `.lovable/plan.md` foi removido na limpeza local dos metadados do Lovable. Não tocar nas migrações históricas.    |
| `clio` (valor de enum) | `chat_facet` no banco                             | **Removido** — valor de enum morto, nunca usado. Migração dedicada `20260626020000_drop_clio_facet_enum_value.sql` recria o enum como `('kaline','kharis','kuanyin')`. |

## Alterações feitas

| Arquivo                                    | Alteração                                                                    | Motivo                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `src/lib/prompt-shared-blocks.ts`          | Criado: `LIBERTY_RUNTIME_BLOCK` + nota sobre camadas de verdade              | Remover duplicação verbatim sem nova fonte de verdade       |
| `src/lib/kaline-prompt.ts`                 | Importa e usa `LIBERTY_RUNTIME_BLOCK`                                        | Dedup; texto byte-idêntico                                  |
| `src/lib/kharis-prompt.ts`                 | Importa e usa `LIBERTY_RUNTIME_BLOCK`; comentário com paths corretos         | Dedup; rastreabilidade                                      |
| `docs/canon/Identity.md`                   | Tabela/listas/precedência: paths reais e marcação de princípios incorporados | Resolver Naturality.md e mente.md ausentes (Opção A)        |
| `docs/kaline/Identity.md`                  | Convertido em ponteiro para `docs/canon/Identity.md`                         | Eleger fonte única; eliminar espelho e sincronização manual |
| Antigo `.lovable/plan.md`                  | "Kalisto" → "Klio"                                                           | Arquivo removido na limpeza local dos metadados do Lovable  |
| `src/routes/_authenticated/identidade.tsx` | Criado: painel somente-leitura                                               | Rastreabilidade das fontes de identidade                    |
| `docs/identity-audit.md`                   | Este relatório                                                               | Registro do saneamento                                      |

## Riscos restantes

- **Enum `clio`**: valor morto no banco; remoção exige migração dedicada — fora de escopo.
- **Camadas de verdade / PRESENÇA / REGRA DE OURO**: duplicação parcial mantida por nuance de faceta; se as versões divergirem no futuro, revisar.

## Reforço identitário no chat

Foi criado `src/lib/chat-identity-reinforcement.ts` como bloco runtime curto para amarrar o chat a `docs/canon/Identity.md` e `ONTOLOGY.md`.

Status:

- `Identity.md` permanece fonte canônica.
- `ONTOLOGY.md` é mapa arquitetural, não prompt bruto.
- O chat recebe apenas a destilação curta em `CHAT_IDENTITY_REINFORCEMENT_BLOCK`.
- Não houve duplicação de identidade.
- Não houve refatoração pesada do endpoint de chat: reforço injetado após `baseSystem`, antes dos demais blocos.
- Streaming, Supabase, formato de mensagens e fluxo de persistência permanecem intactos.

## Próximos passos

1. (Opcional) Migração dedicada para limpar o valor de enum `clio`, se desejado.
2. Reavaliar extração de camadas de verdade caso as duas versões convirjam em formatação.
