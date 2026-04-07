# Implementation Plan: Automated Email Ingestion

## Phase 1: Database & Schema [checkpoint: ca9c4bb]
- [x] Task: Define `IncomingEmail` model in `backend/prisma/schema.prisma`. 0f28636
  - Fields: `id`, `messageId` (unique), `subject`, `from`, `date`, `rawBody`, `status` (new/processed/failed), `createdAt`.
- [x] Task: Run `npx prisma migrate dev --name add_incoming_email` and regenerate client. 0f28636
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database & Schema' (Protocol in workflow.md) ca9c4bb

## Phase 2: IMAP Ingestion Service [checkpoint: f10e620]
- [x] Task: Research and add a lightweight IMAP client library (e.g., `imapflow` or `node-imap`). f30f0ae
- [x] Task: Write failing tests for `ImapClient` (mocking IMAP connection and 24h search). cd8e679
- [x] Task: Implement `ImapClient` in `backend/src/lib/imap-client.ts`. cd8e679
- [x] Task: Write failing tests for `IngestionService` (deduplication and raw storage). ed16447
- [x] Task: Implement `IngestionService` in `backend/src/lib/ingestion-service.ts`. ed16447
- [x] Task: Conductor - User Manual Verification 'Phase 2: IMAP Ingestion Service' (Protocol in workflow.md) f10e620

## Phase 3: Integration & Auto-Parsing
- [x] Task: Write failing tests for the integration of `IngestionService` -> `ebird-parser` -> `SightingService`. 9cb0056
- [x] Task: Implement the auto-parsing logic that triggers after ingestion. a5c506e
- [x] Task: Add `POST /api/ingest` to `backend/src/index.ts`. 3a55fda
- [x] Task: Write integration tests for the full `/api/ingest` flow. 1f448a1
- [~] Task: Conductor - User Manual Verification 'Phase 3: Integration & Auto-Parsing' (Protocol in workflow.md)

## Phase 4: Final Verification
- [ ] Task: Final manual verification with a test IMAP account or mocked server.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification' (Protocol in workflow.md)
