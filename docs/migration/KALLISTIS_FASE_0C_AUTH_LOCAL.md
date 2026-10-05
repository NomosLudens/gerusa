# KALLISTIS — Fase 0C — auth, sessão e autorização local

## CURRENT_AUTH_MODEL

O checkout ainda é o shell TanStack Start/Cloudflare da Totalidade. A
autoridade corrente é Supabase Auth: o browser mantém sessão em `localStorage`,
o `auth-attacher` envia `Authorization: Bearer`, middleware e
`require-user.server` validam token com `getClaims`/`getUser`, e o banco usa
`auth.users`, `auth.uid()` e RLS. `client.server.ts` cria também um cliente
`service_role` para operações de sistema/legadas. O chat, memória e
sedimentação ainda dependem desses clientes e das respostas PostgREST.

Classificação desta fase:

- núcleo alvo KALLISTIS: substituir por sessão local + backend privado;
- UI e superfícies Totalidade não migradas: `LEGACY_SUPABASE_AUTH`;
- Supabase Storage: `STORAGE_DEFERRED`;
- Telegram, Câmara, Códice, Drive, Treino, Legal e agendas: `LEGACY_DEFERRED`;
- nenhum novo cliente, `.from()`, migration Supabase ou dual-write foi criado.

## MINIMUM_USER_CONTRACT

O domínio precisa somente de `id`, estado (`active`/`disabled`) e timestamps.
Nome, papel global, faceta, roster, dados pessoais e campos de outros domínios
ficam fora do núcleo. `user_id` sempre vem do contexto autenticado do backend;
corpo, query string e headers controlados pelo navegador não são autoridade.

Mestre/Jogador é decisão contextual de campanha e não entra como papel global
nesta fundação.

## CREDENTIAL_MODEL

Uma credencial humana é normalizada apenas com trim externo. Espaços internos,
maiúsculas, acentos e grafia são preservados. O banco não armazena plaintext.

- `credential_hash`: scrypt com salt aleatório, `N=32768`, `r=8`, `p=1`,
  digest de 32 bytes;
- `credential_lookup_digest`: HMAC-SHA-256 da credencial normalizada com uma
  chave de lookup fornecida em runtime, para localizar o hash sem guardar a
  credencial;
- nenhuma credencial real, Palavra real ou roster entra no repo, fixture, seed,
  README ou histórico.

Registro: `CREDENTIAL_HASH=scrypt`; `PARAMETERS=N=32768,r=8,p=1,32-byte key`;
`IMPLEMENTATION_SOURCE=node:crypto scrypt/scryptSync`; `NEW_DEPENDENCY=none`.

## SESSION_MODEL

Sessão opaca, com token CSPRNG de 256 bits. O browser recebe o token somente no
cookie; o banco recebe apenas SHA-256 do token. A linha mantém
`created_at`, `expires_at`, `last_seen_at` e `revoked_at`.

Timeouts pequenos e explícitos: absoluto de 30 dias e idle de 7 dias. Sessão
revogada, expirada ou ociosa falha. Rotação ampla fica fora desta fase.

## COOKIE_MODEL

Nome `__Host-kallistis_session`, sem `Domain`, com `Path=/`, `HttpOnly`,
`Secure` e `SameSite=Lax`. O prefixo `__Host-` é aplicável ao único origin
público planejado e impede escopo acidental por subdomínio.

## CSRF_MODEL

Como a autoridade é cookie, métodos seguros não exigem verificação. Métodos
inseguros exigem `Origin` igual ao origin público; se ausente, `Referer` igual
é aceito; sem ambos ou com origem estrangeira, rejeitar. Não há token CSRF
paralelo nesta fatia.

## AUTHORIZATION_MODEL

`cookie → sessão ativa → users.id → contexto autenticado → autorização → query`.
Cada leitura/mutação verifica ownership antes de devolver ou modificar dados.
Membership e papel de campanha serão relações próprias quando o domínio de
campanha entrar; não serão codificados como `role` global de `users`.

## RLS_DECISION

Não portar as policies Supabase por tradição. O primeiro núcleo usa PostgreSQL
privado, uma única Domain API na Max e autorização explícita no backend. As
funções atômicas recebem `p_user_id` já autenticado, usam `FOR UPDATE` e têm
execução pública revogada. RLS local pode ser adicionado depois como defesa em
profundidade se houver uma fronteira de conexão que justifique seu custo; não é
pré-requisito desta fundação.

## SERVICE_ROLE_REPLACEMENT

- `SYSTEM`: jobs internos com conexão privada e role mínima do app;
- `ADMIN`: autorização explícita de admin no backend, nunca chave no browser;
- `BACKGROUND`: worker/job autenticado por configuração de runtime, sem sessão
  do usuário inventada;
- `LEGACY`: clientes `service_role` atuais permanecem fora do núcleo até cada
  domínio ter migração própria.

Não existe equivalente frontend de `service_role`.

## MIGRATION_SEQUENCE

1. manter o shell legado explicitamente marcado;
2. materializar `users`, `credentials` e `sessions` em banco separado;
3. ativar endpoints same-origin somente quando a Domain API e o banco privado
   existirem juntos;
4. migrar chat/memória/sedimentação por repositório, uma superfície por vez;
5. remover Supabase Auth e Bearer do núcleo somente após prova manual real;
6. tratar Storage e demais domínios em missões separadas.

Não há fallback local→Supabase nem Supabase→local.

## SECURITY_INVARIANTS

- browser nunca possui credencial PostgreSQL;
- plaintext da credencial nunca é persistido ou logado;
- token, hash, cookie, URL de banco e secrets nunca são logados;
- sessão revogada/expirada/ociosa é rejeitada;
- `user_id`, ownership e papel não vêm do browser;
- PostgreSQL permanece privado;
- operações de sistema não são privilégio frontend;
- não há palavra canônica, roster, usuário real ou dado pessoal no repo.

## GATE_0C

```text
LOCAL_AUTH_DESIGN_COMPLETE=YES
SESSION_DESIGN_COMPLETE=YES
AUTHORIZATION_DESIGN_COMPLETE=YES
AUTH_UID_REPLACEMENT_DEFINED=YES
RLS_REPLACEMENT_DEFINED=YES
SAFE_TO_IMPLEMENT_LOCAL_AUTH=YES
```
