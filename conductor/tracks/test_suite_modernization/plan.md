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
- [ ] Add backend tests that run overlapping ingestions and prove duplicate emails/sightings/incidents are not created when startup ingestion and manual `/api/ingest` happen at the same time.
- [ ] Add incident update tests that detect stale `sightingCount`, `lastSeen`, and incident merge behavior under concurrent writes instead of only single-threaded happy paths.
- [ ] Add regression tests for background summarization so repeated ingest triggers do not start duplicate summarization work for the same incident set.
- [ ] Add regression tests for `/api/incidents` photo fetching so concurrent requests do not fan out duplicate photo refreshes for the same species.
- [ ] Add failure-containment tests proving background summarization and photo refresh errors are logged and isolated without breaking the user-facing API response.

## Phase 7: End-to-End Dashboard Coverage
- [ ] Add frontend integration tests for geolocation success, denial, unsupported-browser behavior, and near-me filtering across mixed-distance incidents.
- [ ] Add interaction tests for combined dashboard filters (rarity plus near-me plus empty-state guard) so filter composition is covered instead of checked one flag at a time.
- [ ] Add behavioral tests for histogram, map, and photo presentation states that assert user-visible outcomes rather than CSS trivia.
- [ ] Add API-level tests for ingestion hardening gaps that still affect dashboard reliability: auth/rate limiting expectations, slow-provider behavior, and safe error surfaces.
- [ ] Add representative end-to-end smoke coverage for the main dashboard flow: ingest data, fetch incidents, render the list/map, and preserve failure messaging when one backend dependency degrades.

