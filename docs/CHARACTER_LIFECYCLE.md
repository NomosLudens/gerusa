# Character Lifecycle

## Authority

Characters use the local KALLISTIS session and the PostgreSQL `kallistis`
database on the Max runtime. The browser copy is only a recovery/UI cache;
the server snapshot, status, owner and version are authoritative.

The Character Forge remains the existing HTML surface. The server bridge uses
same-origin requests and the existing local session. The assistant may explain
and suggest, but deterministic validation and human review remain server-side.

## States and invariants

The implemented state vocabulary is `draft`, `submitted`, `rejected`,
`approved` and `archived`. A player can save `draft`/`rejected`, submit a
validated snapshot, and recover it after reload. Approval stores a published
snapshot separately. Versions are monotonic and stale writes are rejected.

Domain events and immutable version snapshots are stored in PostgreSQL. Normal
archive is not hard delete. Progression is one active request per character,
must be enabled by the configured reviewer, advances only to the next Marco,
and applies only a closed server-validated change.

## Security boundary

Every character query is owner-scoped. Mutations require the local session and
same-origin request. The reviewer capability is deliberately explicit through
the server-only `KALLISTIS_CHARACTER_REVIEWER_USER_ID` configuration; no
client parameter, email, localStorage flag or implicit owner privilege grants
review authority.

## Canon and donor boundary

The rules catalogue is derived from the frozen KALLISTIS Forge/rules source.
VELMOOR was audited only as a workflow donor: draft/review separation,
progression authorization, history and quick-reference concepts are useful.
Supabase, D&D mechanics, email authority and direct AI mutation are not
authorities and are not used by the character persistence path.

## Current status

The persistent foundation, local API, assistant boundary, Forge bridge,
versioning hardening and migration ledger are deployed in `master`. Full
production lifecycle acceptance remains blocked until a human-configured
reviewer capability and authenticated browser smoke are supplied.
