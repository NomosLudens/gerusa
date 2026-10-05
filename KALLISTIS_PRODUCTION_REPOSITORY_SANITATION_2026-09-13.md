# KALLISTIS — Production Repository Sanitation — 2026-09-13

## 1. Executive result

`max:/srv/kallistis` was reconciled in place. Production source, validated fixes, migrations and the curated 28-track OST are now represented in Git. Three explicit `.orig` backups were removed; build output and dependencies remain ignored/generated.

## 2. Initial state

- AUTHORITATIVE_REPO: `/srv/kallistis`; HOST: `max`; BRANCH: `master`
- HEAD_BEFORE: `aabda9055b88646d810952ab255c69f25c1849c2`
- DIRTY_PATH_COUNT_BEFORE: 163; TRACKED_MODIFIED: 106; TRACKED_DELETED: 54; UNTRACKED: 57
- SERVICE_BEFORE: active

## 3. Classification methodology

Every status path was classified from imports, route tree, build inputs, runtime entrypoints, asset references, tests and migration contracts. No blanket assumption was made from `??` or `M`.

| Path set                                                                                              | Git state             | Category | Runtime/build evidence                                                                  | Action                    |
| ----------------------------------------------------------------------------------------------------- | --------------------- | -------- | --------------------------------------------------------------------------------------- | ------------------------- |
| `src/components/**`, `src/lib/**`, `src/routes/**`, `src/server/**`, `serve.mjs` and changed HTML/CSS | M or ??               | A        | imported/routed by the current app or server                                            | retained and versioned    |
| `db/migrations/0038..0042_*.sql`                                                                      | ??                    | A/B      | referenced by migration contract; required schema for presence/private-message features | versioned                 |
| `public/audio/ost/*.mp3` curated names                                                                | ??/rename             | A        | referenced by `src/lib/ost-catalog.ts`; 28 files present                                | versioned                 |
| old `public/audio/ost/**` and `public/media/ost/*.mp3`                                                | D/obsolete source     | C/D      | no current runtime references; replaced by curated catalog                              | removed from Git/worktree |
| changed and recovered `*.test.*`                                                                      | M or ??               | E        | real repository test suite                                                              | retained and versioned    |
| `dist/`, `node_modules/`                                                                              | ignored               | C/D      | reproducible dependency/build outputs                                                   | not versioned             |
| three `.orig` files                                                                                   | ignored               | F        | passive backups, not imported/routed/served                                             | removed explicitly        |
| secrets/local credentials                                                                             | none in staged source | G        | external environment file only                                                          | excluded                  |
| abandoned production source                                                                           | none proven           | H        | no safe removal candidate                                                               | none                      |
| unresolved paths                                                                                      | none                  | I        | no unresolved production dependency                                                     | none                      |

The complete path-level inventory and exact renames/deletions are preserved in commit `0676d7e0543e0165429df3008b8fd3041f40f265` (`git show --name-status`).

## 4. Production source recovered

Recovered and versioned the previously untracked production source for Master operational rail/command center, character sheets and routes, presence/private messages, campaign continuity, and five migrations. The 28 curated MP3 assets are also versioned.

## 5. Legitimate tracked modifications retained

Retained the current Forge bridge/HTML, server repositories and routes, Master/player surfaces, continuity HTML, sidebar, styles, generated route tree, and validated fix-pack behavior.

## 6. Generated artifacts

`dist/` and `node_modules/` are reproducible and ignored. No generated output was committed.

## 7. Temporary / backup residue removed

Removed exactly: `public/jogar/character-forge.html.orig`, `src/lib/canonical-rules.server.test.ts.orig`, and `src/server/chat/kallistis-chat-runtime.ts.orig`. No batch cleanup was used.

## 8. Local/secrets excluded

No `.env`, credentials, tokens, private keys or local configuration were staged. Gallery data remains external operational data as specified by `.gitignore`.

## 9. Abandoned files removed

No code file was removed as abandoned. Only obsolete audio paths and the three verified backup files were removed.

## 10. Ambiguous files and resolution

No unresolved ambiguous path remained after route/import/reference inspection.

## 11. `.gitignore` adjustments

No new ignore rule was needed. Existing rules correctly cover caches, outputs, local secrets, gallery data and backups.

## 12. Secret scan

`SECRET_SCAN=PASS` for staged paths; no secret material was committed. The protected `/etc/kallistis/kallistis.env` was not printed or copied.

## 13. Migrations

Migrations `0038` through `0042` were recovered and committed. `bun run check:local-migrations` returned `SQL_STATIC_CHECK=PASS`; SQL parser execution was `NOT_EXECUTED_PSQL_AVAILABLE` because `psql` is unavailable. No migration was reapplied.

## 14. Fix Pack incorporation

`FIX_01_PLAYER_MASTER_ISOLATION=VERSIONED`, `FIX_02_MAP_OPERATIONAL_FLOW=VERSIONED`, `FIX_03_PRIVATE_CHANNELS=VERSIONED`, `FIX_04_CHARACTERS_FORGE=VERSIONED`, `FIX_05_INTERNAL_IDS=VERSIONED`.

## 15. Commits

`0676d7e chore: reconcile production source baseline` contains the reconciled source and assets. This report is the documentation commit that follows it.

## 16. Typecheck

`bun run typecheck` — PASS.

## 17. Tests

`bun run test` — PASS: 73 test files, 480 tests. Two stale contracts were updated to the current curated OST and Forge bridge contract; no test was added solely to make CI green.

## 18. Build

`bun run build` — PASS. Existing deprecation, route-test inclusion and chunk-size warnings remain non-blocking and unrelated to sanitation.

## 19. Clean worktree proof

After the sanitation commit: `git status --porcelain` emitted no output. `UNTRACKED_FILES=0`; `TRACKED_MODIFICATIONS=0`.

## 20. Deploy

Normal VM procedure: `sudo -n systemctl restart kallistis.service`. Service is active and runs from `/srv/kallistis`; final restart verified `RUNTIME_FROM_CLEAN_HEAD=YES` at HEAD `06d3a5b...`.

## 21. Browser smoke

Authenticated browser smoke after restart: `/home`, `/mestre`, `/personagens`, `/chat`, `/mapas`, `/campanha/geek-wizards`, and `/campanha/taverna-dos-pandas` rendered. Real data was observed in Master fichas/rail, persisted chat messages, the interactive map iframe, Geek Wizards published continuity, and Taverna's real empty state. Console errors: 0.

## 22. Mobile smoke

At viewport 390×844, `/home`, `/mapas`, and `/personagens` rendered with responsive menu/main and zero console errors. `MOBILE_REGRESSION=NO` for the altered surfaces.

## 23. Origin synchronization

Push completed fast-forward and the final remote SHA was verified equal to the local HEAD; the worktree remained clean.

## 24. Final invariants

At sanitation runtime checkpoint: `AUTHORITATIVE_REPO=/srv/kallistis`, `SERVICE=active`, `APP_HTTP=200`, `READY_HTTP=200`, `LOCAL_AUDIO_COUNT=28`, `OLD_AUDIO_REFS=0`, `WORKTREE_CLEAN=YES`, `SECRETS_COMMITTED=NO`, `PARALLEL_CHECKOUT_USED=NO`, `TEMP_SOURCE_WORKSPACE_USED=NO`. Final HEAD: `63ac35f...`.

## 25. Verdict

`VERDICT=PASS`.

`PRODUCTION_REPOSITORY=SANITIZED`, `WORKTREE=CLEAN`, `PRODUCTION_SOURCE=VERSIONED`, `RUNTIME_FROM_VERSIONED_HEAD=YES`, and `ORIGIN_SYNCHRONIZED=YES`.
