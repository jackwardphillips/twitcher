# Plan: Test Suite Modernization

## Phase 1: Infrastructure
- [~] Set up a robust test database cleaner
- [ ] Implement a standardized network mocking pattern (e.g., using `msw` or similar)

## Phase 2: Core Logic Tests
- [ ] Rewrite `ingestion-service.test.ts` to cover failure/retry states
- [ ] Add integration tests for the full Sighting -> Incident flow
- [ ] Replace secret-dependent and contract-wrong backend tests (`config.test.ts`, ingest route expectations)

## Phase 3: Regression Guarding
- [ ] Add "slow network" and "db failure" simulation tests
- [ ] Rewrite frontend tests to cover failure, empty-state, and ingestion-status behavior instead of only header/card rendering
