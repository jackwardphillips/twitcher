# Changelog

## 2026-08-13

### Backend

- Removed the unused streak-service implementation and its isolated tests; the
  production sighting streak calculation remains covered at the API boundary.
- Clear stale incident summary text when a provider successfully reports no
  useful signal, while retaining the generation timestamp to distinguish that
  result from a provider failure.
- Reconciled incident dates, sighting counts, and open or closed status whenever
  a sighting is marked missing or removed, preventing deleted reports from
  leaving incidents open with stale aggregate data.
- Made sighting lifecycle updates and incident reconciliation atomic, preserved
  the original closure time for incidents that remain closed, and added
  regression coverage for both behaviors.

### Documentation

- Replaced the 81-finding cleanup audit and overlapping status, review, TODO,
  and active-track documents with one prioritized engineering backlog.
- Retained shipped history in this changelog and operational guidance in
  `docs/ops/`. The remaining `conductor/archive/` is temporary legacy history;
  useful details will move here before it is removed.

## 2026-07-30

### Backend

- Changed the poller to derive work from open incidents plus the newest three
  previously unhandled alert emails from a five-day overlapping mailbox
  window, replacing the rolling seven-email target union.
- Added race-safe per-email poll handling, exact eBird region metadata on new
  incidents, email-driven reopening of closed incidents, post-poll incident
  closure, and immediate dashboard exclusion for incidents past the
  three-day activity window.
- Added lifecycle tests covering email arrival races and failed-run retries,
  catch-up limits, target deduplication, legacy region fallback, final-chance
  polling, closure boundaries, reopening, and closed/stale dashboard results.

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

- Delivered the poller as a gated Linux ARM64 image through GitHub Actions and
  GHCR, with immutable revision tags, a moving production tag, cached-image
  fallback, overlap locking, and a server-local digest override for rollback.
- Activated the home-server schedule at midnight, 2:00 AM, and every two hours
  from 6:00 AM through 10:00 PM, intentionally retaining the 2:00–6:00 AM quiet
  window. Human logs retain 14 compressed daily files; sanitized JSONL run
  summaries retain 90 days; detailed eBird diagnostics retain 30 days.
- Verified production image digest
  `sha256:21544bf246f37220444510d65589470264e80270c9f207d91c8b2af9afe904c6`
  in supervised poll run `cmrz7brec004t0up5oygmscrh`: 59 targets and 59
  correlated eBird calls completed with zero failures, while Groq updated 7
  eligible summaries and skipped 9.
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
