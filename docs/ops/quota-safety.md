# Quota Safety Findings

Ranked fixes from the current code scan.

## 1. Add production indexes for hot read paths

The schema has unique indexes for `IncomingEmail.messageId` and `RarityCode`, but several high-frequency filters and sorts lack explicit indexes:

- `Sighting.date` for `/api/sightings` ordering.
- `Sighting.incidentId` for incident relations.
- `Incident.status` and `Incident.lastSeen` for open/closed incident scans.
- `IncomingEmail.status`, `IncomingEmail.updatedAt`, and `IncomingEmail.date` for ingestion retry/status checks.
- `IngestionRun.startedAt` for latest-run lookup.

## 2. Bound ingestion retry scans

`IngestionService` loads all `new`, `failed`, and stale `processing` emails without `take`. If many records accumulate, one ingestion run can reprocess too much history.

Suggested fix: add `take`, `orderBy`, and an operational backlog metric.

## 3. Limit broad incident matching

`findMatchingIncident` loads all non-permanently-closed incidents for a species with included sightings. Rare but long-lived species can create large include payloads.

Suggested fix: filter candidates by recent `lastSeen`, use coordinate bounding conditions, or limit included sightings to those needed for distance matching.

## 4. Avoid all-row reference loads on every incident request

`getOpenIncidents` loads all `RarityCode` and all `SpeciesPhoto` rows. Rarity codes are bounded, but photos can grow.

Suggested fix: query photos only for species present in the current incident page.

## 5. Keep startup DB work disabled in production

Startup ingestion is gated by `RUN_STARTUP_INGESTION === "true"` and defaults off in docs. Keep `RUN_STARTUP_INGESTION=false` in Render production unless explicitly running a supervised one-off startup ingestion.

## 6. Watch background work from read endpoints

`GET /api/incidents` can trigger background photo fetches. This is useful but means a read request may cause outbound API traffic and DB writes.

Suggested fix: move stale photo refresh to a scheduled job if quota pressure appears.

## 7. Scripts with unbounded reads are acceptable only as manual diagnostics

Several investigation/backfill scripts use `findMany()` without `take`. Keep them out of cron and production startup paths unless bounded.
