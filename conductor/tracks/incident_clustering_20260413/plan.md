# Implementation Plan: Incident Model & Clustering

## Phase 1: Database & Model Setup [checkpoint: 791cce3]
Update the Prisma schema and prepare the database for the new `Incident` model.

- [x] Task: Update `schema.prisma` to include `Incident` model and `Sighting` relationship. b8d79f3
    - [x] Create `IncidentStatus` enum (`OPEN`, `CLOSED`, `PERMANENTLY_CLOSED`).
    - [x] Add `Incident` model with all specified fields.
    - [x] Add `incidentId` optional foreign key to `Sighting` model.
- [x] Task: Generate and apply Prisma migration. 2e4d19a
    - [x] Run `npx prisma migrate dev --name add_incident_model`.
- [x] Task: Conductor - User Manual Verification 'Database Setup' (Protocol in workflow.md)

## Phase 2: Core Clustering Logic
Implement the core logic for cleaning scientific names and clustering sightings.

- [x] Task: Implement `normalizeScientificName(raw: string): string` in a service. 6747f41
    - [x] Write tests for regex-based stripping of parentheses (e.g., `Lonchura malacca (Exotic: Naturalized)` -> `Lonchura malacca`).
    - [x] Implement the normalization logic.
- [x] Task: Implement `ClusteringService` for proximity-based matching. 03e016f
    - [x] Write tests for 10km proximity check against individual sighting coordinates.
    - [x] Implement logic to find matching `OPEN` (first) or `CLOSED` (second) incidents for a new sighting.
    - [x] **Ensure `PERMANENTLY_CLOSED` incidents are NEVER matched.**
    - [x] **Handle non-enriched sightings (missing lat/lng) gracefully (e.g., create a new incident or skip clustering).**
- [x] Task: Implement `IncidentService` for lifecycle management. 4fbb67a
    - [x] Write tests for OPEN/CLOSE/REOPEN logic.
    - [x] Implement logic to update cached fields (`sightingCount`, `lastSeen`, `bounding box`, etc.) when a sighting is added.
    - [x] Implement `closeInactiveIncidents()` check for the startup/ingestion script.
- [x] Task: Conductor - User Manual Verification 'Core Logic' (Protocol in workflow.md)

## Phase 3: Ingestion Integration
Integrate the clustering logic into the existing email ingestion pipeline.

- [ ] Task: Update `IngestionService` to use `ClusteringService`.
    - [ ] Write integration tests for sighting ingestion with clustering.
    - [ ] Update the `createSighting` flow to link to or create an `Incident`.
- [ ] Task: Add incident status check to the startup script.
    - [ ] Ensure `closeInactiveIncidents()` is called during startup.
- [ ] Task: Conductor - User Manual Verification 'Ingestion Integration' (Protocol in workflow.md)

## Phase 4: Historical Data Migration
Create and run the script to retroactively cluster existing sightings.

- [ ] Task: Create `scripts/migrate-incidents.ts`.
    - [ ] Fetch all existing sightings ordered by `obsDt` (oldest first).
    - [ ] Iterate through sightings and apply the clustering logic.
    - [ ] Write tests for the migration script using a test database.
- [ ] Task: Run migration script on local dev database.
    - [ ] Verify that sightings are correctly clustered into incidents.
- [ ] Task: Conductor - User Manual Verification 'Migration' (Protocol in workflow.md)
