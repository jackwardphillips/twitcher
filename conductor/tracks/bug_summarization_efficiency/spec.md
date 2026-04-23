# Specification - Bug: Summarization Cycle Efficiency

The current summarization cycle re-summarizes every active incident whenever a new email is ingested. This leads to redundant and costly LLM API calls for incidents that haven't received any new sightings or comments since the last summary was generated.

## Requirements

- **Delta-based Summarization**: Only trigger summarization for an incident if it has new sightings or comments since its last `summaryGeneratedAt` timestamp.
- **Granular Triggers**: Instead of a global cycle, consider summarizing incidents individually as they are updated, or filtering the cycle to only include "dirty" incidents.
- **Improved Signal Detection**: If an incident has many sightings but none have comments, it might not need a re-summary if the existing one is still valid.

## Proposed Changes

### Backend

- **summarization-service.ts**:
    - Update `runSummarizationCycle` to query for incidents where `lastSeen` > `summaryGeneratedAt` (or `summaryGeneratedAt` is null).
    - Modify `summarizeIncident` to double-check if there are actually new comments since the last generation before calling the LLM.
- **incident-service.ts** / **sighting-service.ts**:
    - Ensure `summaryGeneratedAt` is initialized to a very old date (or null) when an incident is created.

## Verification Plan

- **Automated Tests**:
    - Add a test in `summarization-service.test.ts` to verify that `runSummarizationCycle` skips incidents that were recently summarized and have no new data.
- **Logs**:
    - Verify via console logs that only a subset of active incidents are processed during a typical ingestion run.
