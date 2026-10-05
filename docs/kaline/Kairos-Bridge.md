# Olhar de Kairós — bridge online ↔ offline

## O que é

Um único endpoint, cifrado, de leitura, que a **Kaline Offline** (app local, repositório
separado) puxa sob demanda para sincronizar um snapshot consolidado do usuário:

```
GET /api/bridge/olhar-de-kairos
```

Não é um mecanismo de sync genérico. É deliberadamente um único `GET`: sem fila, sem
cursor de sincronização incremental, sem retry automático embutido no servidor, sem
endpoint de escrita correspondente (não existe `POST` que aceite envelopes de volta).

**Regra central**: o app online nunca recebe comandos abertos da Kaline Offline. O app
online só serve um snapshot cifrado; quem puxa, decifra e decide o que revisar é sempre
o lado local.

A Kaline Offline só conhece a faceta **Kaline** — o snapshot nunca inclui dados de
contexto da faceta **Kuan-Yin** (negócio), que é exclusiva do app online.

## Contrato

- **Path**: `GET /api/bridge/olhar-de-kairos` (exato, sem query params, sem versão na URL).
- **Auth**: bearer token de sessão Supabase, igual às demais rotas autenticadas (`/api/chat`, `/api/transcribe`).
- **Envelope de resposta**: exatamente `{ "v": 1, "iv": <base64>, "data": <base64> }`. Nada de campos extras.
- **Cripto**: AES-256-GCM, IV de 12 bytes, chave derivada por SHA-256 de `KALINE_BRIDGE_SHARED_KEY`. Ver `src/lib/kairos-crypto.server.ts`.
- **Conteúdo cifrado** (`data`, depois de decifrado): contexto vivo, identidade ativa, sedimentação, reuniões transcritas (truncadas) e últimas mensagens de chat — só faceta Kaline.

## Configuração de `KALINE_BRIDGE_SHARED_KEY`

A chave precisa ser **idêntica** nos dois lados:

- Online (este repo): `.env` local com `KALINE_BRIDGE_SHARED_KEY=...`; em produção, `wrangler secret put KALINE_BRIDGE_SHARED_KEY` (nunca em `[vars]` do `wrangler.toml`, que é texto plano versionado).
- Offline (Kaline Offline, `local-server/.env`): mesma variável, mesmo valor.

## Ação inversa — "Buscar do Offline"

Além do `GET` acima (online → offline), a UI do app online oferece uma ação manual
"Buscar do Offline" (online ← offline), em `Perfil`:

- A chamada ao `local-server` (`GET {VITE_KALINE_OFFLINE_LOCAL_URL}/bridge/olhar-de-kairos/local-snapshot`, default `http://127.0.0.1:64113`) é **client-side**, no navegador — o Worker da nuvem nunca acessa `127.0.0.1` da máquina do usuário.
- O envelope obtido é enviado para `POST /api/bridge/decifrar-snapshot-local`, uma rota auxiliar que só decifra (usa `KALINE_BRIDGE_SHARED_KEY` no servidor, nunca exposta ao navegador) e devolve o snapshot em texto claro — não persiste nada, não é um endpoint de sync.
- O snapshot recebido entra como **pendente/revisável** na UI — nunca aplicado automaticamente.

### CORS (configuração do lado offline)

Para a ação acima funcionar, a origem do app online precisa estar listada em
`KALINE_CORS_ALLOWED_ORIGINS` no `local-server/.env` da Kaline Offline (o
`@fastify/cors` já responde `OPTIONS`/preflight). Essa configuração é feita do lado
offline — não há nada a ajustar neste repositório além de documentar.
