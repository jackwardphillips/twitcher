# Specification: Startup Email Ingestion & Backfill

## Overview
This track involves integrating the existing email ingestion service into the backend's startup sequence, providing a manual backfill mechanism (from 2026-01-01), and displaying the status of the last ingestion in the UI.

## Functional Requirements
1. **Startup Integration**:
   - Automatically trigger email ingestion when the backend server starts (`backend/src/index.ts`).
   - Gracefully handle cases where no new emails are found (e.g., in the last 24 hours).
   - Distinguish between a successful "no emails found" state and an "IMAP connection error" state in the backend logs.

2. **Backfill Mechanism**:
   - Provide a manual script `backend/src/scripts/backfill-emails.ts` to fetch and process all ABA Rarities emails from `2026-01-01` to the current date.
   - Use the existing `messageId` deduplication to prevent redundant data.

3. **Status Reporting (API)**:
   - Expose an endpoint (e.g., `/api/ingestion-status`) that returns:
     - The date of the last ingested email (`date` from the latest `IncomingEmail` record).
     - The status of the last ingestion attempt (success/failure).

4. **Frontend UI Integration**:
   - Add a display in the `Dashboard.tsx` that shows "Last Email Ingested: [Date/Time]".
   - If the last ingestion attempt failed due to an IMAP error, display a subtle warning or indicator.

## Acceptance Criteria
- [ ] Backend startup triggers ingestion; logs clearly indicate if emails were found or if none were present.
- [ ] A manual backfill script fetches eBird alerts from `2026-01-01` to the current date.
- [ ] The API provides the latest ingestion status and email date.
- [ ] The Dashboard UI displays the date of the latest ingested email.
- [ ] Unit tests for the new/modified logic pass with >80% coverage.

## Out of Scope
- Periodic/scheduled email polling (one-time check at startup only).
- Manual re-ingestion trigger from the UI (admin-only task).
