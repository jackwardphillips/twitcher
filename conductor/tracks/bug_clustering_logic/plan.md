# Implementation Plan - Bug: Incident Clustering Logic

## Phase 1: Research & Reproduction

- [x] Query dev.db for all Cook's Petrel sightings from April 22, 2026 to extract
      their coordinates and timestamps. Log the inter-sighting distances and time
      gaps to confirm the fragmentation pattern. (9337961)
- [x] Write a failing reproduction test in `incident-service.test.ts` using the
      extracted coordinates, confirming that the current logic produces 8 incidents. (9337961)

## Phase 2: Core Logic Implementation

- [x] Update `findMatchingIncident` signature to accept `date: Date` and return
      `Incident[]`. (5ce5153)
- [x] Implement velocity-aware radius: if new sighting date is within 24h of
      `lastSeen`, use `min(25 + (timeDiffHours * 50), 200)`; otherwise use 25km
      flat. (5ce5153)
- [x] Implement `mergeIncidents(prisma, incidentIds: string[])`: reassign all child
      sightings to the lowest-`createdAt` incident, recompute bounding box
      (`minLat`, `maxLat`, `minLng`, `maxLng`), update `lastSeen`, `firstSeen`,
      and delete the merged-away incidents. (5ce5153)
- [x] Update `addSightingToIncident` to call `mergeIncidents` when
      `findMatchingIncident` returns more than one result. (5ce5153)
- [x] Update `sighting-service.ts` to pass `sighting.date` to `findMatchingIncident`. (5ce5153)

## Phase 3: Migration & Validation

- [x] Update `recluster-sightings.ts`: update all call sites to pass sighting date
      and handle `Incident[]` return type (loop → merge if multiple, add to single
      if one, create new if zero). (5ce5153)
- [x] Run `recluster-sightings.ts` against `dev.db`. (5ce5153)
- [x] Verify Cook's Petrel incidents consolidate to 1. (5ce5153)
- [x] Give a comprehensive overview of what other incidents merged and a review of why they did. (5ce5153)
- [x] Run full test suite and verify coverage. (5ce5153)