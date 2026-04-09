# Spec Template

This is the canonical template for all new track specifications. Every section is required. Gemini must not skip or abbreviate any section.

Before filling out this template for a new track, Gemini must:
1. Read `conductor/ui-components.md` and `conductor/dashboard-state.md`
2. Read the relevant existing source files in `frontend/src/` and `backend/src/` to understand current state
3. Fill in the Integration Touchpoints section based on actual findings, not assumptions

---

```markdown
# Specification — [Track Name]

## Overview
[2–3 sentences describing what this track does and why it exists now.]

## Goals
- [Goal 1]
- [Goal 2]

## Functional Requirements
- [Requirement 1]
- [Requirement 2]

## Non-Functional Requirements
- [Performance, security, idempotency, etc.]

## Acceptance Criteria
- [ ] [Criterion 1 — backend]
- [ ] [Criterion 2 — frontend: must include at least one criterion that requires verifying
       the result is visibly correct in the running app, not just returned by the API]

## Integration Touchpoints

### Components this track must update
[List every component from ui-components.md that this track changes.
For each one, state: what field, what the current status is, and what it will be after this track.]

| Component | Field | Current Status | After This Track |
|---|---|---|---|
| SightingCard | Rarity color badge | hardcoded | live — wired to AbaSpecies.code |
| SightingMap | Pin color by rarity | hardcoded | live — same ABA code lookup |

### New data this track produces
[List every new DB column, API field, or service output this track creates.
For each one, state whether it will be wired to the UI in this track or deferred.]

| Data | Where stored | Wired to UI in this track? | If deferred, which track |
|---|---|---|---|
| AbaSpecies.code | SQLite via Prisma | Yes — card badge + map pin | — |

### Components this track does NOT touch (but could in future)
[List any components from ui-components.md that your new data could improve
but that you are explicitly deferring. This makes the deferral a conscious choice,
not an oversight.]

- Example: SightingDetail drill-down — not built yet, T10 dependency

## Out of Scope
- [Item 1]
- [Item 2]

## Tech Stack Notes
[Any additions or changes to tech-stack.md required before this track runs.
If none, write "None."]
```

---

## Example: T1 — ABA Species Code CSV Integration

```markdown
# Specification — T1: ABA Species Code CSV Integration

## Overview
Ingest the ABA Checklist CSV into SQLite and expose a rarity code lookup service.
This track also wires the ABA rarity codes that are currently sitting in the database
(from the prior aba_checklist_integration track) to the visible UI — the card rarity
badge and the map pin color — which were not updated when that track shipped.

## Goals
- Confirm ABA code data is correctly seeded and queryable
- Wire rarity codes to the existing card color system and map pin colors
- Support fuzzy species name matching for eBird/ABA name divergence
- Be idempotent so it can be re-run on annual taxonomy updates

## Functional Requirements
- Parse `references/ABA_Checklist-8.19.csv` into the `AbaSpecies` table (or equivalent)
- Store: common name, scientific name, ABA code (1–6), 4-letter alpha code
- Expose a lookup function: given a species name (common or scientific, fuzzy), return the ABA code
- Wire the returned code to the card rarity badge color system
- Wire the returned code to the map pin color system
- Handle cases where no ABA match is found gracefully (fall back to a neutral style)

## Non-Functional Requirements
- Idempotent: re-running the seed script must not create duplicate records
- Fuzzy matching must handle common eBird/ABA name divergences (e.g. "Common Gallinule" vs "Common Moorhen")
- Lookup must be fast enough not to noticeably delay card rendering

## Acceptance Criteria
- [ ] CSV is parsed and all species with codes 1–6 are in the database
- [ ] Lookup function returns correct ABA code for a given species name
- [ ] Fuzzy matching resolves at least the known eBird/ABA divergences listed in the spec
- [ ] Rarity badge on SightingCard reflects the live ABA code from the database (verify in running app)
- [ ] Map pin color reflects the live ABA code from the database (verify in running app)
- [ ] Cards with no ABA match display a neutral fallback style, not an error
- [ ] Seed script is idempotent — running it twice does not duplicate rows

## Integration Touchpoints

### Components this track must update

| Component | Field | Current Status | After This Track |
|---|---|---|---|
| SightingCard | Rarity color badge | hardcoded | live — driven by AbaSpecies.code |
| SightingCard | Rarity code label | unknown — verify | live if present, or add if missing |
| SightingMap | Pin color by rarity code | hardcoded | live — same ABA code lookup |

### New data this track produces

| Data | Where stored | Wired to UI in this track? | If deferred, which track |
|---|---|---|---|
| AbaSpecies.code (1–6) | SQLite via Prisma | Yes | — |
| AbaSpecies.alphaCode (4-letter) | SQLite via Prisma | No — informational only | T10 (detail view) |

### Components this track does NOT touch (but could in future)
- SightingDetail drill-down: not yet built (T10). Alpha code could surface here.
- T8 distance-aware filter: depends on this track's ABA code lookup — no UI yet.
- T11 map pin silhouettes: depends on T4 incident model, not this track.
- T12 push notifications: code 4+ threshold logic will use ABA codes from this track.

## Out of Scope
- Filtering logic based on rarity codes (T8)
- Automated or scheduled re-fetching of the ABA CSV
- UI for managing or browsing the species table

## Tech Stack Notes
None. ABA CSV is already committed to the repo at `references/ABA_Checklist-8.19.csv`.
```