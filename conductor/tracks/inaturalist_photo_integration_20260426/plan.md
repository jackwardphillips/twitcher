# Implementation Plan: T9 — iNaturalist Photo Integration

## Phase 1: Database Schema & Core Service [checkpoint: 366f696]

### Task 1.1: Update Database Schema
- [x] Task: Add `SpeciesPhoto` model to `backend/prisma/schema.prisma`. [d6af5f5]
  - [x] Fields: `speciesName` (String, @id), `photoUrl` (String?), `attribution` (String?), `fetchedAt` (DateTime).
- [x] Task: Generate Prisma client and run migration.
  - [x] Run `npx.cmd prisma migrate dev --name add_species_photo`.

- [x] Task: Implement `PhotoService` [6e8f572]
- [x] Task: Create `backend/src/lib/photo-service.ts`.
- [x] Task: Implement `fetchSpeciesPhoto(speciesName: string)` method.
  - [x] Use `fetch` to call iNaturalist API.
  - [x] Handle 30-day stale cache logic.
  - [x] Implement negative caching (store null for no results).
- [x] Task: Write unit tests for `PhotoService`.
  - [x] Create `backend/src/lib/photo-service.test.ts`.
  - [x] Mock iNaturalist API responses.
  - [x] Verify caching and stale re-fetch logic.

- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) [366f696]

## Phase 2: Backend Integration [checkpoint: 815c020]

### Task 2.1: Update Incident Service
- [x] Task: Update `getOpenIncidents` in `backend/src/lib/incident-service.ts` to include photo data from `SpeciesPhoto`. [5d47f9b]
- [x] Task: Write unit tests to verify incident-photo join.

### Task 2.2: Implement Lazy Fetch in API
- [x] Task: Update `/api/incidents` handler in `backend/src/index.ts`. [306d996]
  - [x] Identify incidents with missing or stale photos.
  - [x] Trigger `photoService.fetchSpeciesPhoto` in a fire-and-forget background call.
- [x] Task: Write integration tests for `/api/incidents`. [306d996]
  - [x] Verify that `/api/incidents` triggers `photoService.fetchSpeciesPhoto` for incidents missing cached photos.
  - [x] Verify that the immediate response for a missing photo is `null`.

- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) [815c020]

## Phase 3: Frontend Refinement

- [x] Task: Update Frontend Types & Component [4d67c55]
- [x] Task: Update `Incident` interface in `frontend/src/components/Dashboard.tsx` to include the `photo` field.
- [x] Task: Refine `frontend/src/components/PhotoSlot.tsx` to remove the `.photo-placeholder` silhouette.
- [x] Task: Update CSS in `frontend/src/App.css` for `.photo-placeholder` to remove `::after` silhouette.

### Task 3.2: Final Verification
- [~] Task: Manually verify that rare bird cards load photos after a short delay or page refresh.
- [ ] Task: Verify attribution overlay appears on hover.
- [ ] Task: Verify blank placeholder appears when no photo is found.

- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
