# Gerusa Core na Mini

O Core é a ponte privada entre o Worker Gerusa e o PostgreSQL isolado `gerusa`.
O Worker chama somente a API HTTPS do Core; somente o processo Core usa
`GERUSA_DATABASE_URL`.

## Runtime na Mini

- Clone canônico: `~/gerusa` (GitHub `NomosLudens/gerusa`).
- Unidade systemd de usuário: `infra/systemd/gerusa-core.service`.
- Porta: `127.0.0.1:4530`; não bindar em `0.0.0.0`.
- Configuração protegida: `~/.config/gerusa/gerusa.env` (modo `0600`).
- Variáveis: `GERUSA_DATABASE_URL`, `GERUSA_CORE_SECRET`, `GERUSA_CORE_PORT=4530`.
- O serviço usa Node.js e o pacote `pg` fixado em `8.16.3`.

Após atualizar o clone GitHub na Mini, instale o pacote do serviço e habilite a
unidade do usuário:

```sh
cd ~/gerusa/services/gerusa-core
npm ci --omit=dev
mkdir -p ~/.config/systemd/user
cp ~/gerusa/infra/systemd/gerusa-core.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now gerusa-core.service
```

## API interna

- `GET /health`: testa PostgreSQL e confirma internamente database/role `gerusa`.
- `POST /threads`: cria uma conversa.
- `GET /threads/:threadId/messages`: lê até as 200 mensagens mais recentes.
- `POST /threads/:threadId/messages`: grava uma mensagem `user` ou `assistant`.
- Exceto `/health`, todos os endpoints exigem `Authorization: Bearer <GERUSA_CORE_SECRET>`.
- O Core não carrega persona, não chama OpenRouter e não aceita conexões do browser.

## Tunnel e Worker

Hostname pretendido: `gerusa-core.nomosludens.ia.br`, encaminhado somente a
`http://127.0.0.1:4530`. O PostgreSQL não recebe rota no Tunnel.

No Worker, configure `GERUSA_CORE_URL` e `GERUSA_CORE_SECRET` como bindings de
servidor; `OPENROUTER_API_KEY` e `OPENROUTER_MODEL` também ficam no Worker. A
chave do banco não é configurada no Wrangler. Para desenvolvimento local, use
`.dev.vars`, que é ignorado pelo Git.

## Smoke operacional

Com as variáveis locais carregadas no host Mini, execute:

```sh
set -a
. ~/.config/gerusa/gerusa.env
set +a
node ~/gerusa/services/gerusa-core/smoke.mjs
```

O smoke verifica health, rejeição sem segredo, criação/leitura de mensagens
`user` e `assistant`, e remove a conversa técnica usando o papel isolado `gerusa`.
