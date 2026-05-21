# Spec: Test Suite Modernization

## Seed Findings (from review.md)
- `backend/src/api-ingest.test.ts:13-37`, `backend/src/index.test.ts:15-32`, `backend/src/config.test.ts:5-7` - Test suite is mostly theater and asserts wrong contracts.
- `frontend/src/components/Dashboard.test.tsx:10-87`, `frontend/src/App.test.tsx:13-18` - Frontend tests are shallow happy-path rendering checks and do not guard user-visible failure behavior.
- Lack of integration tests for network/database failure modes.

## Problem
The current test suite is "mostly theater." Many tests assert simple happy paths or mock out the exact failure conditions that the application is failing to handle in production. This creates a false sense of security.

## Goals
- Transition to "Behavior-Driven" integration tests.
- Ensure failure modes (network timeouts, DB errors) are actually tested.
- Remove tests that require real secrets or assert the wrong HTTP contract.

## Requirements
1. **Integration Tests:** Implement tests that use a real (test) database and mock external services (IMAP, eBird) at the network layer.
2. **Failure Injection:** Create tests that explicitly simulate eBird rate limits and IMAP connection drops.
3. **Accuracy:** Fix existing tests that assert incorrect contracts (e.g., tests that check for `200` when the service should be failing).
4. **Frontend Coverage:** Replace the current render-only frontend tests with behavior assertions for loading, API failure, empty-state, and ingestion-status warning UI.
