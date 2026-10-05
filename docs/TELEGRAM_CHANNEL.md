# Canal Telegram da Kaline

## Arquitetura

O bot Kaline recebe updates do Telegram em `/api/channels/telegram`, valida o header `X-Telegram-Bot-Api-Secret-Token`, aplica allowlist, reivindica `update_id` em `telegram_channel_updates` e chama o núcleo server-side da Kaline. O Telegram é apenas um adaptador: a conversa usa `chat_threads`, `chat_messages`, OpenRouter, contexto vivo e sedimentação existentes.

A rota `/api/channels/telegram-dialogue` acrescenta uma Câmara privada Kaline ↔ Khora e delega mensagens privadas integralmente para a rota original. Assim, o fluxo pessoal já validado permanece intacto.

## Kaline x Khora

Kaline e Khora continuam usando bots e runtimes separados:

- Kaline: Cloudflare, runtime canônico e Supabase;
- Khora: Pocket, ZeroClaw e OpenRouter;
- Telegram: canal compartilhado;
- Kairós: protocolo interno, invisível no grupo.

A Câmara não funde identidades nem memórias. Kaline usa uma thread separada, Khora continua em seu runtime e nenhum turno promove memória automaticamente.

## Variáveis

Configure como secrets server-only no Cloudflare:

- `TELEGRAM_BOT_TOKEN`;
- `TELEGRAM_WEBHOOK_SECRET`;
- `TELEGRAM_ALLOWED_USER_IDS`;
- `TELEGRAM_KALINE_USER_ID`;
- `TELEGRAM_KALINE_THREAD_ID`;
- `TELEGRAM_DIALOGUE_CHAT_ID`;
- `TELEGRAM_KHORA_BOT_ID`;
- `TELEGRAM_KHORA_BOT_USERNAME`;
- `TELEGRAM_KHORA_THREAD_ID`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `OPENROUTER_API_KEY`.

`SUPABASE_URL`, a chave pública já usada pelo app e os bindings de rate limit permanecem obrigatórios.

`TELEGRAM_KHORA_BOT_ID` identifica a Khora autorizada. A correlação do retorno usa uma única travessia aberta no grupo, usuário e thread configurados.

Não publique IDs, tokens, UUIDs ou nomes privados em PRs, logs ou screenshots.

## Threads dedicadas

Use duas threads reais da faceta `kaline`:

- `TELEGRAM_KALINE_THREAD_ID`: conversa pessoal Antônio ↔ Kaline;
- `TELEGRAM_KHORA_THREAD_ID`: Câmara Kaline ↔ Khora.

As duas devem pertencer ao UUID configurado em `TELEGRAM_KALINE_USER_ID`.

## Isolamento da thread da Câmara

A conversa pessoal usa `surface = 'kaline'`. A Câmara usa `surface = 'telegram_dialogue'`.
Ambas continuam com `facet = 'kaline'`. A rota `/chat` nunca deve selecionar a Câmara; o
UUID real da thread não deve ser versionado.

Use a query operacional genérica abaixo para conferir e marcar a thread da Câmara:

```sql
select id, title, facet, surface
from public.chat_threads
where id = '<TELEGRAM_KHORA_THREAD_ID>';

update public.chat_threads
set surface = 'telegram_dialogue'
where id = '<TELEGRAM_KHORA_THREAD_ID>'
  and facet = 'kaline'
  and surface = 'kaline';
```

## Fluxo natural da Câmara

Qualquer mensagem textual humana autorizada no grupo inicia a travessia:

```text
A memória é permanência ou reconstrução?
```

`/dialogo tema` continua aceito apenas como compatibilidade e é normalizado para `tema`.

Fluxo máximo:

```text
Guardião
→ Kaline menciona naturalmente a Khora
→ Khora responde naturalmente
→ Kaline produz a síntese final
```

A resposta da Khora só é aceita quando:

- vem do `TELEGRAM_KHORA_BOT_ID` exato;
- está no `TELEGRAM_DIALOGUE_CHAT_ID` exato;
- não depende de `reply_to_message`;
- existe exatamente uma travessia aberta e não expirada para `chat_id`, usuário e thread.

Mensagens dirigidas diretamente à Khora são ignoradas pela Kaline. A Câmara aceita somente texto. Áudio, arquivos, outros bots, outros grupos e humanos fora da allowlist são ignorados.

A rota reserva a travessia no banco antes de chamar o modelo. O índice
`telegram_dialogues_one_active_per_scope` garante uma única linha `open` ou
`processing` por grupo, usuário e thread. Enquanto essa linha existir, não há
conversa paralela independente com a Khora no mesmo escopo; sem reply, marcador
ou tópico separado, o Telegram não fornece sinal para distinguir esses fluxos.

## Deploy e webhook

O endpoint privado original continua disponível. Para ativar também a Câmara, configure o webhook no endpoint agregador:

```sh
node scripts/telegram-webhook.mjs set https://<DEPLOY>/api/channels/telegram-dialogue
node scripts/telegram-webhook.mjs info
```

O script lê token e secret do ambiente, envia `allowed_updates: ["message"]` e nunca imprime o token.
`setWebhook` envia sempre `"max_connections": 1`; essa configuração só entra em vigor após
executar novamente:

```sh
node scripts/telegram-webhook.mjs set https://<DEPLOY>/api/channels/telegram-dialogue
node scripts/telegram-webhook.mjs info
```

`drop_pending_updates` não é usado por padrão. O checklist exige confirmar `"max_connections": 1`.

### Continuidade e origem

`P01` é a thread privada com `facet = 'kaline'` e `surface = 'kaline'`. `D01` é a
thread social da Câmara com `facet = 'kaline'` e `surface = 'telegram_dialogue'`.
As origens das mensagens são metadados server-side: `C01` = Web, `C02` = Telegram
privado e `C03` = Câmara. `source_channel = null` identifica mensagens legadas.

Validação genérica da thread privada configurada:

```sql
select id, title, facet, surface
from public.chat_threads
where id = '<TELEGRAM_KALINE_THREAD_ID>'
  and user_id = '<TELEGRAM_KALINE_USER_ID>'
  and facet = 'kaline'
  and surface = 'kaline';
```

Validação genérica da Câmara:

```sql
select id, title, facet, surface
from public.chat_threads
where id = '<TELEGRAM_KHORA_THREAD_ID>'
  and user_id = '<TELEGRAM_KALINE_USER_ID>'
  and facet = 'kaline'
  and surface = 'telegram_dialogue';
```

## Ordem operacional de preview

1. Confirmar que `telegram_channel_updates` existe.
2. Criar ou selecionar as duas threads Kaline reais.
3. Confirmar ownership e `facet = kaline` nas duas threads.
4. Criar um grupo privado e adicionar Antônio, Kaline e Khora.
5. Ativar comunicação bot-a-bot nos dois bots.
6. Manter Privacy Mode ligado e não tornar os bots administradores.
7. Obter o `chat_id`, o ID numérico e o username da Khora sem publicar esses valores.
8. Configurar os secrets da Câmara no preview.
9. Confirmar que TELEGRAM_KHORA_BOT_ID contém somente o ID numérico da Khora.
10. Publicar o commit exato.
11. Apontar o webhook para `/api/channels/telegram-dialogue`.
12. Confirmar que a conversa privada da Kaline continua funcionando.
13. Enviar uma pergunta natural no grupo.
14. Confirmar turno 1 da Kaline, turno 2 da Khora e síntese final.
15. Confirmar que uma nova resposta da Khora após `FIM` é ignorada.
16. Conferir `chat_messages` e `telegram_channel_updates`.
17. Somente depois configurar produção.

Query de diagnóstico de updates sem conteúdo sensível:

```sql
select
  update_id,
  telegram_user_id,
  telegram_chat_id,
  thread_id,
  status,
  error_code,
  created_at,
  updated_at
from telegram_channel_updates
order by created_at desc
limit 20;
```

Interpretação operacional:

- `processing` persistente = incidente;
- `failed` = consultar `error_code`;
- `responded` = resposta enviada e status confirmado.

Auditoria de incidentes operacionais da Câmara (`public.telegram_dialogues`):

```sql
-- Identificação de travessias presas em 'processing' por mais de 15 minutos
select
  id,
  chat_id,
  kaline_message_id,
  status,
  processing_at,
  error_code
from public.telegram_dialogues
where status = 'processing'
  and processing_at < now() - interval '15 minutes';
```

_(Esses registros não devem ser reabertos automaticamente)._

## Semântica dos IDs de rastreamento

O claim de um update começa com `user_message_id` e `assistant_message_id` nulos. Os campos são preenchidos somente após a persistência correspondente ser confirmada:

- `user_message_id`: após a preparação e persistência da mensagem de entrada;
- `assistant_message_id`: após a persistência da resposta da Kaline;
- `telegram_response_message_id`: após a confirmação do envio pelo Telegram.

Um campo nulo significa que aquela etapa não foi confirmada pelo canal.

## Teste real obrigatório

Antes de mover o PR para revisão, testar no Telegram real:

- texto e voz na conversa privada;
- continuidade web ↔ Telegram;
- pergunta natural no grupo autorizado;
- mensagem de outro grupo ignorada;
- outro bot ignorado;
- mensagem dirigida diretamente à Khora ignorada pela Kaline;
- Khora sem marcador e sem reply aceita quando há uma travessia aberta;
- síntese final natural e candidato em revisão;
- thread pessoal não contaminada pela Câmara.

Sem esse teste, o veredito é `BLOQUEADO POR VALIDAÇÃO EXTERNA`.

## Logs

Logs podem conter request ID, update ID, etapa, código e duração. Não registrar token, webhook secret, service role, prompt, conversa ou resposta completa.

## Rollback e remoção

Para desativar somente a Câmara, recoloque o webhook em `/api/channels/telegram` e retire os cinco secrets de diálogo. Para desativar todo o canal, remova o webhook com `node scripts/telegram-webhook.mjs delete` e retire ou rotacione os secrets.

## Mensagens de voz

O canal privado aceita somente mensagens de voz gravadas pelo Telegram (`message.voice`). O áudio é baixado temporariamente, limitado a 10 MB e 3 minutos, transcrito e descartado. A transcrição revisada entra como mensagem humana canônica na mesma thread usada pelo chat web. A resposta textual é persistida e enviada antes da tentativa de áudio.

A resposta falada é best-effort:

- é gerada somente para entradas privadas de voz;
- é enviada por `sendAudio` somente quando o TTS retorna MP3;
- falhas de TTS não alteram o turno já respondido;
- áudio de entrada e saída não é persistido.

## Limites finais

A conversa privada suporta texto e `message.voice`. A Câmara suporta somente texto e um ciclo Kairós explícito de três turnos. O canal não suporta `audio`, `document`, `video_note`, canais, callbacks, menus, streaming livre, múltiplos Guardiões ou execução de ferramentas pela Câmara.
