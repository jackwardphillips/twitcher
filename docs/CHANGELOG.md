# Changelog

## 2026-07-25

### Frontend

- Reworked the Dashboard, Statistics, and About layouts for narrow screens,
  including stacked sighting cards, fluid photos and histograms, compact
  statistics details, wrapping controls, and phone-sized navigation tabs.
- Kept rarity-code controls inline on mobile instead of using a dropdown.
- Removed the Active Days badge from sighting and example cards, hid the
  secondary header subtitle on phones, and constrained the mobile map width.
- Matched the About-page example card to the Dashboard mobile card layout,
  including a full-width activity histogram.
- Aligned the mobile Dashboard rarity controls opposite its title, added
  spacing before Statistics filters, and normalized the About header position.
- Made photo attribution visible on devices without hover support.

## 2026-07-24

### Backend

- Split backend tests into database-free and database-backed tiers, and added
  fail-closed disposable PostgreSQL checks before destructive test cleanup.
- Changed backend MSW setup to permit intentional loopback integration traffic
  while rejecting unhandled external requests in both test tiers.
- Replaced global provider fetch stubs in concurrency coverage with explicit MSW
  handlers so network isolation and request-count assertions share one boundary.
- Renamed a mock-only integration test so its name reflects its unit-test
  boundaries.
- Removed stale Prisma schema-test suppressions and corrected comments that
  described existing fields as hypothetical.
- Added a dedicated TypeScript configuration and command for backend tests and
  support files, fixing the test-double and unsafe-access drift it exposed.

### Frontend

- Renamed the JSDOM E2E smoke test so its name reflects its component-test
  boundary.
- Added frontend and root lint commands with strict production rules and an
  explicit test-mock policy.
- Cleared the 21-error lint baseline by fixing render-time clock usage and map
  reset behavior, and documenting two effects that legitimately update measured
  or request state.

### Dependencies

- Removed the duplicate root `cors` dependency while retaining the backend-owned
  runtime dependency.

### CI and operations

- Updated poller CI and local test documentation for the explicit database-reset
  acknowledgement and `_test` database/role conventions.
- Added repository-wide backend and frontend validation for pushes and pull
  requests. Database-backed tests remain isolated in the ephemeral-PostgreSQL
  poller workflow.
- Generate the Prisma client explicitly in fresh backend CI checkouts before
  running tests or builds.
- Correct the hosted database-test network policy after CI showed that strict
  unhandled-request rejection also blocked temporary loopback application
  servers.

### Audit and documentation

- Added the root `AUDIT.md` register to preserve cleanup findings and proposed
  story groupings before implementation decisions are made.
- Recorded code-reachability measurements in the audit; no application code was
  changed.
- Classified uncertain backend scripts by whether they read or mutate database
  data.
- Added deep test-suite audit findings covering destructive setup, mock fidelity,
  network isolation, CI gaps, timing-based tests, and missing browser coverage.
- Added backend correctness and reliability audit findings covering observation
  identity, partial-write recovery, incident matching, target lifecycle,
  provider timeouts, enrichment retry state, and poller/web ingestion ownership.
- Added security audit findings covering unauthenticated ingestion and operations
  routes, abuse resistance, HTTP hardening, error disclosure, and dependency
  advisory reachability.
- Added frontend audit findings covering unknown-rarity misclassification,
  request races and contract validation, mobile/accessibility defects, metric
  semantics, routing, map degradation, and dead/overlapping CSS.
- Added deployment and operations findings covering inferred provider topology,
  misleading health, poller image hardening/reproducibility, migration ownership,
  configuration gaps, CI supply-chain checks, scheduling, and graceful shutdown.
- Added documentation-system findings covering competing sources of truth, false
  setup/current-state guidance, orphaned tracks, conflicting agent instructions,
  missing decision records, and the boundary between current and historical docs.
- Completed the static audit with schema-parity findings, a dependency-aware
  cleanup story sequence, and an explicit list of production evidence still
  required.
- Updated `AUDIT.md` to mark S14 and its two findings complete, record the
  implemented guardrails and unit-tier verification, and preserve the outstanding
  database-tier runtime evidence gap.
- Updated `AUDIT.md` to close F002, S15/F005, and S16/F026 while retaining
  assertion-fidelity work under F025/S20.
- Updated `AUDIT.md` to close F006, S17/F027, S04/F007-F008, and S19/F029 while
  preserving hosted-CI and supply-chain follow-up under S44/F069.
