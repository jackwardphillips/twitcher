# Plan: Test Suite Modernization

## Phase 1: Infrastructure
- [x] Set up a robust test database cleaner [8707442]
- [x] Implement a standardized network mocking pattern (e.g., using `msw` or similar) [8707442]

## Phase 2: Core Logic Tests [checkpoint: f106ef3]
- [x] Rewrite ingestion-service.test.ts to cover failure/retry states [67276db]
- [x] Add integration tests for the full Sighting -> Incident flow [14b5ef3]
- [x] Replace secret-dependent and contract-wrong backend tests (`config.test.ts`, ingest route expectations) [465640b]

## Phase 3: Regression Guarding [checkpoint: 6234760]
- [x] Add "slow network" and "db failure" simulation tests [b6a128d]
- [x] Rewrite frontend tests to cover failure, empty-state, and ingestion-status behavior instead of only header/card rendering [b6a128d]

## Phase 4 : Review Fixes
- [x] Task: Apply review suggestions [87996aa]
- [x] Task: Refine EbirdClient retry and IngestionService error handling [8a5701a]

## Phase 5: Test Credibility Cleanup
- [x] Replace the non-test in `backend/src/lib/ingestion-service.test.ts` with a real failure-injection case that proves parse/save failures mark the email `failed` and do not silently pass. [0b76884]
- [x] Rewrite `backend/src/api-ingest.test.ts` to cover the actual `/api/ingest` contract: resolved `imap_error` returns `500`, thrown exceptions hit the catch path, and success remains `200`. [a3216a0]
- [x] Remove or rewrite fake integration tests (`backend/src/full-api-ingest.test.ts`, similar over-mocked flow tests) so anything labeled "full flow" uses the real parser and database boundaries. [3f65d72]
- [x] Replace remaining backend smoke theater (`backend/src/index.test.ts`, `backend/src/config.test.ts`) with assertions tied to meaningful behavior, or delete them if they protect nothing. [a57eb41]
- [x] Fix test entrypoints so routine verification works on Windows without PowerShell execution-policy hacks: root `npm test` must run the real suites, and backend test scripts must not depend on `.ps1` shims to reach Vitest. [fa15ed6]

## Phase 5A: Residual Test Cleanup [checkpoint: 4f3f7cb]
- [x] Strengthen `backend/src/index.test.ts` for `/api/incidents` so it asserts meaningful shaped response fields (`locationName`, centroid fields, `activeDays`, `dailyCounts`, latest links, and cached photo data) instead of only basic presence. [a5e42fc]
- [x] Update the success fixture in `backend/src/api-ingest.test.ts` to use the full `IngestionResult` shape, including `status` and `enrichmentStatus`, so the test matches the actual contract instead of a partial object. [a3eae76]
- [x] Remove stray debug logging from `backend/src/full-api-ingest.test.ts` to keep automated test output clean and intentional. [4ba5b5b]

## Phase 6: Concurrency and Background Work
- [x] Add backend tests that run overlapping ingestions and prove duplicate emails/sightings/incidents are not created when startup ingestion and manual `/api/ingest` happen at the same time. [a7bd247]
- [x] Add incident update tests that detect stale `sightingCount`, `lastSeen`, and incident merge behavior under concurrent writes instead of only single-threaded happy paths. [f19da00]
- [x] Add regression tests for background summarization so repeated ingest triggers do not start duplicate summarization work for the same incident set. [f19da00]
- [x] Add regression tests for `/api/incidents` photo fetching so concurrent requests do not fan out duplicate photo refreshes for the same species. [f19da00]
- [x] Add failure-containment tests proving background summarization and photo refresh errors are logged and isolated without breaking the user-facing API response. [f19da00]

## Phase 6A: Concurrency Hardening Fixes
- [x] Add an atomic claim/transition step for pending `IncomingEmail` rows in `backend/src/lib/ingestion-service.ts` so concurrent retry workers cannot both parse/save the same email after reading `status in ['new', 'failed']`. [c600e01]
- [x] Replace the current pending-email concurrency test with one that forces real overlap on the retry path and proves only one worker processes a shared pending email end to end. [c600e01]
- [x] Fix `backend/src/lib/incident-service.ts` so concurrent updates derive `statesCovered` from the latest persisted incident state inside the transaction, not from the stale incident snapshot passed into `addSightingToIncident`. [557f435]
- [x] Add a concurrent incident-update test that uses distinct state-bearing locations and proves `statesCovered`, `sightingCount`, and `lastSeen` all survive overlapping writes. [557f435]
- [x] Add explicit failure-containment coverage for `photoService.needsFetch()` rejection in `backend/src/index.ts`, and update the route if needed so both `needsFetch()` and `fetchSpeciesPhoto()` failures are isolated and logged without leaking into the response path. [e52c28e]

## Phase 6B: Concurrency Hardening Follow-Through
- [x] Add recovery semantics for stuck `IncomingEmail` claims in `backend/src/lib/ingestion-service.test.ts` so rows left in `processing` after a worker crash or interruption become retryable again instead of remaining permanently stranded. [162c417]
- [x] Add a failure-injection ingestion test that simulates a worker claiming an email and dying before final status write, then proves a later run recovers and processes that email exactly once. [e86a1b8]
- [x] Rework `backend/src/lib/incident-service.ts` so concurrent incident updates cannot overwrite `statesCovered`, `lastSeen`, or coordinate bounds from stale read snapshots. [85b2a39]
- [x] Replace the current incident concurrency regression with one that forces overlap between the read and write portions of `addSightingToIncident`, so it fails against the stale-snapshot implementation and passes only after the real fix. [85b2a39]
- [x] Extend concurrent incident-update assertions to explicitly verify `statesCovered`, `sightingCount`, `lastSeen`, `minLat`, `maxLat`, `minLng`, and `maxLng`. [85b2a39]
- [x] Audit the Phase 6 concurrency tests for timing-sensitive false confidence and add intentional overlap controls plus a short note in each test describing the race it is meant to reproduce. [e0d006c]

## Phase 7: End-to-End Dashboard Coverage
- [x] Add frontend integration tests for geolocation success, denial, unsupported-browser behavior, and near-me filtering across mixed-distance incidents. [40d4a83]
- [x] Add interaction tests for combined dashboard filters (rarity plus near-me plus empty-state guard) so filter composition is covered instead of checked one flag at a time. [6406eef]
- [x] Add behavioral tests for histogram, map, and photo presentation states that assert user-visible outcomes rather than CSS trivia. [09b8115]
- [x] Add API-level tests for ingestion hardening gaps that still affect dashboard reliability: auth/rate limiting expectations, slow-provider behavior, and safe error surfaces. [e573987]
- [~] Add representative end-to-end smoke coverage for the main dashboard flow: ingest data, fetch incidents, render the list/map, and preserve failure messaging when one backend dependency degrades.

