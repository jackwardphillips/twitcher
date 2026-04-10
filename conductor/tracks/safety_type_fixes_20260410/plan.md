# Implementation Plan: Safety and Type Fixes (Enrichment & Parser)

## Phase 1: Robust Enrichment (`enrichment-service.ts`) [checkpoint: 461908c]

- [x] Task: Create failing tests for `EnrichmentService.enrichSightings` demonstrating batch failure when an API call fails.
- [x] Task: Update `EnrichmentService.enrichSightings` to use `EbirdObservation[]` for `geoCache` and other `any` variables.
- [x] Task: Wrap the eBird API call inside the enrichment loop with a `try/catch` block.
- [x] Task: Ensure errors are logged and the loop continues to the next sighting.
- [x] Task: Verify tests pass and code coverage is maintained.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Robust Enrichment' (Protocol in workflow.md) 461908c

## Phase 2: Safe eBird Alert Parsing (`ebird-parser.ts`) [checkpoint: ca83d8a]

- [x] Task: Create failing tests for `parseEBirdAlert` with malformed email bodies (missing regex matches for species, location, or date). b7b406d
- [x] Task: Modify `parseEBirdAlert` to remove all `!` assertions on regex match results. e57fa64
- [x] Task: Implement explicit checks for regex match results; if a required field is missing, log a warning and skip the record. e57fa64
- [x] Task: Implement date validation to ensure extracted strings are valid before passing to `new Date()`. e57fa64
- [x] Task: Verify tests pass and code coverage is maintained. e57fa64
- [x] Task: Conductor - User Manual Verification 'Phase 2: Safe eBird Alert Parsing' (Protocol in workflow.md) ca83d8a

## Phase 3: Final Integration and Quality Gate

- [ ] Task: Run all backend tests to ensure no regressions.
- [ ] Task: Verify that all public API signatures remain unchanged.
- [ ] Task: Conduct a final self-review against the Quality Gates in `workflow.md`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Integration' (Protocol in workflow.md)
