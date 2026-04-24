# Specification - Bug: Incident Clustering Logic (Updated)

The current incident clustering logic uses a fixed 10km radius from any existing
sighting in an incident. This fragmented the April 22, 2026 Cook's Petrel sightings
from the *Eurodam* cruise into 8 separate incidents because the ship moved faster
than the 10km/sighting threshold.

## Requirements

- **Base Radius**: Update the default clustering radius to **25km**.
- **Velocity-Aware Radius**: If a new sighting's date is within **24 hours** of an
  incident's `lastSeen`, the allowed matching radius is:
  `25km + (timeDifferenceInHours * 50km)`, capped at **200km**.
  If the time difference is ≥ 24 hours, use the base radius of 25km only.
- **Simultaneous Safety**: Two birds seen 50km apart at the exact same time remain
  separate incidents (radius is 25km, below the 50km gap).
- **Incident Merging**: When a new sighting matches *multiple* existing incidents,
  all matching incidents must be merged into one.
- **Golden Test Case**: The April 22, 2026 Cook's Petrel sequence must cluster into
  a single incident.

## Proposed Changes

### Backend

- **incident-service.ts**:
  - Update `findMatchingIncident` to:
    1. Accept the `date` of the new sighting as a parameter.
    2. Return *all* matching incidents (`Incident[]`) instead of a single match.
    3. Compute the matching radius using `lastSeen`: if the new sighting's date is
       within 24 hours of `lastSeen`, use `min(25 + (timeDiffHours * 50), 200)`;
       otherwise use 25km flat.
  - Implement `mergeIncidents(prisma, incidentIds)` to consolidate multiple
    matching incidents into one, reassigning all child sightings to the surviving
    incident and recomputing bounding box and metadata.
  - Update `addSightingToIncident` to call `mergeIncidents` when multiple matches
    are returned.

- **sighting-service.ts**:
  - Pass `sighting.date` to `findMatchingIncident`.

- **recluster-sightings.ts**:
  - Update all call sites of `findMatchingIncident` to pass the sighting date and
    handle the new `Incident[]` return type.

## Verification Plan

- **Automated Tests** (`incident-service.test.ts`):
  - **Bridge Merge**: A sighting within radius of two separate incidents merges them
    into one.
  - **Temporal Expansion**: A sighting 50km away but within 2 hours of `lastSeen`
    clusters correctly.
  - **Temporal Boundary**: A sighting 50km away but 25 hours after `lastSeen` does
    *not* cluster.

- **Manual Verification**:
  - Query the current `dev.db` for the Cook's Petrel sightings from April 22, 2026
    to retrieve the exact coordinates and timestamps already in the database.
  - Run `recluster-sightings.ts` against `dev.db`.
  - Verify that the 8 Cook's Petrel incidents from April 22 consolidate into 1.