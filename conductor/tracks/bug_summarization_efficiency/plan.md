# Implementation Plan - Bug: Summarization Cycle Efficiency

Optimize the summarization cycle to reduce redundant API calls.

## Phase 1: Research & Measurement

- [~] Run a summarization cycle and count the number of redundant calls (incidents with no new comments) `[ ]`
- [ ] Verify `summaryGeneratedAt` behavior in the current database `[ ]`

## Phase 2: Implementation

- [ ] Update `runSummarizationCycle` filter to only include incidents with `lastSeen > summaryGeneratedAt` or `summaryGeneratedAt IS NULL` `[ ]`
- [ ] Add check in `summarizeIncident` to ensure at least one new comment exists since `summaryGeneratedAt` `[ ]`
- [ ] Ensure `summaryGeneratedAt` is updated correctly on success `[ ]`

## Phase 3: Validation

- [ ] Add unit tests in `summarization-service.test.ts` to verify filtering logic `[ ]`
- [ ] Run ingestion with multiple emails and verify only affected incidents are re-summarized `[ ]`
- [ ] Monitor LLM usage/logs to confirm reduction in calls `[ ]`
