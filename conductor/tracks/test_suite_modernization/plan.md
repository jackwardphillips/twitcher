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
