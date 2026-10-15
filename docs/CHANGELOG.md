# Changelog

Entries migrated from Conductor below use the track’s archive date from Git
history, rather than its creation date. Archive commit references preserve access
to the original specifications and plans; these entries describe historical
behavior, which later changes may supersede.

## 2026-10-15

### Statistics query validation

- Validate statistics query parameters consistently in Vercel and local Express:
  reject malformed years, invalid grouping, repeated/unsupported parameters,
  and excessively long or control-character-containing state names with HTTP
  400. Unknown well-formed state names still return empty results.
- Apply active/year filters in the incident database query rather than loading
  all incidents first; preserve existing calendar-year and ranking semantics.
  Request-rate limits and all-year/options query bounds remain under A02.

### Local development API boundary

- Retained Express for local development and bound its listener explicitly to
  `127.0.0.1`. Documented that ingestion and diagnostic routes assume a trusted
  local caller, while production web APIs run as Vercel functions. Narrowed A02
  to remaining public-query limits and validation.

### Reliability and rarity correctness

- Added 30-second request deadlines to eBird, iNaturalist, and reverse-geocoding
  HTTP calls. eBird timeouts use the existing bounded retry policy. Configured
  IMAP connection, greeting, and inactivity timeouts and close connections even
  when connecting, acquiring a mailbox, fetching, or logging out fails.
- Resolved A11: unknown ABA rarity no longer inherits Code 5 filtering or color.
  Added a separate, opt-in Unknown filter and label, with neutral card and map
  colors. Default selection remains codes 3–6; the API already preserves null
  rarity values.
- Refreshed the audit for the Vercel/Neon/Mac-poller topology, existing migration
  and image-build automation, retired production summaries, and removed docs.

## 2026-08-13

### Backend

- Made email ingestion atomic and retry-safe: parsed sightings now have a
  database-enforced source identity, core email/target/sighting/incident writes
  commit together at serializable isolation, and provider enrichment runs only
  after that commit. Missing Message-IDs now use a stable content hash instead
  of sharing the `unknown` identity.
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
- Retained shipped history in this changelog and, at the time, operational
  guidance in `docs/ops/`. Historical Conductor track summaries are now
  consolidated below under their archive dates.

### Deployment

- Runs committed Prisma migrations before Vercel production builds and publishes
  application code, preventing deployments from referencing schema columns that
  production does not have yet. Preview builds do not mutate the production
  database.

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

## 2026-05-21

### Test suite modernization

- Replaced shallow and secret-dependent tests with database-backed ingestion and sighting-to-incident coverage, MSW provider mocks, and explicit retry, timeout, database-failure, and HTTP error-contract assertions.
- Made root and backend test entrypoints work on Windows without PowerShell shim workarounds; strengthened incident response-shape assertions and removed misleading full-flow mocks and debug output.
- Added controlled-overlap regression coverage and fixes for email claims and crash recovery, concurrent incident aggregates and coordinate bounds, duplicate background summaries and photo refreshes, and background failure containment.
- Added dashboard behavior coverage for geolocation, combined rarity/proximity filters, empty and failure states, histograms, maps, photos, API hardening, and an ingest-to-dashboard smoke flow.

Archived track: `test_suite_modernization` (commit `101f4db`).

## 2026-04-26

### iNaturalist photo integration

- Added lazily fetched representative species photos from iNaturalist, persisted in a SpeciesPhoto cache with attribution, 30-day expiry, and negative caching for missing photos.
- Returned cached photos immediately from the incidents API while refreshing missing or stale entries in the background; displayed photos with attribution and a blank placeholder when unavailable.

Archived track: `inaturalist_photo_integration_20260426` (commit `9024c22`).

### Summarization efficiency

- Filtered summary work to incidents with new sightings since the last generation or no existing generation timestamp, and checked for new observer comments before calling an AI provider.
- Updated generation timestamps on success and added regression coverage for skipped redundant calls.

Archived track: `bug_summarization_efficiency` (commit `99ec4b6`).

## 2026-04-24

### Incident clustering fixes

- Expanded clustering from a fixed 10 km radius to a 25 km base, adding 50 km per hour of separation for sightings less than 24 hours apart, capped at 200 km.
- Merged every incident matched by a bridging sighting into the oldest incident, reassigned sightings, and recomputed dates and coordinate bounds. Updated reclustering and simulation scripts; verified the eight April 22 Cook’s Petrel incidents consolidated into one.

Archived track: `bug_clustering_logic_20260424` (commit `8352c14`).

## 2026-04-22

### Incident dates and histogram alignment

- Corrected alert date parsing and derived incident first/last seen dates from actual sighting dates, including out-of-order reports.
- Aligned daily histogram counts and tooltips with calendar dates and serialized API date fields as YYYY-MM-DD strings to avoid timezone shifts; added parser, incident, and dashboard regression coverage.

Archived track: `bug_incident_dates_histogram_20260422` (commit `7a6bf8e`).

## 2026-04-19

### Incident card redesign

- Replaced vertical incident cards with a horizontal photo slot and species/metadata layout, preserving rarity accents and action links.
- Added 21-day daily sighting counts to the incidents API and a rarity-colored histogram with date/count hover tooltips. Added photo placeholders and attribution overlays, component tests, and visual verification.

Archived track: `incident_card_redesign_20260419` (commit `9502a95`).

### Chase intel summarization

- Added stored incident summaries and generation timestamps, background summarization of recent observer comments through Groq or Gemini, conditional card display, and a backfill script.
- Tuned prompts to retain useful location and behavior information while ignoring content-free comments; isolated missing credentials and provider failures from ingestion.
- Removed the same-day regeneration guard so new data could update a summary, limited triggering to newly ingested email, and standardized Gemini response parsing.

Archived track: `chase_intel_summarization_20260416` (commit `0cfde84`).

## 2026-04-16

### Incident model and clustering

- Introduced incidents linked to sightings, normalized scientific names, cached sighting counts, first/last seen dates, geographic bounds, primary regions, and covered states.
- Implemented the original 10 km same-species clustering, open/closed/permanently closed lifecycle, five-day inactivity closure, and reopening within four months of the latest closure.
- Integrated clustering and lifecycle checks with ingestion and added a chronological historical-sighting migration without wiping data.

Archived track: `incident_clustering_20260413` (commit `dde2ec8`).

### Incident dashboard wiring

- Added GET /api/incidents for open incidents with ABA rarity codes, geographic centroids, region labels, active-day counts, and latest map/checklist links.
- Switched dashboard cards and map pins from individual sightings to incidents, added fallback map positions, and applied rarity and proximity filters to incident data.

Archived track: `incident_dashboard_wiring_20260416` (commit `dde2ec8`).

## 2026-04-12

### Rarity code filtering

- Added multi-select ABA code 1–6 controls, defaulting to codes 3–6 and requiring at least one selection. Applied the same selection to cards and map pins alongside proximity filtering.
- Added rarity-colored desktop toggles and the original compact mobile dropdown, with interaction tests and styling refinements.

Archived track: `rarity_code_filter_20260412` (commit `4241321`).

## 2026-04-10

### Enrichment and parser safety

- Replaced loose enrichment types with concrete eBird observation types and caught individual provider failures so remaining sightings continued processing.
- Replaced parser non-null assertions with explicit required-field checks and date validation, skipping malformed bird records with warnings instead of crashing. Added failure and malformed-input tests.

Archived track: `safety_type_fixes_20260410` (commit `7bd397e`).

## 2026-04-09

### Database-driven rarity colors

- Joined sightings with ABA rarity data in the API and replaced species-keyword color guesses with a shared frontend ABA-code color mapping and neutral fallback. Added lookup and rendering coverage.

Archived track: `rarity_color_20260408` (commit `33a0c1b`).

## 2026-04-07

### Startup email ingestion and backfill

- Added a manual email backfill from January 1, 2026, reusing Message-ID deduplication and configurable IMAP date searches.
- Integrated ingestion with backend startup, distinguished success, no-new-email, and IMAP-error outcomes, and exposed ingestion status and latest email date to the dashboard with failure indication and tests.

Archived track: `startup_email_ingestion_20260407` (commit `713076b`).

## 2026-04-06

### Automated email ingestion

- Added IMAP fetching of eBird alert email from the preceding 24 hours, including read messages, without moving, deleting, or marking source mail read.
- Persisted raw email and processing status in IncomingEmail, deduplicated by Message-ID, automatically parsed alerts into sightings, and added POST /api/ingest with mocked and integration coverage.

Archived track: `automated_email_ingestion_20260404` (commit `45e422d`).

## 2026-04-04

### ABA checklist integration

- Parsed and seeded the committed ABA checklist CSV into the original SQLite/Prisma database, storing all rarity codes 1–6 and exposing species-name rarity lookups with tests.

Archived track: `aba_checklist_integration_20260403` (commit `f48ec5a`).

### Project root quick start

- Added a root package.json with concurrently, npm start to launch frontend and backend together, and dependency-install/setup convenience scripts; verified startup, frontend/backend communication, and child-process shutdown.

Archived track: `root_quick_start_20260404` (commit `1ca58e0`).

## 2026-04-03

### eBird enrichment and geospatial dashboard

- Added an eBird API client, species/date/location matching, cached regional requests, and background enrichment with coordinates, checklist links, location identifiers, and observation metadata.
- Added a React-Leaflet dashboard map, a browser-geolocation Near Me filter within 50 km, and consecutive-day sighting streaks.
- Introduced the Field Journal interface with parchment backgrounds, rust/sage colors, serif typography, vertically stacked cards, and responsive layout.

Archived track: `ebird_enrichment_20260331` (commit `54997ee`).

## 2026-03-31

### Initial rarity dashboard

- Established the React/Vite frontend, Express/TypeScript backend, and original SQLite/Prisma sighting database.
- Implemented eBird alert email parsing and sighting storage, a dashboard list with sighting details and Discord links, and initial parser, persistence, and UI tests.

Archived track: `rarity_dashboard_20260325` (commit `8cc23e7`).
