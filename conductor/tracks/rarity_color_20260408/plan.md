# Implementation Plan: Rarity Color Implementation

## Phase 1: Backend Integration
- [ ] Task: Update sighting service/controller to include `abaCode`.
    - [ ] Update SQL/Prisma query to join `Sighting` with `RarityCode`.
    - [ ] Add `abaCode` to Sighting model/interface returned by API.
    - [ ] Write integration test for the sighting API with rarity join.
    - [ ] Task: Conductor - User Manual Verification 'Backend Integration' (Protocol in workflow.md)

## Phase 2: Frontend Implementation
- [ ] Task: Write failing test for `RARITY_COLOR_MAP` mapping.
- [ ] Task: Write failing test for `getRarityColor` using `abaCode`.
- [ ] Task: Define `RARITY_COLOR_MAP` constant in `frontend/src/lib/`.
- [ ] Task: Update `Dashboard.tsx` to use `RARITY_COLOR_MAP`.
    - [ ] Update `getRarityColor` to lookup `sighting.abaCode`.
    - [ ] Remove old keyword-based color logic.
- [ ] Task: Verify UI updates.
    - [ ] Task: Conductor - User Manual Verification 'Frontend Implementation' (Protocol in workflow.md)
