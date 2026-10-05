# Plano de Migração: Jurídico para Microapp HTML

## 1. Contexto

O registry cataloga 3 entradas sob o domínio jurídico — `juridico` (`/juridico`), `legislacao` (`/legislacao`) e `jurisprudencia` (`/jurisprudencia`) — mas são só **duas features reais**:

- **Feature A — Corpus curado** (`/juridico`): busca em `legal_documents`/`legal_chunks` (constituição, leis, súmulas importadas manualmente por admin) + painel de importação. Sem IA — só responde o que está no corpus.
- **Feature B — Acervo assistido por IA** (`/legislacao`, `/jurisprudencia`): mesmo componente React (`AcervoPage`, definido em `jurisprudencia.tsx`, reusado por `legislacao.tsx` com uma prop `modo`), busca via LLM (OpenRouter) + acervo pessoal salvo pelo usuário.

`legislacao.tsx` tem 10 linhas — só renderiza `<AcervoPage modo="legislacao" />`.

## 2. Arquitetura de dados atual

|                                   | Feature A (`juridico`)                                                                                                                   | Feature B (`legislacao`/`jurisprudencia`)                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Busca                             | `searchLegal` — server function, `requireSupabaseAuth`, já correto                                                                       | `pesquisarJuridico` — server function, chama OpenRouter, já correto                                              |
| Leitura/escrita de dados próprios | `listLegalDocuments`/`upsertLegalDocument`/`addLegalChunks`/`listLegalChunks` — server functions, admin gated via `has_role` no servidor | **Direto do cliente**: `supabase.from("jurisprudencia"/"legislacao").select/insert/delete` — sem server function |
| Checagem de admin                 | `supabase.rpc("has_role", ...)` chamado do cliente em `juridico.tsx`, redundante (as próprias mutações já revalidam no servidor)         | N/A                                                                                                              |

O CRUD do acervo pessoal (Feature B) é o mesmo padrão de dívida técnica corrigido no Corpore Sano: RLS protege dados de outros usuários (`jurisprudencia`/`legislacao` têm política "own rows"), então não há vazamento, mas a lógica de mutação mora inteira no bundle do cliente, sem validação de input.

## 3. Fases

### Fase 1 — Motor

- Novas server functions em `src/lib/juridico.functions.ts` (já hospeda `pesquisarJuridico`, mesmo domínio): `listarAcervoJuridico`, `salvarAcervoJuridico`, `removerAcervoJuridico` — todas com `requireSupabaseAuth`, `zod` no input, restritas a `user_id` do contexto autenticado.
- `AcervoPage` (`jurisprudencia.tsx`) passa a chamar essas server functions em vez de `supabase.from(...)` direto — comportamento idêntico, só motor corrigido. Isso valida a Fase 1 isoladamente antes de tocar em HTML.
- Remove a checagem `supabase.rpc("has_role", ...)` client-side em `juridico.tsx`; o novo Host usa `useAuthz()` (já usado pelo shell) para saber se o usuário é admin.

### Fase 2 — HTML

Dois arquivos HTML, um por feature real:

- `public/juridico/index.html` — busca no corpus curado + lista de documentos + painel admin (documento/trechos), condicional a `isAdmin` recebido do Host.
- `public/juridico-acervo/index.html` — busca assistida por IA + acervo pessoal (salvar/remover), parametrizado por `modo` (`legislacao` ou `jurisprudencia`) recebido via query string do próprio `src` do iframe, igual ao que a prop `modo` já faz no React.

### Fase 3 — Host + registry

- `src/components/JuridicoHost.tsx` — fala com `legal.functions.ts` (Feature A).
- `src/components/JuridicoAcervoHost.tsx` — fala com `juridico.functions.ts` (Feature B), lê `modo` da rota atual (`useLocation` ou prop) e repassa ao HTML.
- `app-registry.ts`: `juridico`, `legislacao`, `jurisprudencia` → `kind: "microapp-html"`.
- `microapp-events.ts`: novo `JURIDICO_MICROAPP_ACTIONS` e `JURIDICO_ACERVO_MICROAPP_ACTIONS`; `legislacao` e `jurisprudencia` apontam para o mesmo `src` (`/juridico-acervo/index.html`) com `?modo=` diferente.
- Remove o React antigo morto: `AdminImportPanel`/`JuridicoPage` (dentro de `juridico.tsx`) e `AcervoPage` (`jurisprudencia.tsx`), e o wrapper `legislacao.tsx`.

### Fase 4 — Testes

- `typecheck`/`lint`/`test`/`build` limpos.
- Validação em navegador (Playwright): busca no corpus curado, painel admin (import doc + trechos), busca assistida por IA em ambos os modos, salvar/remover no acervo.
- Ciclo real com usuário autenticado (admin de verdade) fora do escopo deste ambiente.

## 3.1 Nota de implementação — decisão de paleta

Apesar do domínio `kaline`, o React antigo (`juridico.tsx`) usava tons cobre/âmbar (`#C98A65`/`#D9A441`, os mesmos hex reaproveitados do Corpore Sano) — uma inconsistência pré-existente, já que `jurisprudencia.tsx` usava corretamente `var(--gold)` (alias de `--kaline`). Os dois HTMLs desta migração usam o laranja neon real do domínio (`--kaline: #ff4400`), igual a Agenda/Câmara, corrigindo a inconsistência.

## 4. Riscos

| Risco                                                                                                 | Mitigação                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `legislacao`/`jurisprudencia` compartilham HTML — erro de `modo` pode misturar dados das duas tabelas | Testar os dois modos isoladamente antes de trocar as rotas reais                                                        |
| Painel admin é sensível (grava corpus curado)                                                         | Manter validação de input (zod) idêntica ao `legal.functions.ts` atual; `isAdmin` chega do Host, não é decidido no HTML |
| Prompt de IA já tem lógica frágil de "SEM_FONTE"                                                      | Não alterar o prompt nesta migração — fora de escopo                                                                    |

## 5. Status

- [x] Fase 1 — motor (CRUD do acervo → server functions, remove RPC client-side redundante)
- [x] Fase 2 — HTML (`juridico`, `juridico-acervo`)
- [x] Fase 3 — Host + registry
- [x] Fase 4 — testes (validação em navegador via Playwright, simulando respostas do Host; ciclo real com usuário autenticado fora do escopo deste ambiente)
