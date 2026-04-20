# Plan: Incident Card Redesign

Redesign the incident card to a horizontal layout with photo slot and sighting histogram.

## Phase 1: Backend Data Enrichment [checkpoint: e8de754]
Add `dailyCounts` to the `/api/incidents` response.

- [x] **Task: Update Incident type and service to include daily counts** 5747dc4
    - [ ] Create branch `conductor/incident_card_redesign_20260419`
    - [ ] **Red**: Update `backend/src/lib/incident-service.test.ts` to expect `dailyCounts` in `getOpenIncidents` return value.
    - [ ] **Green**: Modify `getOpenIncidents` in `backend/src/lib/incident-service.ts` to calculate and return `dailyCounts` (past 21 days).
    - [ ] Commit: `feat(backend): add dailyCounts to getOpenIncidents` xxxxxx

- [x] **Checkpoint: Backend provides daily sighting counts** e8de754

## Phase 2: Frontend Infrastructure & Types
Update frontend types and prepare CSS.

- [x] **Task: Update frontend types and mock data** 0b9af29
    - [ ] **Red**: Update `frontend/src/components/Dashboard.test.tsx` (or new test) to expect `dailyCounts` and `photo` field on `Incident` type.
    - [ ] **Green**: Update `Incident` interface in `frontend/src/components/Dashboard.tsx`.
    - [ ] Commit: `feat(frontend): update Incident interface for redesign` xxxxxx

- [x] **Task: Setup CSS for horizontal layout** e4aa53a
    - [ ] **Red**: Add a test in `frontend/src/components/Dashboard.test.tsx` that checks for the presence of the new CSS classes (e.g., `.sighting-card-horizontal`, `.photo-slot`) in the rendered output. This test should fail as the classes are not yet used or defined.
    - [ ] **Green**: Add new CSS classes to `frontend/src/App.css` for the horizontal grid and photo slot.
    - [ ] Commit: `feat(frontend): add CSS for horizontal incident card layout` xxxxxx

## Phase 3: Component Implementation
Implement the new card layout and histogram.

- [x] **Task: Implement PhotoSlot component**
    - [ ] **Red**: Create `frontend/src/components/PhotoSlot.test.tsx` to verify placeholder rendering and attribution hover.
    - [ ] **Green**: Create `frontend/src/components/PhotoSlot.tsx`.
    - [ ] Commit: `feat(frontend): implement PhotoSlot component` xxxxxx

- [x] **Task: Implement SightingHistogram component**
    - [ ] **Red**: Create `frontend/src/components/SightingHistogram.test.tsx`. **CRITICAL**: Tests must explicitly assert that tooltip content (date and count) is present in the DOM when a bar is hovered, not just that the component renders.
    - [ ] **Green**: Create `frontend/src/components/SightingHistogram.tsx`.
    - [ ] Commit: `feat(frontend): implement SightingHistogram component` xxxxxx

- [ ] **Task: Refactor Dashboard to use new horizontal card**
    - [ ] **Red**: Update `frontend/src/components/Dashboard.test.tsx` to verify new structure (grid, presence of photo slot and histogram).
    - [ ] **Green**: Update `Dashboard.tsx` render logic to use the new horizontal layout, `PhotoSlot`, and `SightingHistogram`.
    - [ ] Commit: `feat(frontend): switch to horizontal incident card layout` xxxxxx

## Phase 4: Validation & Cleanup
Ensure everything works as expected and meets aesthetic standards.

- [ ] **Task: Final visual verification and accessibility check**
    - [ ] Verify hover states, rarity colors, and typography.
    - [ ] Ensure mobile responsiveness (if applicable, or at least graceful degradation).
    - [ ] Commit: `chore(frontend): final polish for incident card redesign` xxxxxx

- [ ] **Checkpoint: Track Complete**
    - [ ] Run full test suite.
    - [ ] Update `conductor/ui-components.md` with the new card contract.
    - [ ] Update `conductor/dashboard-state.md` if necessary.
