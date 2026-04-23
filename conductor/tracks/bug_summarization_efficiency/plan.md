# Implementation Plan - Bug: Summarization Cycle Efficiency

Optimize the summarization cycle to reduce redundant API calls.

## Phase 1: Research & Measurement

- [x] Run a summarization cycle and count the number of redundant calls (incidents with no new comments) [7bd7497]
- [x] Verify `summaryGeneratedAt` behavior in the current database [7bd7497]

## Phase 2: Implementation

- [x] Update `runSummarizationCycle` filter to only include incidents with `lastSeen > summaryGeneratedAt` or `summaryGeneratedAt IS NULL` [e16752a]
- [x] Add check in `summarizeIncident` to ensure at least one new comment exists since `summaryGeneratedAt` [e16752a]
- [x] Ensure `summaryGeneratedAt` is updated correctly on success [e16752a]

## Phase 3: Validation

- [ ] Add unit tests in `summarization-service.test.ts` to verify filtering logic `[ ]`
- [ ] Run ingestion with multiple emails and verify only affected incidents are re-summarized `[ ]`
- [ ] Monitor LLM usage/logs to confirm reduction in calls `[ ]`
