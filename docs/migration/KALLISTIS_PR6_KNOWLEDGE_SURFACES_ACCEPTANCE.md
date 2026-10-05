# KALLISTIS PR6 — Knowledge Surfaces Acceptance

MISSION=PR6_KNOWLEDGE_SURFACES_ACCEPTANCE
ENVIRONMENT=PRODUCTION_REAL
HOST=max
WORKTREE=/srv/kallistis
REPOSITORY=Tonyus-dev/kallistis
BRANCH=master
START_HEAD=a790c9749161297e8e90f6480713e3341135b877
IMPLEMENTATION_HEAD=a535fdf4c98997da57baab81fb21a331f775b2eb
FINAL_HEAD=a535fdf4c98997da57baab81fb21a331f775b2eb
ORIGIN_MASTER_HEAD=a535fdf4c98997da57baab81fb21a331f775b2eb
RUNTIME_HEAD=a535fdf4c98997da57baab81fb21a331f775b2eb
WORKTREE_STATUS=CLEAN

## Scope

Audited only `public/jogar/velarim.html` and `public/jogar/canon-explorer.html`.
Character Forge, auth, character APIs/migrations, Kaline, music, Câmara, Agenda,
Códice and other modules were not reopened.

## Production baseline

- `kallistis.service=active`
- `kaline.service=active`
- `KALINE_TOUCHED=NO`
- Both public URLs returned `HTTP 200`, `content-type: text/html`, `cache-control: no-cache`.
- The runtime required a remote `bun run build` because production serves `dist/client`.

## Provenance and integrity

Canon Explorer embeds `canon-data` with:

- `SOURCE=KALLISTIS — Manual do Mundo`
- `VERSION=Manuscrito Único FREEZE v1.3`
- `GENERATED=2026-08-30`
- `FINGERPRINT=5dfa3332e488`
- `ENTRIES=420`

The dataset audit found `420/420` entries, `420` unique IDs, zero invalid
categories, zero invalid related IDs and no external asset references.
Velarim is an embedded deterministic corpus of 68 words; no generator/source
file beyond the HTML was identified in this checkout, so the HTML is recorded
as the current implementation/source surface, not as an assumed editorial
authority.

## Runtime evidence

### Velarim

- Dictionary loaded with `68 de 68 palavras`.
- Known translation `Na thuvel namath.` returned element-by-element corpus readings.
- `BATATÃO MÁGICO` returned explicit absence; no Velarim form was invented.
- Construtor and Gramática panels opened and rendered.
- Local history rendered and retained the tested query.
- No console errors or unhandled functional errors were observed.

### Canon Explorer

- Explore view rendered `420 verbetes`.
- Velarim category rendered `22 verbetes`.
- `BATATÃO MÁGICO` returned `0 resultados` and `Nada encontrado no manuscrito`.
- No console errors or unhandled functional errors were observed.

### Reproduced and fixed defect

Before the fix, the fixed `Navegação JOGAR` menu occupied the same coordinates
as the Velarim surface tabs (`#tab-trd`), causing a real click on `Tradutor` to
navigate to `/chat`. The same overlapping navigation existed in Canon Explorer.
The narrow fix moves that shared navigation to `top:72px` and makes its wrapper
transparent to pointer events while preserving pointer events for its links.

Commits:

- `5a621614` — initial pointer-event hardening
- `a535fdf4` — final positional fix and published implementation

After rebuild/restart, a real click targeted `#tab-trd`, stayed on
`/jogar/velarim.html`, and rendered the Tradutor panel. Canon Explore navigation
also stayed on the Canon URL.

## Offline and responsive gates

Static audit found no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`,
external `src`/`href`, CDN or API dependency in either HTML. The pages use only
embedded data and localStorage for client state.

`OFFLINE_REAL_BROWSER_MODE=UNVERIFIED`: the available in-app browser session did
not expose a network-offline toggle. `MOBILE_REAL_BROWSER_MODE=UNVERIFIED`: the
available viewport override did not change the in-app browser viewport, so no
mobile pass is claimed. These are acceptance evidence gaps, not invented passes.

## Verdict

VELARIM_STATUS=PASS_WITH_GATES_UNVERIFIED
CANON_STATUS=PASS_WITH_GATES_UNVERIFIED
CANON_INVENTION=NO
VELARIM_UNKNOWN_PORTUGUESE_INVENTION=NO
VELARIM_UNKNOWN_FORM_INVENTION=NO
GLOBAL_REGRESSION=PASS
GLOBAL_REGRESSION_BASELINE=50 suites / 371 tests
GLOBAL_REGRESSION_FINAL=50 suites / 371 tests
PR6_STATUS=FAIL
PR6_FAILURE_CLASS=BLOCKED_HUMAN_CANON_REVIEW
PR6_NEXT_ACTION=Repeat network-offline and 390x844 browser runs with a surface that supports those controls; then freeze only if both gates pass.

PR6 is not declared `PASS` or `PASS_FROZEN` because the required real offline
and mobile gates could not be proven in the available browser surface.
