# Implementation Plan: T9 — iNaturalist Photo Integration

## Phase 1: Database Schema & Core Service

### Task 1.1: Update Database Schema
- [x] Task: Add `SpeciesPhoto` model to `backend/prisma/schema.prisma`. [d6af5f5]
  - [x] Fields: `speciesName` (String, @id), `photoUrl` (String?), `attribution` (String?), `fetchedAt` (DateTime).
- [x] Task: Generate Prisma client and run migration.
  - [x] Run `npx.cmd prisma migrate dev --name add_species_photo`.

### Task 1.2: Implement PhotoService
- [ ] Task: Create `backend/src/lib/photo-service.ts`.
- [ ] Task: Implement `fetchSpeciesPhoto(speciesName: string)` method.
  - [ ] Use `fetch` to call iNaturalist API.
  - [ ] Handle 30-day stale cache logic.
  - [ ] Implement negative caching (store null for no results).
- [ ] Task: Write unit tests for `PhotoService`.
  - [ ] Create `backend/src/lib/photo-service.test.ts`.
  - [ ] Mock iNaturalist API responses.
  - [ ] Verify caching and stale re-fetch logic.

- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Backend Integration

### Task 2.1: Update Incident Service
- [ ] Task: Update `getOpenIncidents` in `backend/src/lib/incident-service.ts` to include photo data from `SpeciesPhoto`.
- [ ] Task: Write unit tests to verify incident-photo join.

### Task 2.2: Implement Lazy Fetch in API
- [ ] Task: Update `/api/incidents` handler in `backend/src/index.ts`.
  - [ ] Identify incidents with missing or stale photos.
  - [ ] Trigger `photoService.fetchSpeciesPhoto` in a fire-and-forget background call.
- [ ] Task: Write integration tests for `/api/incidents`.
  - [ ] Verify that `/api/incidents` triggers `photoService.fetchSpeciesPhoto` for incidents missing cached photos.
  - [ ] Verify that the immediate response for a missing photo is `null`.

- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Frontend Refinement

### Task 3.1: Update Frontend Types & Component
- [ ] Task: Update `Incident` interface in `frontend/src/components/Dashboard.tsx` to include the `photo` field.
- [ ] Task: Refine `frontend/src/components/PhotoSlot.tsx` to remove the `.photo-placeholder` silhouette.
- [ ] Task: Update CSS in `frontend/src/App.css` for `.photo-placeholder` to remove `::after` silhouette.

### Task 3.2: Final Verification
- [ ] Task: Manually verify that rare bird cards load photos after a short delay or page refresh.
- [ ] Task: Verify attribution overlay appears on hover.
- [ ] Task: Verify blank placeholder appears when no photo is found.

- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
