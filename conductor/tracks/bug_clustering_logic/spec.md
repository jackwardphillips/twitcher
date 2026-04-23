# Specification - Bug: Incident Clustering Logic

The current incident clustering logic uses a fixed 10km radius from any existing sighting in an incident. This can lead to fragmented incidents when a bird moves gradually or when two sightings are slightly further apart than the threshold, even if they clearly represent the same individual.

## Requirements

- **Increased Radius**: Update the default clustering radius to **exactly 25km**. This provides a safer balance than 50km while remaining more flexible than the original 10km.
- **Incident Merging**: When a new sighting matches *multiple* existing incidents, those incidents should be merged into one.
- **Improved Matching**: Consider matching against the incident centroid or the bounding box in addition to individual sightings.

## Proposed Changes

### Backend

- **incident-service.ts**:
    - Update `findMatchingIncident` to return *all* matching incidents instead of just the first one.
    - Implement a `mergeIncidents` function that combines two or more incidents (re-parenting sightings, updating bounds, etc.).
    - Update `addSightingToIncident` to handle cases where it might trigger a merge.
    - Change the default search radius from 10km to **25km**.
- **recluster-sightings.ts**:
    - Update the existing script in `backend/src/scripts/recluster-sightings.ts` to use the new 25km radius and merging logic to consolidate historical data.

## Verification Plan

- **Automated Tests**:
    - Add a test in `incident-service.test.ts` where a sighting bridge two previously separate incidents, ensuring they merge.
    - Test the impact of a larger radius on existing test data.
- **Manual Verification**:
    - Use the `recluster-sightings.ts` script (if available or create one) to re-process historical sightings and verify that fragmented incidents are now consolidated.
