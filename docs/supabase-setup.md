# Supabase próprio — checklist de preparação

Este projeto espera um Supabase próprio com Auth, Postgres, Storage e RLS ativos.
Não coloque secrets no frontend: a chave `SUPABASE_SERVICE_ROLE_KEY` só deve existir
em runtime server-side, como secret do Cloudflare Worker ou no ambiente local seguro.

## 1. Criar projeto

1. Crie um projeto Supabase na sua conta.
2. Copie a Project URL para `SUPABASE_URL` e `VITE_SUPABASE_URL`.
3. Copie a publishable/anon key para `SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Copie a service role key apenas para `SUPABASE_SERVICE_ROLE_KEY` no runtime server-side.

## 2. Aplicar migrations

Desde 2026-07-02, `supabase/migrations/` tem um único arquivo:
`20260702010000_clean_baseline_v2.sql` — idempotente, provisiona o schema
completo (47 tabelas, enums, funções, RLS, Storage) de uma vez. As
migrations incrementais antigas foram movidas para
`supabase/migrations_legacy/` (histórico, não aplicar — ver o README lá).

### Via GitHub Actions (opcional, só disparo manual)

O repositório tem dois workflows para isso, mas **desde 2026-07-02 nenhum dos dois roda
automaticamente**: eram pensados para o modelo antigo de migrations incrementais, onde
`supabase/migrations/` sempre refletia (em ordem) o que já estava aplicado na produção atual.
Isso não é mais verdade — o diretório agora tem só o baseline único para um projeto **novo**, e
o histórico de migrations já aplicadas na produção atual (as 39 antigas) não existe mais nesses
arquivos. Rodar `supabase db push` automaticamente contra o projeto de produção linkado nos
secrets do repositório iria falhar (ou pior, tentar reconciliar histórico de um jeito
inesperado). Por isso os dois foram trocados para `workflow_dispatch` (só manual):

- **`.github/workflows/supabase-migrations-check.yml`** — faz `supabase db push --dry-run`
  contra o projeto linkado nos secrets, sem aplicar nada. Útil para validar a baseline contra um
  projeto **novo** antes de aplicar de verdade.
- **`.github/workflows/supabase-migrations-apply.yml`** — aplica de verdade (`supabase db
push`) contra o projeto linkado nos secrets.

Se for usar esses workflows (ex.: apontando os secrets para um Supabase novo, não a produção
atual), cadastre em **Settings → Secrets and variables → Actions**:

| Secret                  | Onde pegar                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens                                                      |
| `SUPABASE_PROJECT_REF`  | Project Settings → General (ou o subdomínio da `SUPABASE_URL`, ex. `eljftgvjjeynkhijdthq`) |
| `SUPABASE_DB_PASSWORD`  | Project Settings → Database                                                                |

Depois dispare manualmente em **Actions → Supabase migrations check/apply → Run workflow**.

### Manual (CLI local, fallback)

Com o Supabase CLI autenticado e linkado ao projeto:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

A baseline cria tabelas, enums, funções, triggers, grants, buckets de Storage
e políticas RLS — tudo num único `db push`.

### Sem acesso ao terminal

Se você não tiver acesso ao terminal, dá para aplicar pelo painel web do
Supabase:

1. Abra o projeto no Supabase.
2. Vá em **SQL Editor**.
3. Crie uma query nova.
4. Copie o conteúdo de `supabase/migrations/20260702010000_clean_baseline_v2.sql`
   inteiro e clique em **Run**.
5. Não aplique arquivos de `supabase/migrations_legacy/` nem de
   `supabase/migrations_archive/`; ambos são histórico preservado, não a
   sequência ativa de provisionamento.

O arquivo é idempotente — seguro rodar de novo se precisar (`create table if
not exists`, `drop policy if exists` + `create policy`, etc.), inclusive
contra um projeto que já tenha algumas dessas tabelas de uma tentativa
anterior.

## 3. Papel de admin ao criar um usuário

Desde a baseline `20260702010000_clean_baseline_v2.sql`, só o **primeiro**
usuário criado no projeto vira admin automaticamente: a trigger
`on_auth_user_created` (função `handle_new_user`) checa se `public.profiles`
está vazia no momento do INSERT em `auth.users`. Se estiver, esse usuário
recebe `profiles.role = 'admin'` e uma linha em `public.user_roles` com
`role = 'admin'`. **Qualquer signup seguinte** nasce com `profiles.role =
'user'` (default da coluna) e sem entrada em `user_roles`.

Isso é uma mudança deliberada em relação ao comportamento antigo (onde todo
signup virava admin) — ver `supabase/migrations_legacy/README.md` para o
histórico. O objetivo é que um projeto novo, provisionado do zero, já tenha
um admin funcional assim que o primeiro usuário se cadastra, sem conceder
admin a mais ninguém depois disso.

Nesse modelo, `admin` = dono do workspace (pode gerenciar o módulo jurídico e
convidar membros via `perfis.functions.ts`). Um usuário convidado por outro
admin é rebaixado para `member` automaticamente quando aceita o convite.

Então: **para o primeiro usuário, basta aplicar as migrations (passo 2) e
criar a conta** — o primeiro signup já sai admin. Para promover qualquer
usuário posterior (ou revogar admin de alguém), rode no SQL Editor do
Supabase.

Há dois lugares que guardam o papel e ambos precisam ser atualizados juntos:
`public.profiles.role` (é o que a UI do app lê, via `use-authz.ts`) e
`public.user_roles` (é o que `has_role()` usa nas políticas RLS de
`legal_documents`/`legal_chunks`):

```sql
-- promover para admin
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'usuario@exemplo.com');

insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'usuario@exemplo.com'
on conflict (user_id, role) do nothing;

-- revogar admin (rebaixar)
update public.profiles set role = 'user'
where id = (select id from auth.users where email = 'usuario@exemplo.com');

delete from public.user_roles
where role = 'admin'
  and user_id = (select id from auth.users where email = 'usuario@exemplo.com');
```

## 4. Buckets esperados

| Bucket           | Uso                                   | Público |
| ---------------- | ------------------------------------- | ------- |
| `reunioes-audio` | Áudios de reuniões antigas.           | Não     |
| `livros-docs`    | PDFs/DOCX enviados na área de livros. | Não     |
| `infograficos`   | Imagens geradas para livros.          | Não     |
| `avatares`       | Avatares de perfil.                   | Não     |
| `camara-audio`   | Segmentos da Câmara de Eco.           | Não     |
| `codice-books`   | EPUBs enviados na biblioteca Códice.  | Não     |

Os objetos seguem o padrão de path com o `user_id` como primeira pasta. As
políticas de Storage usam esse prefixo para restringir leitura/escrita ao dono.

## 5. Auth e redirects

Configure as URLs do Supabase Auth conforme o domínio final:

- Site URL: `https://seu-dominio`
- Redirect URLs adicionais:
  - `https://seu-dominio/auth`
  - `https://seu-dominio/klio`
  - `http://localhost:5173/auth`
  - `http://localhost:5173/klio`

Se usar Apple OAuth, configure o provider Apple no painel do Supabase e confirme
que o redirect permitido bate com o domínio público do app.

## 6. Variáveis no Cloudflare Worker

Secrets privados:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_PUBLISHABLE_KEY
# Alternativa compatível: wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Variáveis públicas de build devem estar presentes antes de `bun run build`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## 7. Verificações após deploy

1. Abra `/api/public/health` para confirmar que o Worker responde.
2. Abra `/api/public/ready` para validar Supabase e IA configurada.
3. Crie uma conta de teste pelo fluxo `/auth`.
4. Faça upload pequeno em `livros-docs` e `camara-audio` para validar Storage/RLS.
