# KALLISTIS PR5C — Progression Payload Reconciliation

Date: 2026-08-31  
Result: `PR5C_STATUS=PASS`

## Scope

Only the progression payload delivery path was changed. No schema, migration, auth, reviewer capability, domain rule, Kaline service, or frozen character canon was changed.

## Root cause and fix

The authenticated PR5B cycle reached `progression_started` but `apply` returned `progression_patch_invalid`. The bridge was sending the visual character object, including server/runtime metadata, as the progression snapshot. The surgical fix adds `canonicalSnapshotForServer()` and uses it for both PUT save and POST progression apply. It clones the payload and removes `_server*`/`server*` metadata without mutating the visual object.

Delivery is one fingerprinted asset inside `<body>`:

`/jogar/character-forge-bridge.9ac708fb23cb4e13.js`

`PUBLIC_ASSET_VERIFIED=YES`  
`BROWSER_ASSET_VERIFIED=YES`  
`ACTIVE_UNVERSIONED_BRIDGE_REFERENCES=0`  
`ACTIVE_FINGERPRINTED_BRIDGE_REFERENCES=1`  
`ACTIVE_BRIDGE_PROMPT_CALLS=0`

HTTP verification: HTML `200`, `Cache-Control: no-cache`, `CF-Cache-Status: DYNAMIC`; asset `200`, `Cache-Control: public, max-age=31536000, immutable`, `CF-Cache-Status: MISS`.

## Real authenticated E2E

Synthetic character: `PR5C Payload Sintético 20260831`  
Character ID: `cmthigaikz98pp`  
Progression request ID: recorded server-side for this synthetic request; no real data used.

Passed: import JSON, save, reload, submit, approve/publish, published reload, quickref, Character Context, event ledger/history, progression request, reviewer enablement, progression start, canonical technique selection (`Postura Inabalável`), apply, version `2 → 3`, Marco `1 → 2`, post-apply reload, and UI double-apply blocking (no second apply control after completion).

Server event sequence:

`character_draft_created → character_draft_saved → character_submitted → character_approved → progression_requested → progression_enabled → progression_started → progression_applied`

`PROGRESSION_APPLY=PASS`  
`VERSION_INCREMENT=PASS`  
`MARCO_ADVANCE=PASS`  
`DOUBLE_APPLY_BLOCKED=PASS`

## Import regression checks

Valid synthetic import passed. PR5C.1 final negative smoke also passed in the authenticated Forge: `BATATÃO MÁGICO` was rejected and a numeric field containing a string was rejected. Both left zero local drafts and zero server-side characters; reload confirmed no resurrection.

## Cleanup and cache authority

The synthetic character was deleted transactionally by exact ID only. Final database counts for `cmthigaikz98pp`: `characters=0`, `versions=0`, `events=0`, `progressions=0`, `messages=0`. A browser reload afterward showed `Personagens salvas · 0`; no deleted draft reappeared from local cache.

Temporary JSON fixtures were local-only under `/tmp/kallistis-pr5c.sZzqnU/` and are removed after this report is committed.

## Regression

`bun run lint=PASS`  
`bun run typecheck=PASS`  
`bun run test=PASS (50 suites, 371 tests)`  
`bun run build=PASS`  
`git diff --check=PASS`  
`kallistis.service=active`  
`kaline.service=active`

`PR5C_STATUS=PASS`  
`PR5B_STATUS=RESOLVED_BY_PR5C`  
`IMPORT_CANONICAL_VALIDATION=PASS`  
`INVALID_IMPORT_LOCAL_WRITE=NO`  
`INVALID_IMPORT_SERVER_WRITE=NO`  
`DRAFT_RESURRECTION=FIXED`  
`CHARACTER_CYCLE=PASS_FROZEN`
