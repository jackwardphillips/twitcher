# Implementation Plan - Incident Dashboard Wiring

## Phase 1: Backend API
Goal: Implement the `GET /api/incidents` endpoint with all necessary data for the dashboard.

- [x] Task: Implement `getOpenIncidents` in `backend/src/lib/incident-service.ts` d0fdc36
    - [x] Add logic to fetch only `OPEN` incidents.
    - [x] Join with `RarityCode` to get `abaCode` based on normalized `scientificName`.
    - [x] Calculate `centroidLat` and `centroidLng` as averages of min/max.
    - [x] Formulate `locationName` as `{primaryCounty}, {primaryState}`.
    - [x] Include `latestMapUrl` and `latestChecklistUrl` from the most recent sighting.
    - [x] Calculate `activeDays` (difference between `firstSeen` and `lastSeen` in days, inclusive).
- [x] Task: Create unit tests for `getOpenIncidents` in `backend/src/lib/incident-service.test.ts` d0fdc36
- [ ] Task: Register `GET /api/incidents` in `backend/src/index.ts`
- [ ] Task: Create integration test for `/api/incidents` in `backend/src/index.test.ts`
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend API' (Protocol in workflow.md)

## Phase 2: Frontend Data Source
Goal: Switch the dashboard to fetch and use incident data.

- [ ] Task: Update `Incident` interface in `frontend/src/components/Dashboard.tsx`
    - [ ] Define the shape matching the backend response.
- [ ] Task: Update `fetch` logic in `Dashboard.tsx`
    - [ ] Change endpoint from `/api/sightings` to `/api/incidents`.
    - [ ] Update state to hold `Incident` objects.
- [ ] Task: Update `Dashboard` render logic to map over incidents
    - [ ] Update the card component to display incident-specific fields (sightingCount, activeDays, etc.).
    - [ ] Change streak badge text to "Active X days".
    - [ ] Omit observer and details fields as per spec.
    - [ ] Ensure `latestMapUrl` and `latestChecklistUrl` are used for links.
- [ ] Task: Update `SightingMap.tsx` to handle incidents
    - [ ] Accept `Incident` array instead of `Sighting` array.
    - [ ] Use `centroidLat` and `centroidLng` for markers.
    - [ ] Implement fallback logic for missing centroids (county/state center).
- [ ] Task: Update `Dashboard.test.tsx` to reflect incident-based data
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Data Source' (Protocol in workflow.md)

## Phase 3: Filter & Proximity Verification
Goal: Ensure rarity and "Near Me" filters work correctly with the new data structure.

- [ ] Task: Verify Rarity Filter in `Dashboard.tsx`
    - [ ] Ensure `selectedRarities` filters incidents by `rarityCode`.
- [ ] Task: Verify "Near Me" Filter in `Dashboard.tsx`
    - [ ] Ensure `filterByProximity` uses incident centroids.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Filter & Proximity Verification' (Protocol in workflow.md)
