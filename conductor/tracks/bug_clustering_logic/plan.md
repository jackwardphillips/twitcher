# Implementation Plan - Bug: Incident Clustering Logic

Improve incident clustering and implement merging.

## Phase 1: Research & Simulation

- [ ] Analyze current clustering performance in the database `[ ]`
- [ ] Create a test case that reproduces "split" incidents for the same bird `[ ]`

## Phase 2: Implementation

- [ ] Update `findMatchingIncident` to identify multiple matches `[ ]`
- [ ] Implement `mergeIncidents` utility `[ ]`
- [ ] Update `sighting-service.ts` to use the new merging logic when saving sightings `[ ]`
- [ ] Adjust default clustering radius to 25km `[ ]`

## Phase 3: Migration & Validation

- [ ] Update the existing `backend/src/scripts/recluster-sightings.ts` to use the new 25km radius and merging logic `[ ]`
- [ ] Verify no regressions in existing clustering tests `[ ]`
- [ ] Run the re-clustering script on `dev.db` and verify results in dashboard `[ ]`
