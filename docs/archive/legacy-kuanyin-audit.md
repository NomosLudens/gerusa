# Auditoria do legado Kuan-Yin

## Decisão

`Tonyus-dev/totalidade` é o tronco principal.
`Tonyus-dev/kuanyin` é referência legada e fonte de peças reaproveitáveis.

Decisões fixadas:

1. Não fundir os repositórios.
2. Não continuar o `kuanyin` como tronco.
3. Usar `totalidade` como base principal do ecossistema K∧LINE.
4. Usar `kuanyin` apenas como fonte de padrões e peças pequenas.
5. Migrar somente peças pequenas, auditadas, testáveis e úteis.

## Bloqueio de auditoria direta do `kuanyin`

A auditoria direta do `Tonyus-dev/kuanyin` foi tentada e ficou bloqueada neste ambiente:

```bash
git clone https://github.com/Tonyus-dev/kuanyin.git /workspace/kuanyin
# fatal: unable to access 'https://github.com/Tonyus-dev/kuanyin.git/': CONNECT tunnel failed, response 403
```

Também não existe cópia local em `/workspace/kuanyin` ou `../kuanyin`, e a CLI `gh` não está instalada. Portanto, este documento **não afirma** que uma peça exista no `kuanyin` sem leitura direta. As tabelas abaixo separam:

- estado auditado diretamente no `totalidade`;
- arquivos do `kuanyin` que ainda precisam ser lidos;
- destinos reais no `totalidade` para quando a origem real for confirmada.

## Resumo executivo

| Área               | Estado no `kuanyin`                                 | Estado no `totalidade`                                                        | Decisão                                           |
| ------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| Produto            | Não auditado diretamente: acesso ao repo bloqueado. | Hub K∧LINE com Kuan-Yin como faceta.                                          | Tronco fica no `totalidade`.                      |
| Rotas              | Não auditado diretamente.                           | Rotas TanStack atuais e superfícies controladas por APP_REGISTRY.             | Não copiar rotas sem mapear para registry.        |
| App shell          | Não auditado diretamente.                           | Shell unificado TanStack Start.                                               | Manter shell atual.                               |
| Kuan-Yin comercial | Não auditado diretamente.                           | Clientes, agenda, pedidos, pagamentos, Guardiões e portal público existem.    | Só migrar regras pequenas após leitura do legado. |
| Chat/IA            | Não auditado diretamente.                           | `/api/chat` tem facetas, limites, anexos, sanitização e validação estrutural. | Não substituir chat atual.                        |
| Segurança          | Não auditado diretamente.                           | CSP/security headers, rate limit local, sanitização e testes já existem.      | Portar apenas lacunas comprovadas.                |
| Supabase           | Não auditado diretamente.                           | Supabase JS tipado, migrations e readiness check existem.                     | Não usar schema legado como baseline.             |
| Observabilidade    | Não auditado diretamente.                           | Logs JSON, `x-request-id`, health/ready e trace helpers existem.              | Integrar só diagnósticos faltantes.               |
| CI/scripts         | Não auditado diretamente.                           | CI roda Bun install, lint, typecheck, test e build.                           | Não adicionar auto-fix.                           |
| PWA                | Não auditado diretamente.                           | Há documentação de cache/PWA; runtime não foi alterado.                       | Não migrar service worker sem revisão.            |

## 1. Propósito

| Repo                    | Propósito auditado                                                                                                | Decisão                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `Tonyus-dev/kuanyin`    | Não auditado diretamente por bloqueio de acesso. Pelo contexto do PR, deve ser tratado como app comercial legado. | Referência, não tronco. |
| `Tonyus-dev/totalidade` | Hub principal do ecossistema K∧LINE, com Kuan-Yin como uma das superfícies.                                       | Tronco principal.       |

## 2. Stack e build

| Item             | `kuanyin`                                     | `totalidade` auditado                                                                                                            | Decisão                                     |
| ---------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `package.json`   | Pendente leitura direta.                      | Scripts: `dev`, `build`, `lint`, `typecheck`, `test`; deps incluem React 19, TanStack Start/Router, AI SDK, Supabase JS, Vitest. | Não alterar.                                |
| `vite.config.ts` | Pendente leitura direta.                      | Vite com TanStack Start, Router plugin, Tailwind, React e tsconfig paths.                                                        | Não copiar config legada inteira.           |
| Worker           | Pendente leitura de `wrangler.jsonc`.         | `wrangler.toml` aponta `dist/server/server.js`, assets em `dist/client`, OpenRouter/Supabase por vars.                           | Não substituir config atual.                |
| AI               | Pendente leitura direta.                      | OpenRouter/AI SDK centralizados em libs server e vars.                                                                           | Não copiar provider legado sem lacuna real. |
| Supabase         | Pendente leitura de `src/server/supabase.ts`. | Cliente server tipado em `src/integrations/supabase/client.server.ts`.                                                           | Preferir cliente tipado atual.              |

## 3. Rotas e superfícies

| Repo         | Rotas/superfícies auditadas                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kuanyin`    | Pendente leitura direta de `src/routes/__root.tsx`, `src/routeTree.gen.ts`, `src/routes/chat.tsx` e demais rotas.                                                                                 |
| `totalidade` | Existem `/`, `/auth`, `/convite`, `/g/:guardianId`, `/portal/:token`, APIs públicas/privadas e rotas autenticadas para Kuan-Yin, Kaline, Kháris, Klio/Códice, Drive, jurídico, memória e treinos. |

Qualquer rota reaproveitada do legado deve nascer no `totalidade` via APP_REGISTRY/rotas atuais; não migrar árvore antiga inteira.

## 4. Kuan-Yin comercial

| Capacidade        | `kuanyin`                                                 | `totalidade` auditado                                                                | Decisão                                   |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| Clientes          | Pendente leitura direta.                                  | Rota autenticada `kuan-yin.clientes` existe.                                         | Migrar só regras/fixtures úteis.          |
| Agendamentos      | Pendente leitura direta.                                  | Rota autenticada `kuan-yin.agendamentos` existe.                                     | Não duplicar superfície.                  |
| Pedidos           | Pendente leitura direta.                                  | Rota autenticada `kuan-yin.pedidos` existe.                                          | Reaproveitar normalizadores se existirem. |
| Pagamentos        | Pendente leitura direta.                                  | Rota autenticada `kuan-yin.pagamentos` existe; funções públicas tratam comprovantes. | Reaproveitar validações se existirem.     |
| Página pública    | Pendente leitura direta.                                  | `/g/:guardianId` existe.                                                             | Manter contrato atual.                    |
| Portal/token      | Pendente leitura direta.                                  | `/portal/:token` existe.                                                             | Não duplicar.                             |
| Integridade/admin | Pendente leitura de `ethical*`, `*integrity*`, `*audit*`. | Admin e observabilidade existem parcialmente.                                        | Migrar casos/testes, não painel inteiro.  |

## 5. Chat e IA

| Tema                 | `kuanyin`                                                        | `totalidade` auditado                                                                     | Decisão                             |
| -------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| Chat                 | Pendente leitura de `src/routes/chat.tsx` e `src/server/chat/*`. | `/api/chat` valida envelope, limita mensagens/caracteres, usa facetas e streamText.       | Não substituir.                     |
| Ações estruturadas   | Pendente leitura direta.                                         | Guardrail impede ação estruturada sem intenção explícita e exige confirmação por preview. | Migrar só testes/casos.             |
| Anexos               | Pendente leitura direta.                                         | Chat normaliza data URL/base64 e media type.                                              | Manter implementação atual.         |
| Modelo/provider      | Pendente leitura direta.                                         | OpenRouter/AI SDK atual.                                                                  | Não copiar provider antigo.         |
| Memória/sedimentação | Pendente leitura direta.                                         | Há migrations e superfícies de memória/revisão.                                           | Integrar só pela arquitetura atual. |

## 6. Supabase e schema

| Tema           | `kuanyin`                                     | `totalidade` auditado                                                             | Decisão                               |
| -------------- | --------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| Acesso a dados | Pendente leitura de `src/server/supabase.ts`. | Supabase JS tipado em `client.server.ts` com `Database`.                          | Não migrar REST manual sem prova.     |
| Schema         | Pendente leitura direta.                      | Migrations versionadas em `supabase/migrations/*` e generated types.              | Não usar schema legado como baseline. |
| Health check   | Pendente leitura de `*status*`.               | `/api/public/ready` verifica Supabase auth health e presença de chave OpenRouter. | Reaproveitar só checks ausentes.      |
| Baseline limpa | Pendente leitura direta.                      | Estado atual é incremental por migration.                                         | Fazer auditoria/reset em PR próprio.  |

## 7. Segurança

| Peça                     | `kuanyin`                                     | `totalidade` auditado                                                                                                                   | Decisão                                    |
| ------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| CSP                      | Pendente leitura direta.                      | `src/lib/csp.ts` já define `Content-Security-Policy`.                                                                                   | Migrar só melhorias comprovadas.           |
| Security headers         | Pendente leitura direta.                      | `src/lib/csp.ts` já define `X-Content-Type-Options`, `X-Frame-Options`, Referrer-Policy, HSTS, Permissions-Policy e `X-XSS-Protection`. | Não duplicar.                              |
| Aplicação dos headers    | Pendente leitura direta.                      | `src/start.ts` aplica `applySecurityHeaders` via request middleware.                                                                    | Manter caminho atual.                      |
| Rate limit               | Pendente leitura de `*rate*`/`RATE_LIMITER`.  | `src/lib/rate-limit.ts` é in-memory por isolate, com testes.                                                                            | Só migrar solução distribuída real.        |
| Prompt injection         | Pendente leitura de `test:injection`.         | `/api/chat` tem bloco anti-injection; há sanitização e testes de estrutura.                                                             | Portar casos de teste, não prompt inteiro. |
| Ética comercial          | Pendente leitura de `test:ethics`/`ethical*`. | `chat-response-structure.test.ts` já cobre promessas indevidas/urgência em Kuan-Yin.                                                    | Portar casos faltantes.                    |
| Sanitização pós-resposta | Pendente leitura direta.                      | `src/lib/sanitize-assistant-output.ts` e testes existem.                                                                                | Reaproveitar só casos novos.               |

## 8. Observabilidade

| Tema            | `kuanyin`                       | `totalidade` auditado                                               | Decisão                     |
| --------------- | ------------------------------- | ------------------------------------------------------------------- | --------------------------- |
| Logs            | Pendente leitura direta.        | `src/server.ts` emite logs JSON por request.                        | Manter formato atual.       |
| `request_id`    | Pendente leitura direta.        | `src/server.ts` aceita/gera `x-request-id` e propaga no response.   | Não duplicar.               |
| Status endpoint | Pendente leitura de `*status*`. | `/api/public/health` e `/api/public/ready` existem.                 | Migrar só checks faltantes. |
| `trace_id`      | Pendente leitura direta.        | `src/lib/observability/trace.ts` e uso em funções públicas existem. | Evoluir em PR próprio.      |

## 9. CI

| Item     | `kuanyin`                        | `totalidade` auditado                                                        | Decisão                                 |
| -------- | -------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| Workflow | Pendente leitura direta.         | `.github/workflows/ci.yml` instala Bun e roda lint, typecheck, test e build. | Não alterar neste PR.                   |
| Scripts  | Pendente leitura de `scripts/*`. | Nenhum script alterado.                                                      | Migrar só scripts de leitura/auditoria. |
| Auto-fix | Pendente leitura direta.         | CI atual é verificadora.                                                     | Não adicionar auto-fix.                 |

## 10. Peças recomendadas para reaproveitar

Nenhuma peça do `kuanyin` fica aprovada para reaproveitamento neste PR porque a origem real não pôde ser lida. A tabela abaixo é a fila de verificação: cada item só vira PR quando o arquivo de origem real existir e for citado.

| Peça                                    | Origem real no `kuanyin`                                              | Destino sugerido real no `totalidade`                                                                             | Prioridade | Decisão atual                                                  |
| --------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------- |
| Distributed rate limit / `RATE_LIMITER` | **Pendente leitura**: procurar `src/server/*rate*`, `wrangler.jsonc`. | `src/lib/rate-limit.ts` ou binding Worker no `wrangler.toml`.                                                     | Alta       | Só migrar se for distribuído; o atual é in-memory por isolate. |
| Testes de prompt injection              | **Pendente leitura**: procurar script `test:injection` e testes.      | `src/routes/api/chat.ts`, `src/lib/sanitize-assistant-output.test.ts`, `src/lib/chat-response-structure.test.ts`. | Alta       | Migrar casos, não implementação inteira.                       |
| Testes de ética comercial               | **Pendente leitura**: procurar `test:ethics`, `src/server/ethical*`.  | `src/lib/chat-response-structure.test.ts` e futura lib pequena Kuan-Yin.                                          | Alta       | Migrar fixtures/casos faltantes.                               |
| Schema health check                     | **Pendente leitura**: procurar `*status*`, scripts DB.                | `src/routes/api/public/ready.ts`.                                                                                 | Média      | Adicionar só checks ausentes e seguros.                        |
| API response normalizer                 | **Pendente leitura**: procurar `src/server/api.ts`.                   | APIs atuais em `src/routes/api/*`.                                                                                | Média      | Extrair função pequena se houver valor.                        |
| Admin audit log                         | **Pendente leitura**: procurar `*audit*`, `*integrity*`.              | Admin/observabilidade atuais e migrations futuras.                                                                | Média      | Depende de schema atual; não migrar direto.                    |
| Build-info generation                   | **Pendente leitura**: procurar `scripts/*`.                           | Build/deploy metadata futuro.                                                                                     | Baixa      | Só se for leitura simples e sem auto-fix.                      |
| CSP/security headers                    | **Pendente leitura**: procurar server/worker legado.                  | `src/lib/csp.ts`, `src/start.ts`.                                                                                 | Baixa      | Totalidade já tem CSP/headers; migrar só lacuna objetiva.      |
| Public status endpoint                  | **Pendente leitura**: procurar `*status*`.                            | `src/routes/api/public/health.ts`, `src/routes/api/public/ready.ts`.                                              | Baixa      | Totalidade já tem endpoints; migrar só checks novos.           |

## 11. Peças que NÃO devem ser migradas

| Peça                                   | Motivo                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/server/api.ts` monolítico inteiro | Risco de acoplar rotas, segurança e negócio antigos. Extrair só funções pequenas após leitura. |
| `AuthProvider` legado inteiro          | Autenticação atual depende do shell e Supabase do `totalidade`.                                |
| `wrangler.jsonc` inteiro               | Config atual é `wrangler.toml` do Worker `totalidade`.                                         |
| Vite config Lovable inteira            | Risco de quebrar TanStack Start atual.                                                         |
| Rotas antigas fora do APP_REGISTRY     | O shell atual usa registry como contrato de navegação/superfície.                              |
| Chat antigo inteiro                    | Chat atual já tem facetas, anexos, limites, guardrails, sanitização e testes.                  |
| Schema antigo como baseline            | Alto risco de drift e regressão nas migrations atuais.                                         |
| Service worker antigo sem revisão      | Cache antigo pode prender assets/API obsoletos.                                                |
| Provider/modelos antigos               | Configuração atual centraliza OpenRouter/AI SDK.                                               |

## 12. PRs futuros recomendados

1. **Desbloquear leitura do `Tonyus-dev/kuanyin`**: fornecer checkout local, token/credencial ou artefato do repo; sem isso, não migrar nada.
2. **Hardening do chat**: após leitura real, portar apenas casos de prompt injection, sanitização e ações estruturadas que faltem no `totalidade`.
3. **Auditoria/reset Supabase**: comparar schema legado com migrations atuais sem usar legado como baseline.
4. **Security headers/CSP**: só abrir se o legado tiver header que falte em `src/lib/csp.ts`.
5. **Schema health check**: adicionar checks faltantes em `/api/public/ready`.
6. **Testes prompt injection/ética**: portar fixtures/casos úteis do legado.
7. **Diagnóstico por `trace_id`**: padronizar correlação entre request, chat, funções públicas e logs.
8. **Painel do Guardião**: evoluir admin/audit log e integridade comercial dentro das superfícies atuais.
