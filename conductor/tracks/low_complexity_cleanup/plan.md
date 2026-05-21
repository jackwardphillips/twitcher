# Plan: Project Polish & Immediate Reliability

## Phase 1: Cleanup & Dev Experience
- [ ] Fix `npm test` scripts in root and backend `package.json`
- [ ] Delete dead code: `backend/src/lib/streak-service.ts` and `backend/src/lib/streak-service.test.ts`
- [ ] Fix mojibake in `frontend/src/components/Dashboard.tsx`

## Phase 2: API & Security
- [ ] Sanitize API error responses in `backend/src/index.ts`
- [ ] Ensure correct HTTP status codes for IMAP failures
- [ ] Implement reliable IMAP cleanup and timeout settings in `backend/src/lib/imap-client.ts`
- [ ] Fix enrichment matching to use persisted coordinates before string parsing fallbacks

## Phase 3: Performance
- [ ] Add database indexes to `backend/prisma/schema.prisma`
- [ ] Include `IncomingEmail(status, from, date)` in the indexing pass
- [ ] Run migration and verify query performance
