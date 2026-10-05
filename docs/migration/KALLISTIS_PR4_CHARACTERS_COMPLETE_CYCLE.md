# KALLISTIS PR4 — Character Lifecycle Evidence

MISSION=PR4_CHARACTERS_COMPLETE_LIFECYCLE
SCOPE=PR4.3_CHARACTER_SURFACE_COMPLETION
ENVIRONMENT=PRODUCTION_REAL
HOST=max
WORKTREE=/srv/kallistis
REPOSITORY=Tonyus-dev/kallistis
BRANCH=master
END_HEAD=35809960878ba3bd1de31d6e6a96a96f282511f8
ORIGIN_MASTER_HEAD=35809960878ba3bd1de31d6e6a96a96f282511f8
WORKTREE_STATUS=CLEAN_BEFORE_REPORT_COMMIT

## Evidence

- Real Max preflight: `master`, `/srv/kallistis`, clean at
  `f330f6edff721e0b0284059684127ea52a00f8f9`; both `kallistis.service` and
  `kaline.service` were active. Kaline was not restarted or modified.
- Reviewer configuration was loaded by the real service process:
  `KALLISTIS_CHARACTER_REVIEWER_USER_ID=28f807ae-4d5e-48da-aa60-0f7fa4d6b77a`.
- PR4.3 synthetic `cmthbzui0t1jhv` completed authenticated creation, save,
  reload, assistant request/response persistence, submit, approve, publication
  reload, quickref, Character Context and event-ledger readback.
- Existing server capabilities were reused: assistant, Postgres repository,
  context builder, event/version ledger and progression workflow. No schema,
  migration, auth, reviewer capability, domain, core or Kaline changes were
  introduced.
- Reviewer enablement, owner start and valid progression apply completed:
  version `14 -> 15`, Marco `1 -> 2`, with canonical `Postura Inabalável`
  persisted. Authenticated reload preserved the server result.
- A second apply attempt returned `invalid_progression_transition`; no second
  version or progression-applied event was created.
- Cleanup was transacted exclusively for `cmthbzui0t1jhv`: characters=0,
  versions=0, events=0, progression=0, messages=0. Browser reload then showed
  `Personagens salvas · 0`; stale local cache did not resurrect the record.
- Forge HTML has exactly one in-body reference:
  `/jogar/character-forge-bridge.58eff1d46dea.js`. Public HTTP returned 200 for
  the asset; it contains `Nota da rejeição` and has zero `prompt(` calls.
  Browser DOM inspection confirmed the same fingerprinted reference.
- Cache policy: stable Forge HTML is `Cache-Control: no-cache`; the
  fingerprinted bridge is `public, max-age=31536000, immutable`.
- Final regression on Max: lint, typecheck, build and `git diff --check` passed;
  Vitest reported `49 passed` suites and `369 passed` tests.

## Capability audit

ASSISTANT_PERSISTENCE=EXISTS_AND_WORKS
QUICKREF=EXISTS_BUT_NOT_EXPOSED -> integrated and verified in Forge
CHARACTER_CONTEXT=EXISTS_AND_WORKS
PROGRESSION_ENABLE=EXISTS_AND_WORKS
PROGRESSION_APPLY=EXISTS_AND_WORKS
SERVER_AUTHORITY=POSTGRES_RUNTIME
LOCAL_CACHE_AUTHORITY=NO
DRAFT_CACHE_RESURRECTION=FIXED_AND_VERIFIED

## Gate status

CHARACTER_BACKEND=POSTGRES_LOCAL
CHARACTER_AUTH=LOCAL_SESSION
ACTIVE_CHARACTER_SUPABASE_DEPENDENCY=0
LINT=PASS
TYPECHECK=PASS
TESTS=PASS
BUILD=PASS
MIGRATION_LEDGER=PASS
PUBLIC_HTTP=PASS
KALINE_DATABASE_TOUCHED=NO
CHARACTER_CREATION=PASS
CHARACTER_PERSISTENCE=PASS
CHARACTER_REVIEW=PASS
CHARACTER_PUBLICATION=PASS
CHARACTER_PROGRESSION=PASS
CHARACTER_HISTORY=PASS
CHARACTER_CONTEXT=PASS
CHARACTER_FORGE=PASS
DOUBLE_APPLY_BLOCKED=PASS
TEST_DATA_LEFT_BEHIND=NO
PR4_STATUS=PASS
PR4_2_STATUS=PASS
PR4_3_STATUS=PASS
CHARACTER_CYCLE=PASS_FROZEN

## Delivery incident closed

INCIDENT=immutable reused bridge URL plus duplicate script reference
ROOT_CAUSE=cache-bust commit appended a second script instead of replacing old reference
FIX=single fingerprinted bridge reference inside body; progression targets use the server snapshot
OLD_ACTIVE_BRIDGE_REFERENCES=0
NEW_ACTIVE_BRIDGE_REFERENCES=1
PUBLIC_ASSET_VERIFIED=YES
BROWSER_ASSET_VERIFIED=YES
REJECTION_PROMPT_PRESENT=NO

## Final synchronization

IMPLEMENTATION_HEAD=35809960878ba3bd1de31d6e6a96a96f282511f8
PRODUCTION_HEAD=35809960878ba3bd1de31d6e6a96a96f282511f8
RUNTIME_HEAD=35809960878ba3bd1de31d6e6a96a96f282511f8
ORIGIN_MASTER_HEAD=35809960878ba3bd1de31d6e6a96a96f282511f8
REPORT_COMMIT_PENDING=YES
