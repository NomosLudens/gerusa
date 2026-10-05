# Auditoria Supabase — Totalidade

## Decisão

O Supabase atual será tratado como ambiente descartável de desenvolvimento, desde que dados pessoais sejam exportados antes.

## Tabelas usadas pelo app

Auditoria feita por busca textual por `.from(`, `supabase.from(`, `supabaseAdmin.from(`, `insert(`, `update(`, `select(`, `delete(`, `createServerFn`, `routes/api`, `memory`, `kuanyin`, `codice`, `camara`, `chat` e `authz`. Os scripts deste PR exportam JSON paginado para as tabelas pessoais principais listadas como exportáveis; tokens, logs, caches e chunks regeneráveis ficam fora por padrão.

| Tabela                         | Onde é usada                                                                                                                           | Tipo de dado                                | Exportar antes do reset?                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `profiles`                     | `src/lib/use-profile.ts`, `src/lib/use-authz.ts`, `src/lib/perfis.functions.ts`, rotas de perfil/index                                 | Perfil, role, faceta inicial e preferências | Sim                                         |
| `chat_threads`                 | `src/lib/ensure-thread.ts`, `src/routes/api/chat.ts`, `src/components/ChatView.tsx`, sedimentação/bridge                               | Threads de conversa                         | Sim                                         |
| `chat_messages`                | `src/routes/api/chat.ts`, `src/components/ChatView.tsx`, voz, trilha, perfis                                                           | Mensagens de conversa                       | Sim                                         |
| `jardim_memorias`              | `src/lib/jardim.functions.ts`, contexto vivo, sedimentação, Câmara, revisão de memória                                                 | Memórias pessoais consolidadas              | Sim                                         |
| `memory_candidates`            | `src/lib/memory-review.functions.ts`, `src/lib/codice.functions.ts`, `src/lib/camara-do-eco.functions.ts`                              | Hipóteses/candidatas de memória             | Sim                                         |
| `registro_vivo`                | `src/lib/registro-vivo.functions.ts`, contexto vivo                                                                                    | Registros pessoais                          | Sim                                         |
| `presenca_regimes`             | `src/lib/presenca-regime.server.ts`, `src/lib/use-presenca-regime.ts`                                                                  | Estado/regime de presença                   | Sim                                         |
| `business_contexts`            | `src/lib/kuanyin.functions.ts`, `src/lib/kuanyin-public.functions.ts`, `src/lib/kuanyin-portal.functions.ts`, `src/routes/api/chat.ts` | Contexto comercial Kuan-Yin                 | Sim                                         |
| `kuanyin_guardians`            | `src/lib/kuanyin.functions.ts`, `src/lib/kuanyin-public.functions.ts`                                                                  | Guardiões/portais Kuan-Yin                  | Sim                                         |
| `kuanyin_clients`              | `src/lib/kuanyin.functions.ts`, `src/lib/kuanyin-public.functions.ts`                                                                  | Clientes                                    | Sim                                         |
| `kuanyin_appointments`         | `src/lib/kuanyin.functions.ts`, `src/lib/kuanyin-public.functions.ts`, portal                                                          | Agendamentos                                | Sim                                         |
| `kuanyin_orders`               | `src/lib/kuanyin.functions.ts`, `src/lib/kuanyin-public.functions.ts`, portal                                                          | Pedidos                                     | Sim                                         |
| `kuanyin_payments`             | `src/lib/kuanyin.functions.ts`, `src/lib/kuanyin-public.functions.ts`, portal                                                          | Pagamentos                                  | Sim                                         |
| `kuanyin_public_chat_threads`  | `src/lib/kuanyin.functions.ts`, `src/lib/kuanyin-public.functions.ts`                                                                  | Threads públicas Kuan-Yin                   | Sim                                         |
| `kuanyin_public_chat_messages` | `src/lib/kuanyin.functions.ts`, `src/lib/kuanyin-public.functions.ts`                                                                  | Mensagens públicas Kuan-Yin                 | Sim                                         |
| `livros`                       | `src/components/LegacyLivrosEngine.tsx`, `src/routes/_authenticated/klio.codice.margem.tsx`                                            | Livros/arquivos do Códice                   | Sim                                         |
| `codice_margens`               | `src/lib/codice.functions.ts`, `src/routes/_authenticated/klio.codice.margem.tsx`                                                      | Margens/anotações do Códice                 | Sim                                         |
| `camara_sessoes`               | `src/lib/camara.functions.ts`, `src/lib/camara-do-eco.functions.ts`, `src/routes/_authenticated/camara.tsx`                            | Sessões da Câmara do Eco                    | Sim                                         |
| `camara_segmentos`             | `src/lib/camara.functions.ts`, `src/routes/api/camara-transcribe-segment.ts`, `src/routes/_authenticated/camara.tsx`                   | Segmentos/audio/transcrições                | Sim                                         |
| `workspace_members`            | `src/lib/perfis.functions.ts`, `src/lib/kuanyin.functions.ts`, telas de perfis                                                         | ACL/workspaces                              | Sim, se for preservar multiusuário          |
| `workspace_invitations`        | `src/lib/perfis.functions.ts`, `src/lib/kuanyin.functions.ts`, telas de perfis                                                         | Convites                                    | Sim                                         |
| `user_roles`                   | `src/lib/perfis.functions.ts`                                                                                                          | Papéis/admin                                | Sim, se for preservar admins                |
| `profile_initial_contexts`     | `src/lib/perfis.functions.ts`                                                                                                          | Contexto inicial de perfil                  | Sim                                         |
| `contexto_externo`             | `src/lib/contexto-externo.functions.ts`, `src/lib/contexto-externo.server.ts`, import admin                                            | Contexto externo migrado                    | Sim                                         |
| `eventos`                      | agenda, contexto vivo, Kuan-Yin, Câmara                                                                                                | Agenda/eventos                              | Sim                                         |
| `sedimentos`                   | sedimentação, trilha, contexto vivo, bridge                                                                                            | Sedimentos de conversa                      | Sim                                         |
| `corpo_sinais`                 | treinos/contexto vivo                                                                                                                  | Sinais corporais                            | Sim                                         |
| `treino_sessoes`               | `src/lib/treinos-sync.ts`                                                                                                              | Sessões de treino                           | Sim                                         |
| `treino_sessao_exercicios`     | `src/lib/treinos-sync.ts`                                                                                                              | Exercícios de treino                        | Sim                                         |
| `treino_series`                | `src/lib/treinos-sync.ts`                                                                                                              | Séries de treino                            | Sim                                         |
| `drive_vehicles`               | `src/lib/drive.functions.ts`, contexto vivo                                                                                            | Veículos                                    | Sim                                         |
| `drive_refuels`                | `src/lib/drive.functions.ts`, contexto vivo                                                                                            | Abastecimentos                              | Sim                                         |
| `drive_oil_changes`            | `src/lib/drive.functions.ts`, contexto vivo                                                                                            | Óleo/manutenção                             | Sim                                         |
| `drive_expenses`               | `src/lib/drive.functions.ts`, contexto vivo                                                                                            | Gastos                                      | Sim                                         |
| `drive_trips`                  | `src/lib/drive.functions.ts`                                                                                                           | Viagens                                     | Sim                                         |
| `drive_docs`                   | `src/lib/drive.functions.ts`                                                                                                           | Documentos Drive                            | Sim                                         |
| `kuanyin_portal_tokens`        | `src/lib/kuanyin.functions.ts`, `src/lib/kuanyin-portal.functions.ts`                                                                  | Tokens de portal                            | Não exportar por padrão; recriar após reset |
| `kuanyin_integrity_logs`       | `src/routes/api/chat.ts`, `src/lib/kuanyin.functions.ts`                                                                               | Logs de integridade                         | Não exportar por padrão                     |
| `legal_documents`              | `src/lib/legal.functions.ts`                                                                                                           | Documentos jurídicos                        | Opcional                                    |
| `legal_chunks`                 | `src/lib/legal.functions.ts`                                                                                                           | Chunks de busca jurídica                    | Não exportar por padrão; regenerar          |
| `jurisprudencia`               | `src/routes/_authenticated/jurisprudencia.tsx`                                                                                         | Dados jurídicos legados                     | Opcional                                    |
| `legislacao`                   | `src/routes/_authenticated/jurisprudencia.tsx`                                                                                         | Dados jurídicos legados                     | Opcional                                    |
| `avatares`                     | `src/lib/use-profile.ts`                                                                                                               | Avatares de perfil                          | Opcional                                    |
| `infograficos`                 | `src/components/LegacyLivrosEngine.tsx`                                                                                                | Infográficos legados                        | Opcional                                    |
| `reunioes`                     | `src/routes/api/bridge/olhar-de-kairos.ts`                                                                                             | Reuniões bridge                             | Opcional                                    |

## Escopo dos scripts de export/import

Os scripts exportam/importam por padrão as tabelas pessoais principais: perfis, ACL básica, conversas, memórias, presença, contexto externo, agenda/sedimentos, Kuan-Yin operacional, Códice, Câmara, corpo/treinos e Drive. A exportação é JSON paginado (`PAGE_SIZE = 1000`) para evitar backup parcial em tabelas grandes.

Não são exportados por padrão: `kuanyin_portal_tokens`, `kuanyin_integrity_logs`, `legal_chunks`, caches, tokens antigos, logs temporários e dados regeneráveis. Esses itens devem ser recriados ou regenerados depois do reset. Storage/binários, especialmente `camara-audio` e arquivos referenciados por tabelas, precisam de plano de backup separado.

## Tabelas críticas

Sem estas tabelas o app tende a quebrar nas superfícies principais: `profiles`, `chat_threads`, `chat_messages`, `jardim_memorias`, `memory_candidates`, `registro_vivo`, `presenca_regimes`, `business_contexts`, `kuanyin_guardians`, `kuanyin_clients`, `kuanyin_appointments`, `kuanyin_orders`, `kuanyin_payments`, `kuanyin_public_chat_threads`, `kuanyin_public_chat_messages`, `livros`, `codice_margens`, `camara_sessoes`, `camara_segmentos`, `workspace_members`, `user_roles`, `contexto_externo`.

## Tabelas de dados pessoais

Conversas, memórias, registros, negócio, clientes e arquivos do Códice: `profiles`, `chat_threads`, `chat_messages`, `jardim_memorias`, `memory_candidates`, `registro_vivo`, `presenca_regimes`, `business_contexts`, `kuanyin_*`, `livros`, `codice_margens`, `camara_sessoes`, `camara_segmentos`, `contexto_externo`, `eventos`, `sedimentos`, `corpo_sinais`, `treino_*` e `drive_*`.

## Tabelas que podem ser descartadas

Logs temporários, cache, testes, dados mockados ou tabelas órfãs. Candidatas: `kuanyin_integrity_logs`, `legal_chunks`, tokens de portal antigos, caches/chunks regeneráveis, dados mockados e tabelas sem referência runtime confirmada.

## Colunas críticas conhecidas

- `profiles.role`
- `profiles.assigned_facet`
- `memory_candidates.status`
- `memory_candidates.user_id`
- `memory_candidates.approved_memory_id`
- `chat_threads.user_id`
- `chat_threads.facet`
- `chat_messages.thread_id`
- `chat_messages.user_id`
- `jardim_memorias.user_id`
- `business_contexts.user_id`
- `kuanyin_guardians.user_id`
- `kuanyin_guardians.admin_user_id`
- `kuanyin_clients.user_id`
- `kuanyin_appointments.user_id`
- `kuanyin_orders.user_id`
- `kuanyin_payments.user_id`
- `camara_segmentos.sessao_id`

## Baseline única (2026-07-02)

`supabase/migrations/` tem hoje um único arquivo:
`20260702010000_clean_baseline_v2.sql`. As 39 migrations incrementais
anteriores (`20260101000000_baseline.sql` até
`20260702000000_codice_livros_updated_at_fix.sql`, incluindo a antiga
tentativa de baseline `20260630000000_totalidade_baseline.sql`) foram
movidas para `supabase/migrations_legacy/` — ver o README lá para o que
isso significa (não afeta a produção atual, que já tem tudo aplicado do
lado do servidor).

**Como foi construída, e por quê isso importa:** não por leitura manual
das 39 migrations — isso já tinha produzido pelo menos 3 baselines
parciais erradas nesta mesma sessão (enums de `sedimento_nivel`/
`sedimento_status` totalmente fictícios, `app_role` com valor errado,
`livros` faltando colunas). O processo real foi: (1) replay das 39
migrations legadas do zero contra PostgreSQL 16 real, com stubs mínimos
de `auth.users`/`auth.uid()`/`storage.buckets`/`storage.objects`; (2)
extração do schema resultante via `pg_dump`; (3) cruzamento contra
`src/integrations/supabase/types.ts` (gerado do projeto real); (4)
geração do baseline novo; (5) diff coluna a coluna entre o schema do
replay e o do baseline novo (bateu exato, 47/47 tabelas); (6) teste de
idempotência (rodado duas vezes, sem erro); (7) testes funcionais reais:
insert/update em `sedimentos` com os enums corretos (confirmados byte a
byte contra `src/lib/sedimentar.functions.ts`), rejeição de valor de
enum inválido, e o fluxo completo de bootstrap de admin.

**Cobre tudo:** as 47 tabelas reais (contra as ~36 da tentativa anterior),
os 8 enums com valores corretos, as 5 funções, os 6 buckets de Storage
com policies, e RLS não-redundante por tabela (owner-only, workspace-
shared, ou os padrões assimétricos de `jardim_memorias`/`registro_vivo`/
`profiles`/`workspace_invitations`/`workspace_members`).

**Mudança deliberada vs. produção atual:** o bootstrap de admin foi
endurecido a pedido do dono. Hoje em produção todo signup vira admin
(`profiles.role` default `'admin'` + `handle_new_user()` sempre insere
`user_roles=('admin')`). No baseline novo, só o **primeiro** usuário
criado no projeto vira admin; todo signup seguinte nasce
`profiles.role='user'`, sem entrada em `user_roles`.

**Fora do escopo do baseline:** regenerar `src/integrations/supabase/types.ts`
continua exigindo `supabase gen types` contra um projeto real — não é
algo que um arquivo de schema estático possa fazer.

## Compartilhamento por workspace (`can_access_workspace`)

`chat_threads`, `chat_messages`, `livros`, `codice_margens`, `eventos` e as 5 tabelas `treino_*` usam a policy `can_access_workspace(user_id, modulo)` em vez de `auth.uid() = user_id` puro. Isso é **deliberado**, não resíduo do Lovable: existe um sistema de convite completo (`workspace_members`, `workspace_invitations`, rota `/convite`) que permite ao dono liberar módulos específicos para outra pessoa (ex.: um guardião/parceiro vendo a agenda ou o chat compartilhado). `camara_sessoes`, `camara_segmentos`, `registro_vivo`, `jardim_memorias` e `memory_candidates`, por outro lado, são estritamente `auth.uid() = user_id` — sem exceção de workspace.

Isso importa para qualquer código que adicione filtros `.eq('user_id', ...)` além do que a RLS já impõe: nas tabelas com `can_access_workspace`, um filtro assim no cliente/servidor quebra o acesso de membros convidados (foi provavelmente a causa real da reversão do PR #90 em #92). Antes de endurecer ownership em código de aplicação, confirme se a tabela usa `can_access_workspace` ou `auth.uid() = user_id` puro.

## Riscos

- `user_id` antigo pode mudar após reset.
- CSV cru pode quebrar vínculos.
- Ordem de importação importa.
- Generated types precisam ser regenerados após baseline.
- Storage (`camara-audio` e arquivos associados) precisa de backup separado se houver binários fora das tabelas.
- Conferir `manifest.json` antes do reset para validar contagens de linhas compatíveis com o esperado.
