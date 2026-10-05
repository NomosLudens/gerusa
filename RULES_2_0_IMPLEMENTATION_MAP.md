# KALLISTIS — RULES 2.0 IMPLEMENTATION MAP

Audit target: VM MAX, /srv/kallistis, branch master, base HEAD
119c07e31972c8b7707f25867aecf658cde35347.

## Authoritative runtime

- Service: kallistis.service (/usr/bin/bun run start, active)
- Checkout: /srv/kallistis
- Database: PostgreSQL real da VM MAX, database kallistis, port 5433
- Origin: https://github.com/Tonyus-dev/kallistis.git
- Delivery: https://kallistis.app and VM MAX serve the same Forge HTML hash after build

## Canonical source and consumers

- Source installed: CANON/KALLISTIS_REGRAS_CANONICAS_COMPLETAS.md
- Magic source installed: CANON/KALLISTIS_COSMOLOGIA_E_SISTEMA_DA_MAGIA_v1.7.md
- Retrieval metadata: src/lib/canonical-rules.server.ts uses kallistis-rules-2.0,
  version 2.0, and the consolidated canonical file.
- Character ruleset: KALLISTIS_2_0 / KALLISTIS_REGRAS_CANONICAS_2.0
- Existing chat, tools, oriented assistant, and character routes continue using
  the shared canonical runtime; no Supabase or parallel rules engine was added.

## Regras 2.0 mapped to the product

- Povos: existing Forge catalog and canonical snapshot validation.
- Ofícios, Papéis, Chaves and Técnicas: existing Forge progression and server
  validation, with stale names rejected by the existing allowlists.
- Trilhas and progression: existing trilhas[], Marco gains, caps, epic
  horizons, and homologation fields remain the persisted model.
- Magic/Formas: src/server/characters/magic-forms.ts,
  public/jogar/kallistis-magic-forms.generated.js, and
  scripts/generate-magic-forms.mjs provide 76 canonical forms by stable ID.
  The active model is knownForms[{formId,maxGrade}]; Tecelão totals are
  cumulative and grade caps follow the canonical Marco gates.
- Legacy nominal spells: old magias[] is read-only compatibility input and
  returns magic_legacy_reconciliation_required; it is not an active catalog
  and is not auto-converted.
- Resolution and derived values: existing character-canon, context, and Forge
  derivation paths remain shared; no parallel resolver was created.

## TAL administrative flow

- Identity authority: existing system_roles.system_role=system_master;
  current authenticated TAL identity is resolved by the real database.
- UI entry: MasterSheetsPanel exposes the existing Character Forge with
  mode=tal&characterId=....
- Server write: PUT /api/master/characters reuses the existing repository,
  canonical validation, optimistic version, audit event and actor identity.
- Ownership: owner_user_id is preserved; TAL is the editing actor, not the
  owner. Ordinary players remain limited to their own records.
- Status boundary: submitted, approved and archived records remain protected
  from ordinary Forge writes; draft and rejected records can be corrected.
- Reload proof: a rejected real ficha was edited by TAL, persisted, reloaded,
  and restored to its original content. The PostgreSQL record preserved its
  owner and recorded the TAL actor.

## Database and migrations

- Migration ledger was audited on PostgreSQL 5433; current maximum is
  0037_epic_manifestation_review.sql.
- No migration was necessary for Regras 2.0 or TAL: the existing character,
  version, event, owner and reviewer structures already support the flow.
- No Supabase migration, provider database, mock database, or alternate
  persistence path was used.

## Verification map

- Automated: typecheck, test suite, and build pass after the final source
  changes.
- Runtime: kallistis.service active; local and public Forge HTML hashes
  match after the production build.
- Authenticated manual: protected route, Forge creation surface, 76 forms,
  form summaries, real TAL list, target ficha, dossier, and PostgreSQL
  round-trip were exercised in the authenticated in-app browser.
- Delivery gate: commit and GitHub fast-forward publication occur only after
  diff review, secret/operational-artifact scan, fetch, and SHA equality.

## Known boundaries preserved

- Canon gaps remain explicit and are not invented.
- No Marco 16 playable path was created.
- Epic manifestations remain Mestre-homologated.
- No stale active magic bucket or parallel editor remains.
