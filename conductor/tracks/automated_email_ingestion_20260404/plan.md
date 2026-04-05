# Implementation Plan: Automated Email Ingestion

## Phase 1: Database & Schema [checkpoint: ca9c4bb]
- [x] Task: Define `IncomingEmail` model in `backend/prisma/schema.prisma`. 0f28636
  - Fields: `id`, `messageId` (unique), `subject`, `from`, `date`, `rawBody`, `status` (new/processed/failed), `createdAt`.
- [x] Task: Run `npx prisma migrate dev --name add_incoming_email` and regenerate client. 0f28636
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database & Schema' (Protocol in workflow.md) ca9c4bb

## Phase 2: IMAP Ingestion Service
- [ ] Task: Research and add a lightweight IMAP client library (e.g., `imapflow` or `node-imap`).
- [ ] Task: Write failing tests for `ImapClient` (mocking IMAP connection and 24h search).
- [ ] Task: Implement `ImapClient` in `backend/src/lib/imap-client.ts`.
- [ ] Task: Write failing tests for `IngestionService` (deduplication and raw storage).
- [ ] Task: Implement `IngestionService` in `backend/src/lib/ingestion-service.ts`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: IMAP Ingestion Service' (Protocol in workflow.md)

## Phase 3: Integration & Auto-Parsing
- [ ] Task: Write failing tests for the integration of `IngestionService` -> `ebird-parser` -> `SightingService`.
- [ ] Task: Implement the auto-parsing logic that triggers after ingestion.
- [ ] Task: Add `POST /api/ingest` to `backend/src/index.ts`.
- [ ] Task: Write integration tests for the full `/api/ingest` flow.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Integration & Auto-Parsing' (Protocol in workflow.md)

## Phase 4: Final Verification
- [ ] Task: Final manual verification with a test IMAP account or mocked server.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification' (Protocol in workflow.md)
