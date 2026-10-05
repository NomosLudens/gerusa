# Plano de Migração: Corpore Sano para Microapp HTML

## 1. Contexto

Existe um protótipo abandonado de microapp HTML para o Corpore Sano: `src/components/CorporeSanoHost.tsx` + `public/corpore-sano/index.html` (23 linhas). Nenhum dos dois está conectado a nenhuma rota — `/corpore-sano` usa `CorporeSanoPage` (React puro), que é **muito mais rico** que o protótipo.

## 2. Comparação de escopo

|                          | Protótipo morto                                                                     | Versão real em produção                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Abas                     | hoje / sessão / histórico / sinais                                                  | hoje / plano / histórico + Focus Mode full-screen                                        |
| Templates de treino      | ❌                                                                                  | ✅ criar/editar/gerenciar (`TrainingTemplatesCard`)                                      |
| Plano semanal            | ❌                                                                                  | ✅ `WeekPlanCard`                                                                        |
| Biblioteca de exercícios | ❌                                                                                  | ✅ `ExerciseLibraryPanel`                                                                |
| Execução guiada          | ❌                                                                                  | ✅ `FocusMode` (374 linhas: timer de descanso, log de série, desfazer, trocar exercício) |
| Recordes pessoais (PR)   | ❌                                                                                  | ✅                                                                                       |
| Chat com Khora (IA)      | ❌                                                                                  | ✅ `KhoraChatChips`                                                                      |
| Motor                    | `corpore-sano.functions.ts`, chama Supabase direto do cliente (sem server function) | `treinos-sync.ts`, mesma coisa                                                           |

Tamanho total do que precisa ser portado: `CorporeSanoPage.tsx` (418) + `use-treinos.ts` (212) + 12 componentes (1215) + `storage.ts`/`types.ts`/`utils.ts`/`data.ts` + `treinos-sync.ts` (~340) ≈ **2200+ linhas**. Maior microapp até agora.

## 3. Arquitetura de dados — importante

Diferente de Câmara e Agenda (tudo no Supabase), o Corpore Sano é **local-first híbrido**:

- **Só no `localStorage`** (`kaline.treinos.v1`), nunca sincroniza com o servidor: exercícios (biblioteca), treino do dia em andamento, templates, plano semanal.
- **Sincroniza com Supabase**: treino finalizado (`persistFinishedWorkout`), sinais corporais (`persistSignalSnapshot`, debounced), leituras de histórico/PRs/último sinal.

Isso muda a estratégia de migração: o HTML pode manter o estado local-first **exatamente como está** (mesma chave de `localStorage`, compartilhada entre o app React e o HTML porque ambos rodam na mesma origem). Só os pontos de sincronização com o Supabase precisam de motor real (server functions) — não é necessário portar toda a árvore de estado para o servidor.

## 4. Fases

### Fase 1 — Consolidar motor ✅

Converter `src/lib/treinos-sync.ts` (chamadas diretas de Supabase no cliente, usado pelo `use-treinos.ts` real) em server functions de verdade, com `requireSupabaseAuth`:

- `persistFinishedWorkoutTreino`
- `fetchHistoryTreino`
- `deleteWorkoutSessionTreino`
- `fetchPRsTreino`
- `persistSignalSnapshotTreino`
- `fetchLatestSignalTreino`

`use-treinos.ts` passa a chamar essas server functions em vez de `treinos-sync.ts`. Isso é uma correção de segurança independente do resto da migração — o React continua funcionando exatamente igual, só que autenticado corretamente no servidor.

`src/lib/corpore-sano.functions.ts` (usado só pelo `CorporeSanoHost` morto) fica obsoleto e é removido junto com o Host morto quando o novo Host for criado na Fase 3.

### Fase 2 — Extrair views para HTML ✅

`public/corpore-sano/index.html` cobre:

1. **Hoje**: semáforo + treino do dia + Focus Mode (execução guiada com timer de descanso, log de série, desfazer, trocar exercício)
2. **Plano**: sinais corporais + templates (editor completo por exercício) + plano semanal
3. **Histórico**: sessões passadas + PRs + biblioteca de exercícios com filtro por grupo muscular
4. Chat Khora (FAB + painel, chips de intenção, "abrir chat completo")

Estado local (exercícios/templates/treino em andamento/semana) fica em `localStorage` dentro do próprio HTML, mesma chave `kaline.treinos.v1` — compatível com o que `perfil.tsx` (que também lê/edita templates) já espera, já que `storage.ts`/`types.ts`/`utils.ts`/`data.ts` continuam compartilhados e não mudaram de formato.

Paleta usa os tons cobre/âmbar (`#C98A65`/`#D9A441`) já usados pela persona Khora na versão React — variante clara do token `--khora: #a56a43` do domínio, mesma estratégia de legibilidade aplicada ao Kháris no Códice.

### Fase 3 — Host novo + registry ✅

- `src/components/CorporeSanoHost.tsx` reescrito do zero, falando com as server functions da Fase 1 (`treinos.functions.ts`) e com `ensureThread` para abrir o chat completo da Khora
- `src/lib/corpore-sano.functions.ts` e todo o React antigo (`CorporeSanoPage.tsx`, `use-treinos.ts`, `corpore-sano-search.ts` e os 12 componentes exclusivos da página) removidos — `storage.ts`/`types.ts`/`utils.ts`/`data.ts` preservados por serem compartilhados com `perfil.tsx`
- `app-registry.ts`: `corpore-sano` agora é `kind: "microapp-html"`
- Rota `/corpore-sano` renderiza `CorporeSanoHost`

### Fase 4 — Testes

- [x] Testado em navegador (Playwright): criar treino A, iniciar Modo Foco, registrar série (com timer de descanso iniciando automaticamente), fechar foco, aba Plano (sinais, templates expansíveis, plano semanal), aba Histórico (biblioteca com filtro, estado vazio honesto), painel Khora refletindo o treino ativo
- [x] `typecheck` + `lint` (zero erros/warnings) + `vitest` (51 testes) + `build` de produção
- [ ] Ciclo real de ponta a ponta com usuário autenticado (treino finalizado → aparece no histórico com PRs reais) — requer sessão logada, não testado neste ambiente
- [ ] Confirmar em produção que `localStorage` migra sem perda entre a versão React antiga e o HTML novo (mesma chave `kaline.treinos.v1`, mesmo formato — não deveria haver perda, mas vale checar com dados reais de um usuário)
- [ ] Mobile/PWA

## 5. Riscos

| Risco                                                       | Mitigação                                                                                           |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Maior superfície já migrada — risco de regressão funcional  | Fazer por partes (aba por aba), testar cada uma isoladamente antes de trocar a rota real            |
| Focus Mode tem lógica de timer/estado complexa              | Portar com cuidado, testar timer de descanso e log de série manualmente                             |
| `localStorage` compartilhado entre React antigo e HTML novo | Não mudar o formato de `TrainingState` sem migração explícita de schema                             |
| Semáforo/PRs calculados errado                              | Replicar `inferSemaphore()` e cálculo de e1RM exatamente como estão em `utils.ts`/`treinos-sync.ts` |

## 6. Status

- [x] Fase 1 — motor (`treinos-sync.ts` → server functions)
- [x] Fase 2 — HTML (hoje/plano/histórico/Focus Mode/Khora)
- [x] Fase 3 — Host + registry
- [x] Fase 4 — testes (validação em navegador; falta ciclo real com usuário autenticado)
