# Implementation Plan - Bug: Incident Dates & Histogram Mismatch

Fix incorrect dates on incident cards and align the activity histogram.

## Phase 1: Research & Reproduction

- [x] Analyze eBird email date formats and how `new Date()` parses them [0b02322]
- [x] Create a reproduction test in `ebird-parser.test.ts` for "off-by-one" or "ingestion-time" date errors [0b02322]
- [x] Verify histogram day alignment in `incident-service.test.ts` [0b02322]

## Phase 2: Backend Implementation

- [x] Update `ebird-parser.ts` to handle eBird date formats more robustly [a9d955b]
- [x] Update `incident-service.ts` to ensure `firstSeen` and `lastSeen` are bounds of sighting dates [a9d955b]
- [x] Refactor `dailyCounts` generation to be more timezone-resilient [a9d955b]
- [x] **Implement YYYY-MM-DD string serialization for all date fields in API responses** [a9d955b]

## Phase 3: Frontend Implementation

- [x] Update `SightingHistogram.tsx` to handle date strings from backend safely [d3c4e5f]
- [x] Ensure tooltips reflect the correct calendar day [d3c4e5f]


## Phase 4: Validation

- [x] Run all backend and frontend tests [a9d955b]
- [x] Manual verification with test emails [a9d955b]
