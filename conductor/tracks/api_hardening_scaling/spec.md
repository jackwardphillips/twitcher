# Spec: API Hardening & Background Scaling

## Seed Findings (from review.md)
- `backend/src/index.ts:53-58` - `/api/ingest` has no authentication or rate limiting.
- `backend/src/index.ts:38-42`, `backend/src/lib/summarization-service.ts:175-205`, `backend/src/lib/photo-service.ts:12-96` - Background tasks have no in-flight locking or request coalescing.
- `backend/src/lib/sighting-service.ts:74-90`, `backend/src/lib/enrichment-service.ts:72-149`, `backend/src/lib/ebird-client.ts:37-69` - "Background" enrichment is synchronous, unbounded, and re-sweeps the last three days on every ingest.
- `backend/src/index.ts:84-126`, `backend/src/lib/incident-service.ts:335-426` - Read endpoints do full-table loads and expensive in-memory derivation.

## Problem
The `/api/ingest` endpoint is exposed to the public without authentication, making it a target for DoS and third-party API abuse. Furthermore, background tasks like LLM summarization, photo enrichment, and eBird enrichment are synchronous or duplicated, lack concurrency controls, and can reprocess the same backlog repeatedly, leading to redundant work and resource exhaustion.

## Goals
- Secure the ingestion API.
- Ensure only one ingestion run is active for a given process/work queue at a time.
- Prevent redundant background work using "request coalescing."
- Stop re-sweeping the same recent unenriched backlog on every ingest.
- Scale the read API with pagination.

## Requirements
1. **Security:** Implement a simple API key or token-based authentication for the `/api/ingest` route.
2. **Ingress Coordination:** Add single-flight protection so startup ingestion and manual/API ingestion cannot overlap and duplicate provider traffic or work queues.
3. **Task Locking:** Implement a locking mechanism (e.g., in-memory or Redis-like semaphore) to ensure only one LLM summarization or photo fetch is in-flight for a specific record at a time.
4. **Efficiency:** Transition from synchronous "background" work to a true async worker pattern that does not block the HTTP response.
5. **Enrichment Scope:** Refactor enrichment dispatch so an ingest only enqueues the newly created or explicitly targeted sightings. It must not blindly rescan the last three days of unenriched data on every run.
6. **Pagination:** Add `page` and `limit` parameters to `/api/sightings` and `/api/incidents` to prevent full-table loads.
