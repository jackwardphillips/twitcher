# Plan: Startup Email Ingestion & Backfill

## Phase 1: IMAP Backfill & Date Filtering (Backend)
- [x] Task: Update `ImapClient.fetchRecentAlerts` to accept a `since` Date parameter (already exists, but verify it works as expected for long ranges). 0def96f
- [x] Task: Create `backend/src/scripts/backfill-emails.ts` to fetch and process all ABA Rarities emails from `2026-01-01` to the current date. 0def96f
- [x] Task: Write tests for `ImapClient` to verify it correctly searches with the `since` criteria. 0def96f
- [ ] Task: Conductor - User Manual Verification 'Phase 1: IMAP Backfill' (Protocol in workflow.md)

## Phase 2: Startup Integration & API Status (Backend)
- [x] Task: Refactor `IngestionService.ingest()` to return a detailed status (e.g., `success`, `no_new_emails`, or `imap_error`). b5bb689
- [x] Task: Update `backend/src/index.ts` to trigger `IngestionService.ingest()` when the server starts. b5bb689
- [x] Task: Create a new `/api/ingestion-status` endpoint that returns the date of the latest `IncomingEmail` and the status of the last ingestion run. b5bb689
- [x] Task: Write tests for the `IngestionService` detailed status and the `/api/ingestion-status` endpoint. b5bb689
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Startup & API' (Protocol in workflow.md)

## Phase 3: Frontend UI Display (Frontend)
- [x] Task: Update the frontend (e.g., `App.tsx` or `Dashboard.tsx`) to fetch the ingestion status from the new backend endpoint. a2acd0b
- [x] Task: Add a display to `Dashboard.tsx` showing "Last Email Ingested: [Date/Time]". a2acd0b
- [x] Task: Implement a visual indicator (e.g., a small warning icon or text) if the last ingestion attempt failed due to an IMAP error. a2acd0b
- [x] Task: Write tests for the `Dashboard` component to verify the new ingestion status display. a2acd0b
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend UI' (Protocol in workflow.md)

## Phase: Review Fixes
- [x] Task: Apply review suggestions 1ba3fe4
