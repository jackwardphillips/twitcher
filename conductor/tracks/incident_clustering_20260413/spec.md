# Specification: Incident Model & Clustering

## Overview
Introduce an `Incident` model to group individual `Sighting` records. This provides a higher-level view of bird sightings, clustering multiple reports of the same species in the same area into a single "incident."

## Functional Requirements

### 1. Incident Model & Relationships
- **Prisma Schema Update:**
    - Create a new `Incident` model.
    - Add a foreign key to the `Sighting` model (`incidentId`) to link sightings to an incident.
    - **Fields on `Incident`:**
        - `id`: Unique identifier (UUID).
        - `scientificName`: Normalized/cleaned scientific name (e.g., `Lonchura malacca`).
        - `commonName`: Normalized/cleaned common name.
        - `status`: Enum (`OPEN`, `CLOSED`, `PERMANENTLY_CLOSED`).
        - `minLat`, `maxLat`, `minLng`, `maxLng`: Bounding box of all sightings.
        - `firstSeen`: Date of the earliest sighting.
        - `lastSeen`: Date of the most recent sighting. (Cached field - must be updated whenever a sighting is added).
        - `closedAt`: Timestamp of the most recent time the incident was closed.
        - `sightingCount`: Total number of sightings in the incident. (Cached field - must be updated whenever a sighting is added).
        - `primaryCounty`: The county with the most sightings.
        - `primaryState`: The state with the most sightings.
        - `primaryCountry`: The country with the most sightings.
        - `statesCovered`: JSON array of unique state/province names covered.
        - `createdAt`: Timestamp of incident creation.
        - `updatedAt`: Timestamp of the last update.

### 2. Species Matching & Normalization
- **Rule:** Strip parenthetical qualifiers from scientific names (e.g., `Lonchura malacca (Exotic: Naturalized)` becomes `Lonchura malacca`).
- **Implementation:** Use regex to remove any content within parentheses and trim whitespace.
- **Goal:** Provide a canonical key for matching sightings to incidents. The `Incident` record stores the cleaned scientific name; the `Sighting` record retains the raw value for auditability.

### 3. Clustering Logic
- **Incoming Sighting:**
    - Match to an existing `OPEN` or `CLOSED` incident if:
        1. **Same cleaned scientific name.**
        2. **Within 10km of ANY existing sighting in the incident.**
- **Incident Lifecycle:**
    - **OPEN:** When a new matching sighting arrives.
    - **CLOSED:** If no new matching sighting arrives within **5 days** of the last sighting. (Update `closedAt` on close).
    - **REOPEN:** If a new matching sighting arrives within **4 months** of the **most recent** `closedAt` date.
    - **PERMANENTLY_CLOSED:** After **4 months** with no new sightings since the last `closedAt`, the incident cannot be reopened.
- **Cleanup Frequency:** Incident status checks (closing inactive ones) should be part of the startup/ingestion script, similar to email ingestion.

### 4. Migration Strategy
- **One-time Migration Script:**
    - **CRITICAL:** Process all existing `Sighting` records in **chronological order (oldest first)** to ensure correct clustering.
    - Retroactively cluster sightings into `Incident` models using the 10km clustering logic.
    - Update `Sighting.incidentId` for all existing records.
    - No data wipe.

## Acceptance Criteria
- [ ] Prisma schema is updated with `Incident` model and `Sighting` relationship.
- [ ] `Incident` model correctly stores normalized species names and summary data.
- [ ] New sightings are automatically clustered into existing or new incidents.
- [ ] Incident status (OPEN/CLOSED/PERMANENTLY_CLOSED) is correctly managed based on sighting activity.
- [ ] Reopening logic correctly uses the most recent `closedAt` timestamp.
- [ ] Migration script successfully clusters historical data in chronological order.
- [ ] Cached fields (`sightingCount`, `lastSeen`, `statesCovered`, etc.) are consistently updated.

## Out of Scope
- UI/Dashboard changes (focused on backend/data layer for this track).
- Complex geospatial queries (beyond the 10km proximity check).
