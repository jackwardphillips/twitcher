# Implementation Plan - Bug: Incident Dates & Histogram Mismatch

Fix incorrect dates on incident cards and align the activity histogram.

## Phase 1: Research & Reproduction

- [~] Analyze eBird email date formats and how `new Date()` parses them `[ ]`
- [ ] Create a reproduction test in `ebird-parser.test.ts` for "off-by-one" or "ingestion-time" date errors `[ ]`
- [ ] Verify histogram day alignment in `incident-service.test.ts` `[ ]`

## Phase 2: Backend Implementation

- [ ] Update `ebird-parser.ts` to handle eBird date formats more robustly `[ ]`
- [ ] Update `incident-service.ts` to ensure `firstSeen` and `lastSeen` are bounds of sighting dates `[ ]`
- [ ] Refactor `dailyCounts` generation to be more timezone-resilient `[ ]`
- [ ] **Implement YYYY-MM-DD string serialization for all date fields in API responses** `[ ]`

## Phase 3: Frontend Implementation

- [ ] Update `SightingHistogram.tsx` to handle date strings from backend safely `[ ]`
- [ ] Ensure tooltips display correct local dates `[ ]`

## Phase 4: Validation

- [ ] Run all backend and frontend tests `[ ]`
- [ ] Manual verification with test emails `[ ]`
