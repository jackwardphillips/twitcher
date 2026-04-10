# Specification: Safety and Type Fixes (Enrichment & Parser)

## Overview
This track addresses two HIGH-severity findings from the code review aimed at improving the robustness and type safety of the backend ingestion and enrichment pipeline. Specifically, it targets `enrichment-service.ts` for better error handling and type definitions, and `ebird-parser.ts` for safer parsing of eBird alert emails.

## Functional Requirements

### 1. Robust Enrichment (`enrichment-service.ts`)
- **Per-Request Error Handling:** Wrap each individual eBird API call (specifically `getNearbyNotableObservations` and any other external calls) within the enrichment loops in a `try/catch` block.
- **Batch Continuity:** If a single species or location enrichment fails due to an API error, the service must log the error (`console.error`) and continue processing the remaining items in the batch.
- **Concrete Typing:**
    - Replace `any[]` for `geoCache` with `Map<string, EbirdObservation[]>`.
    - Replace `any` for `match` variables with `EbirdObservation | null` (where `EbirdObservation` is the type already defined in `ebird-client.ts`).

### 2. Safe eBird Alert Parsing (`ebird-parser.ts`)
- **Removal of Non-Nullability Assertions:** Remove all uses of the non-null assertion operator (`!`) on regex match results.
- **Explicit Existence Checks:** For every regex match used to extract sighting data (Species, Location, Date, etc.):
    - Check if the match result exists before accessing indices.
    - **Failure Strategy:** If a required field (Species, Location, or Date) cannot be parsed from a record, **skip that specific bird record** and log a warning (`console.warn`) containing as much context as possible about the failed record.
- **Date Validation:** Ensure that strings extracted as dates are valid before being passed to `new Date()`.

## Non-Functional Requirements
- **Test-Driven Development (TDD):** Implement failing tests first that demonstrate the fragility (e.g., batch abortion on single failure, crash on missing regex match) before applying fixes.
- **Code Coverage:** Maintain or exceed 80% code coverage for the affected modules.
- **Public API Stability:** Do not change the public method signatures of `EnrichmentService` or the `parseEBirdAlert` function.

## Acceptance Criteria
- [ ] `enrichment-service.ts` uses concrete types (`EbirdObservation`) instead of `any`.
- [ ] A failure in one eBird API call during enrichment does not stop the entire `enrichAllUnenriched` or `enrichSightings` process.
- [ ] `ebird-parser.ts` contains no `!` assertions on regex results.
- [ ] Malformed eBird alert sections that fail regex matching are skipped with a warning instead of causing a runtime exception.
- [ ] All tests pass, including new TDD cases.

## Out of Scope
- Changes to `match-engine.ts`.
- Changes to frontend CSS or components.
- Addressing other medium/low severity code review findings.
