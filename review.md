# CRITICAL

- `backend/src/lib/ingestion-service.ts:43-86`, `backend/src/lib/sighting-service.ts:31-71`, `backend/prisma/schema.prisma:72-80` - Failed ingestions persist partial writes and become permanently unretryable.
  The code inserts `IncomingEmail` before parsing and saving succeeds, then marks the email `failed` on any later exception. Because future runs only check whether `messageId` exists, one transient parse, enrichment, or DB error can leave partial sightings/incidents in the database and permanently skip the source email on every retry.

# HIGH

- `backend/src/index.ts:53-58` - `/api/ingest` has no authentication or rate limiting.
  Any caller who can reach the server can force IMAP logins, mailbox scans, eBird traffic, and summary generation. That is a straightforward denial-of-service and third-party API abuse surface.

- `backend/src/index.ts:53-58`, `backend/src/lib/ingestion-service.ts:107-115` - The API reports ingestion success even when IMAP failed.
  `IngestionService.ingest()` converts mailbox failures into a resolved `{ status: 'imap_error' }`, but the route still returns `200` with `"Ingestion complete"`. Monitoring, cron wrappers, and operators will treat a hard failure as a healthy run.

- `backend/src/lib/sighting-service.ts:45-69`, `backend/src/lib/incident-service.ts:51-61`, `backend/src/lib/incident-service.ts:97-134`, `backend/src/lib/incident-service.ts:221-275`, `backend/prisma/schema.prisma:18-39`, `backend/src/index.ts:155-162` - Sighting dedupe and incident assignment are non-atomic, so parallel ingestion can corrupt counts and create duplicates.
  Sightings have no uniqueness constraint beyond the email wrapper, matching happens before create/update inside separate calls, and incident fields are updated from stale snapshots with `incident.sightingCount + 1`. Startup ingestion and manual `/api/ingest` can overlap and lose increments, split one bird into multiple incidents, or insert duplicate sightings.

- `backend/src/lib/sighting-service.ts:74-90`, `backend/src/lib/enrichment-service.ts:72-149`, `backend/src/lib/ebird-client.ts:37-69` - "Background" enrichment is actually synchronous, unbounded, and reprocesses the last three days on every ingest.
  Each ingest waits for enrichment of every recent unenriched sighting, not just the current batch. One slow or wedged eBird request stalls mailbox processing, and the same backlog is retried on every run with no timeout to cut it off.

- `backend/src/index.ts:38-42`, `backend/src/index.ts:136-144`, `backend/src/lib/summarization-service.ts:175-205`, `backend/src/lib/photo-service.ts:12-96` - Background summarization and photo refresh have no in-flight locking or request coalescing.
  Concurrent ingests or repeated `/api/incidents` requests start duplicate LLM and iNaturalist work for the same records. That wastes quota, races database updates, and turns traffic spikes into self-inflicted load.

- `backend/src/index.ts:59-61` - Internal exception text is returned directly to clients.
  The route reflects raw error messages in `details`, which leaks infrastructure names, provider responses, and debugging strings to any caller who can trigger a failure.

# MEDIUM

- `backend/src/lib/enrichment-service.ts:80-107`, `backend/src/lib/sighting-service.ts:34-42` - Enrichment ignores stored coordinates and only looks for coordinates embedded in `location`.
  Sightings already geocoded from `mapUrl` still go down the weaker region-matching path unless the human-readable location string also contains lat/lng. That degrades match accuracy and burns extra eBird requests for no good reason.

- `backend/src/lib/imap-client.ts:38-74` - IMAP sessions are not closed on exceptions and have no timeout controls.
  `logout()` only runs after the happy path. Any error after `connect()` but before line 73 leaves cleanup to chance, which is how you accumulate hung sockets and mysterious ingestion stalls.

- `backend/prisma/schema.prisma:18-88` - The schema is missing indexes on the fields the application actually filters on.
  There are no indexes for `Sighting.date`, `Sighting.subId`, `Sighting.incidentId`, `Incident.status`, `Incident.lastSeen`, or `IncomingEmail.status/from/date`. The hot paths repeatedly filter on those columns, so SQLite is being forced into avoidable table scans and lock contention.

- `backend/src/index.ts:84-126`, `backend/src/lib/incident-service.ts:335-426` - The read endpoints do full-table loads and expensive in-memory derivation on every request.
  `/api/sightings` recomputes streaks across all sightings, and `/api/incidents` loads every open incident with all sightings plus all rarity codes and cached photos. There is no pagination, precomputation, or query narrowing to keep those paths from degrading badly as data grows.

- `backend/src/api-ingest.test.ts:13-37`, `backend/src/index.test.ts:15-32`, `backend/src/config.test.ts:5-7`, `frontend/src/components/Dashboard.test.tsx:10-87`, `frontend/src/App.test.tsx:13-18` - The test suite is mostly theater and several tests assert the wrong contract.
  One backend test requires a real secret, another only checks `200` and array shape, and the ingest route test mocks a rejected exception path even though the real service reports IMAP failure via a resolved `imap_error` result. The frontend tests are pure happy-path rendering checks. None of that exercises the failure modes that matter.

# LOW

- `backend/src/lib/streak-service.ts:7-58`, `backend/src/lib/streak-service.test.ts:18-65`, `backend/src/index.ts:84-126` - The only tested streak calculator is dead code; production reimplements different logic inline.
  `streak-service.ts` is not used by the API, so the dedicated streak tests do nothing to protect the code that actually serves `/api/sightings`. This is duplicated behavior with split maintenance and fake confidence.

- `package.json:6-11`, `backend/package.json:14` - Repo-level test scripts are broken enough to undermine routine verification.
  Root `npm test` is hardcoded to fail, and backend tests shell through PowerShell plus `.ps1` shims. During review the backend test command failed before it reached the assertions under a normal Windows execution policy.

# NIT

- `frontend/src/components/Dashboard.tsx:147-150` - The connection warning text is mojibake.
  `âš ï¸` is a busted encoding artifact. It is minor, but it still advertises that nobody looked closely at the UI output.
