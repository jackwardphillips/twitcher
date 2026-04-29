# Plan: Atomic Ingestion & Data Integrity

## Phase 1: Database Constraints
- [ ] Add source-email linkage and a deterministic dedupe key to `Sighting`
- [ ] Add uniqueness constraints to enforce pre-enrichment idempotency in `schema.prisma`
- [ ] Migrate `incident.sightingCount` updates to use atomic `increment` operations

## Phase 2: Transactional Ingestion
- [ ] Refactor `IngestionService` to use `$transaction`
- [ ] Re-order `IncomingEmail` status updates to the end of the batch
- [ ] Implement robust error handling that preserves the ability to retry failed emails
- [ ] Add overlap protection so startup ingestion and manual/API ingestion cannot process the same work in parallel

## Phase 3: Verification
- [ ] Create a reproduction test for the "partial write" scenario
- [ ] Create a stress test for parallel ingestion
- [ ] Add a regression test proving duplicate parsed sightings cannot be inserted before enrichment
