# Deploy do Kaline Totalidade em Cloudflare Workers

Este projeto está preparado para rodar em uma conta Cloudflare própria, usando
Supabase próprio e provedores de IA configurados por secrets de runtime. Veja também `docs/supabase-setup.md` para o checklist do banco, Auth e Storage.

## 1. Build local

```bash
bun install
bun run build
```

O build TanStack Start/Nitro deve gerar:

- `dist/server/server.js` — entry do Worker configurado no `wrangler.toml`
- `dist/client/` — assets estáticos servidos pelo binding `ASSETS`

## 2. Autenticar wrangler

```bash
bunx wrangler login
```

## 3. Secrets de runtime

As variáveis declaradas em `[vars]` no `wrangler.toml` são enviadas
automaticamente no `wrangler deploy` como variáveis **não secretas**. Isso cobre
os defaults de modelos OpenRouter e flags de recurso.

Os valores sensíveis **não são preenchidos automaticamente**. Configure os
secrets usados pelos handlers server-side no terminal ou, se não tiver terminal,
pelo painel da Cloudflare em **Workers & Pages → seu Worker → Settings →
Variables and Secrets**:

```bash
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SUPABASE_ANON_KEY
```

> `SUPABASE_SERVICE_ROLE_KEY` é privado e deve existir apenas no runtime do
> Worker. Nunca exponha essa chave no client.

`SUPABASE_ANON_KEY` pode ser a anon/publishable key do Supabase. O código também
aceita `SUPABASE_PUBLISHABLE_KEY` se você preferir esse nome.

`SUPABASE_URL` está configurada em `wrangler.toml` com a Project URL
do Supabase: `https://eljftgvjjeynkhijdthq.supabase.co`. Se você for usar outro
projeto, troque esse valor no `wrangler.toml` ou configure `SUPABASE_URL`
manualmente no painel da Cloudflare.
Sem a URL real do Supabase, o Worker sobe, mas as rotas que acessam banco/Auth
falham.

## 4. Variáveis de build do frontend

`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` são embutidas no bundle em
build-time pelo Vite quando existirem. No Worker, o app também injeta a
configuração pública do Supabase em runtime a partir de `SUPABASE_URL` +
`SUPABASE_ANON_KEY`/`SUPABASE_PUBLISHABLE_KEY`, então um deploy Cloudflare não
depende exclusivamente das variáveis `VITE_*` no bundle.

## 5. Deploy

```bash
bunx wrangler deploy
```

A URL inicial será `https://kaline-totalidade.<seu-subdomínio>.workers.dev`.

## 6. Domínio próprio

No painel da Cloudflare, adicione seu domínio customizado. A Cloudflare emite TLS
automaticamente.

## 7. Considerações

- O backend e os buckets continuam no Supabase configurado pelas variáveis de ambiente.
- `pdfjs-dist` e `mammoth` continuam carregados no browser via import dinâmico.
- O entry `src/server.ts` é compatível com `workerd`.
- O CSP deste projeto é calculado por request para ler `SUPABASE_URL` em runtime.
- O endpoint `/api/tts` usa `APP_PUBLIC_URL` como fallback para referer quando `Origin` não estiver presente.
- Cron jobs: se algum endpoint `/api/public/*` precisar ser disparado por schedule, configure via `wrangler.toml` + handler `scheduled`.
