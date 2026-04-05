# Specification: Automated Email Ingestion (v2)

## Overview
Implement an IMAP polling service to fetch eBird alert emails from the past 24 hours (including read emails), store them for deduplication, and automatically parse them into sightings.

## Functional Requirements
- **IMAP Polling:** Connect to a configured IMAP server (via ENV) to fetch emails.
- **Search Criteria:** Fetch emails from the past 24 hours (regardless of 'Seen' status) and filter for those from `ebird-alert@birds.cornell.edu`.
- **Deduplication:** Use the IMAP `Message-ID` to ensure each email is processed exactly once in the local database.
- **Storage:** Create an `IncomingEmail` table to store raw content and metadata.
- **Auto-Parsing:** Immediately trigger the existing `ebird-parser` after successful ingestion.
- **Endpoint:** Expose a POST `/api/ingest` endpoint to manually trigger the polling.
- **Safe Handling:** Do not delete or move emails from the source inbox.

## Non-Functional Requirements
- **Security:** All credentials (IMAP_HOST, IMAP_USER, IMAP_PASS) must be stored in `.env`.
- **Error Handling:** Log IMAP connection or parsing failures without crashing the service.

## Acceptance Criteria
1.  Calling `/api/ingest` fetches eBird emails from the last 24 hours.
2.  Duplicate `Message-ID`s are ignored in subsequent calls.
3.  Each unique email body is stored in the database.
4.  Parsing results (sightings) are added to the database.
5.  The email remains in the remote inbox and its 'Seen' status is preserved.

## Out of Scope
- Automated background scheduling (only on-demand endpoint for now).
- UI for managing the raw email table.
- Support for non-eBird email formats.
