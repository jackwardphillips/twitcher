# Implementation Plan: Incident Model & Clustering

## Phase 1: Database & Model Setup
Update the Prisma schema and prepare the database for the new `Incident` model.

- [ ] Task: Update `schema.prisma` to include `Incident` model and `Sighting` relationship.
    - [ ] Create `IncidentStatus` enum (`OPEN`, `CLOSED`, `PERMANENTLY_CLOSED`).
    - [ ] Add `Incident` model with all specified fields.
    - [ ] Add `incidentId` optional foreign key to `Sighting` model.
- [ ] Task: Generate and apply Prisma migration.
    - [ ] Run `npx prisma migrate dev --name add_incident_model`.
- [ ] Task: Conductor - User Manual Verification 'Database Setup' (Protocol in workflow.md)

## Phase 2: Core Clustering Logic
Implement the core logic for cleaning scientific names and clustering sightings.

- [ ] Task: Implement `normalizeScientificName(raw: string): string` in a service.
    - [ ] Write tests for regex-based stripping of parentheses (e.g., `Lonchura malacca (Exotic: Naturalized)` -> `Lonchura malacca`).
    - [ ] Implement the normalization logic.
- [ ] Task: Implement `ClusteringService` for proximity-based matching.
    - [ ] Write tests for 10km proximity check against individual sighting coordinates.
    - [ ] Implement logic to find matching `OPEN` (first) or `CLOSED` (second) incidents for a new sighting.
    - [ ] **Ensure `PERMANENTLY_CLOSED` incidents are NEVER matched.**
    - [ ] **Handle non-enriched sightings (missing lat/lng) gracefully (e.g., create a new incident or skip clustering).**
- [ ] Task: Implement `IncidentService` for lifecycle management.
    - [ ] Write tests for OPEN/CLOSE/REOPEN logic.
    - [ ] Implement logic to update cached fields (`sightingCount`, `lastSeen`, `bounding box`, etc.) when a sighting is added.
    - [ ] Implement `closeInactiveIncidents()` check for the startup/ingestion script.
- [ ] Task: Conductor - User Manual Verification 'Core Logic' (Protocol in workflow.md)

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
