# KALLISTIS PR5B — Import Hardening

DATE=2026-08-31
BASE_HEAD=d4d86736aa7c0cd6bef4a97d2571bc09e0c084bf
HOST=max
WORKTREE=/srv/kallistis
BRANCH=master

## Resultado

PR5A_STATUS=RESOLVED_BY_PR5B_PARTIAL
PR5B_STATUS=FAIL
CHARACTER_CYCLE=PASS_FROZEN

## Sincronização final

PRODUCTION_HEAD=3c1243916f96568332c3d8c04fe906d42039f92e
ORIGIN_MASTER_HEAD=3c1243916f96568332c3d8c04fe906d42039f92e
RUNTIME_HEAD=3c1243916f96568332c3d8c04fe906d42039f92e
WORKTREE=CLEAN

O fluxo de importação, revisão, publicação, cache e cleanup foi exercitado com dados exclusivamente sintéticos. O gate final de progressão server-side permaneceu bloqueado por `progression_patch_invalid`; não foi alterado o backend congelado para mascarar a falha.

## Reprodução pré-correção

Os JSONs inválidos foram aceitos indevidamente e reapareceram após reload (`Personagens salvas · 2`):

- Povo desconhecido: `cmthg9vbmf0iny`
- Número inválido: `cmthgabnghzzf5`

Ambos foram recriados como drafts no servidor e removidos exclusivamente por ID.

## Correção entregue

- Validação estrutural/canônica do JSON antes de `normalizarPersonagem`, `DB.personagens.push` ou `save`.
- Povo, herança, origem, Ofício, Papel, Chave, Técnica e números inválidos são rejeitados sem escrita local.
- Bridge distingue draft local nunca sincronizado de registro server-backed ausente; o segundo é removido sem novo PUT/CREATE.
- Forge referencia exatamente um asset fingerprintado dentro do `body`:
  `/jogar/character-forge-bridge.0da93622b5340a19.js`
- HTML público: `Cache-Control: no-cache`.
- Bridge público: HTTP 200, `Cache-Control: public, max-age=31536000, immutable`, `prompt(` = 0.

## E2E sintético

Personagem válido importado: `cmthgh9amju0z8`.

Passaram: import válido, save/reload, duplicata distinta, submit, rejeição com nota `PR5B final smoke`, persistência da nota/evento, correção, resubmit, aprovação/publicação v5, reload publicado, resumo rápido, Contexto Hermes, histórico, assistente e mensagem persistida, solicitação/habilitação/início de progressão e cleanup.

Falhou: aplicação da progressão canônica `Postura Inabalável · Nível I` para Marco 2, retornando `progression_patch_invalid`. A validação isolada do snapshot-base publicado e do patch canônico retornou `ok=true`; a divergência restante do payload efetivo do bridge não foi resolvida fora do escopo do backend congelado.

## Cleanup

IDs sintéticos usados: `cmthg9vbmf0iny`, `cmthgabnghzzf5`, `cmthgh9amju0z8`, `cmthghpevce9du`.

Após cleanup e reload sem limpar manualmente o storage:

characters=0
versions=0
events=0
progressions=0
messages=0
TEST_DATA_LEFT_BEHIND=NO
TEMP_IMPORT_FILES_LEFT=NO
DRAFT_RESURRECTION=FIXED

## Regressão

- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS — 50 suites, 371 testes
- `bun run build`: PASS
- `git diff --check`: PASS
- `kallistis.service`: active
- `kaline.service`: active; não tocado

## Gates finais

IMPORT_FLOW=PASS
IMPORT_CANONICAL_VALIDATION=PASS
INVALID_IMPORT_LOCAL_WRITE=NO
INVALID_IMPORT_SERVER_WRITE=NO
SERVER_AUTHORITY=YES
LOCAL_CACHE_AUTHORITY=NO
DRAFT_RESURRECTION=FIXED
IMPORT_TO_PUBLISH=PASS
PROGRESSION_APPLY=BLOCKED
PR5B_STATUS=FAIL
CHARACTER_CYCLE=PASS_FROZEN
