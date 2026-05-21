# Spec: Project Polish & Immediate Reliability

## Seed Findings (from review.md)
- `frontend/src/components/Dashboard.tsx:147-150` - Mojibake in connection warning.
- `backend/src/lib/imap-client.ts:38-74` - IMAP sessions not closed on exceptions.
- `backend/src/index.ts:59-61` - Exception text returned to clients.
- `package.json:6-11` - Broken repo-level test scripts.
- `backend/src/lib/streak-service.ts` - Dead code cleanup.
- `backend/src/index.ts:53-58` - API reports 200 on IMAP failure.
- `backend/prisma/schema.prisma:18-88` - Missing indexes on hot paths.
- `backend/src/lib/enrichment-service.ts:80-107`, `backend/src/lib/sighting-service.ts:34-42` - Enrichment ignores stored coordinates and falls back to weaker parsing.

## Problem
The system contains several "low complexity" bugs and architectural nits identified during the April 2026 review. These issues, while small individually, collectively degrade the user experience and system reliability.

## Goals
- Fix UI artifacts (mojibake).
- Ensure IMAP connections are properly closed.
- Prevent infrastructure detail leakage in API errors.
- Fix broken development scripts.
- Remove redundant/dead code.
- Align HTTP status codes with actual service outcomes.
- Improve database performance with basic indexing.
- Make enrichment use the coordinates the system already stores.

## Requirements
1. **UI:** Restore the warning icon in `Dashboard.tsx`.
2. **IMAP:** Wrap IMAP operations in `finally` blocks to call `logout()` and add explicit connection/socket timeout configuration so failed providers do not hang ingestion indefinitely.
3. **Security:** Update error handling in `index.ts` to return generic messages.
4. **DevOps:** Update `package.json` test scripts to work across environments.
5. **Cleanup:** Delete `streak-service.ts` and its associated tests.
6. **API:** Ensure `imap_error` results in a `500 Internal Server Error`.
7. **Database:** Add indexes for `Sighting(date, subId, incidentId)`, `Incident(status, lastSeen)`, and `IncomingEmail(status, from, date)`.
8. **Enrichment correctness:** Update enrichment matching to prefer persisted `latitude`/`longitude` when present and only parse coordinates from strings as a fallback.
