# Implementation Plan: Safety and Type Fixes (Enrichment & Parser)

## Phase 1: Robust Enrichment (`enrichment-service.ts`)

- [x] Task: Create failing tests for `EnrichmentService.enrichSightings` demonstrating batch failure when an API call fails.
- [x] Task: Update `EnrichmentService.enrichSightings` to use `EbirdObservation[]` for `geoCache` and other `any` variables.
- [x] Task: Wrap the eBird API call inside the enrichment loop with a `try/catch` block.
- [x] Task: Ensure errors are logged and the loop continues to the next sighting.
- [x] Task: Verify tests pass and code coverage is maintained.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Robust Enrichment' (Protocol in workflow.md)

## Phase 2: Safe eBird Alert Parsing (`ebird-parser.ts`)

- [ ] Task: Create failing tests for `parseEBirdAlert` with malformed email bodies (missing regex matches for species, location, or date).
- [ ] Task: Modify `parseEBirdAlert` to remove all `!` assertions on regex match results.
- [ ] Task: Implement explicit checks for regex match results; if a required field is missing, log a warning and skip the record.
- [ ] Task: Implement date validation to ensure extracted strings are valid before passing to `new Date()`.
- [ ] Task: Verify tests pass and code coverage is maintained.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Safe eBird Alert Parsing' (Protocol in workflow.md)

## Phase 3: Final Integration and Quality Gate

- [ ] Task: Run all backend tests to ensure no regressions.
- [ ] Task: Verify that all public API signatures remain unchanged.
- [ ] Task: Conduct a final self-review against the Quality Gates in `workflow.md`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Integration' (Protocol in workflow.md)
