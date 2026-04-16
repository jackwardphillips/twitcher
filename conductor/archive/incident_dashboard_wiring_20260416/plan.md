# Implementation Plan - Incident Dashboard Wiring

## Phase 1: Backend API [checkpoint: d88171d]
Goal: Implement the `GET /api/incidents` endpoint with all necessary data for the dashboard.

- [x] Task: Implement `getOpenIncidents` in `backend/src/lib/incident-service.ts` d0fdc36
    - [x] Add logic to fetch only `OPEN` incidents.
    - [x] Join with `RarityCode` to get `abaCode` based on normalized `scientificName`.
    - [x] Calculate `centroidLat` and `centroidLng` as averages of min/max.
    - [x] Formulate `locationName` as `{primaryState}, {primaryCountry}`.
    - [x] Include `latestMapUrl` and `latestChecklistUrl` from the most recent sighting.
    - [x] Calculate `activeDays` (difference between `firstSeen` and `lastSeen` in days, inclusive).
- [x] Task: Create unit tests for `getOpenIncidents` in `backend/src/lib/incident-service.test.ts` d0fdc36
- [x] Task: Register `GET /api/incidents` in `backend/src/index.ts` 3738019
- [x] Task: Create integration test for `/api/incidents` in `backend/src/index.test.ts` 3738019
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend API' (Protocol in workflow.md) d88171d

## Phase 2: Frontend Data Source [checkpoint: f2a7579]
Goal: Switch the dashboard to fetch and use incident data.

- [x] Task: Update `Incident` interface in `frontend/src/components/Dashboard.tsx` f2a7579
    - [x] Define the shape matching the backend response.
- [x] Task: Update `fetch` logic in `Dashboard.tsx` f2a7579
    - [x] Change endpoint from `/api/sightings` to `/api/incidents`.
    - [x] Update state to hold `Incident` objects.
- [x] Task: Update `Dashboard` render logic to map over incidents f2a7579
    - [x] Update the card component to display incident-specific fields (sightingCount, activeDays, etc.).
    - [x] Change streak badge text to "Active X days".
    - [x] Omit observer and details fields as per spec.
    - [x] Ensure `latestMapUrl` and `latestChecklistUrl` are used for links.
- [x] Task: Update `SightingMap.tsx` to handle incidents f2a7579
    - [x] Accept `Incident` array instead of `Sighting` array.
    - [x] Use `centroidLat` and `centroidLng` for markers.
    - [x] Implement fallback logic for missing centroids (county/state center).
- [x] Task: Update `Dashboard.test.tsx` to reflect incident-based data f2a7579
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend Data Source' (Protocol in workflow.md) f2a7579

## Phase 3: Filter & Proximity Verification
Goal: Ensure rarity and "Near Me" filters work correctly with the new data structure.

- [x] Task: Verify Rarity Filter in `Dashboard.tsx`
    - [x] Ensure `selectedRarities` filters incidents by `rarityCode`.
- [x] Task: Verify "Near Me" Filter in `Dashboard.tsx`
    - [x] Ensure `filterByProximity` uses incident centroids.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Filter & Proximity Verification' (Protocol in workflow.md) f2a7579
