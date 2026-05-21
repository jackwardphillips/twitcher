# Spec: Atomic Ingestion & Data Integrity

## Seed Findings (from review.md)
- `backend/src/lib/ingestion-service.ts:43-86`, `backend/src/lib/sighting-service.ts:31-71`, `backend/prisma/schema.prisma:72-80` - Failed ingestions persist partial writes and become unretryable.
- `backend/src/lib/sighting-service.ts:45-69`, `backend/src/lib/incident-service.ts:51-61`, `backend/src/lib/incident-service.ts:221-275` - Sighting dedupe and incident assignment are non-atomic.
- `backend/prisma/schema.prisma:18-39` - Missing database-level idempotency/uniqueness constraints on sightings.

## Problem
The current ingestion process is non-atomic. Emails are marked as "ingested" or "failed" in ways that allow transient errors to cause permanent data loss (failed ingestions become unretryable). Additionally, parallel ingestion runs can cause race conditions in sighting deduplication and incident count increments.

## Goals
- Ensure ingestion is an "all or nothing" operation.
- Prevent duplicate sightings and corrupted incident counts during concurrent runs.
- Make failed ingestions safely retryable.
- Make dedupe work before enrichment, not only after eBird metadata exists.

## Requirements
1. **Transactions:** Wrap the entire ingestion logic (Email -> Sightings -> Incident update) in a Prisma transaction.
2. **Reliability:** Only mark an `IncomingEmail` as processed *after* all related database records are successfully committed.
3. **Concurrency:**
   - Use atomic increments (SQL `UPDATE ... SET count = count + 1`) instead of read-modify-write in TypeScript.
   - Replace stale read-modify-write incident updates with transaction-safe writes that cannot lose `sightingCount` increments under parallel ingestion.
   - Prevent two overlapping ingestion runs from processing the same source email/sightings concurrently.
4. **Idempotency / Dedupe:**
   - Introduce an explicit linkage from `Sighting` to the source email record or an equivalent durable source identity.
   - Add a deterministic pre-enrichment dedupe key for parsed sightings. Do not rely on `subId`, because it is null until enrichment succeeds.
   - Enforce the dedupe key with a database uniqueness constraint so retries and parallel runs cannot insert the same sighting twice.
4. **Retry Logic:** Modify `IngestionService` to ignore `FAILED` emails in existence checks so they can be re-attempted.
