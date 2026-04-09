# Implementation Plan: Rarity Color Implementation

## Phase 1: Backend Integration
- [x] Task: Update sighting service/controller to include `abaCode`.
    - [x] Update SQL/Prisma query to join `Sighting` with `RarityCode`.
    - [x] Add `abaCode` to Sighting model/interface returned by API.
    - [x] Write integration test for the sighting API with rarity join.
    - [x] Task: Conductor - User Manual Verification 'Backend Integration' (Protocol in workflow.md)

## Phase 2: Frontend Implementation
- [x] Task: Write failing test for `RARITY_COLOR_MAP` mapping.
- [x] Task: Write failing test for `getRarityColor` using `abaCode`.
- [x] Task: Define `RARITY_COLOR_MAP` constant in `frontend/src/lib/`.
- [x] Task: Update `Dashboard.tsx` to use `RARITY_COLOR_MAP`.
    - [x] Update `getRarityColor` to lookup `sighting.abaCode`.
    - [x] Remove old keyword-based color logic.
- [x] Task: Verify UI updates.
    - [x] Task: Conductor - User Manual Verification 'Frontend Implementation' (Protocol in workflow.md)

## Phase: Review Fixes
- [x] Task: Apply review suggestions 4417abe
