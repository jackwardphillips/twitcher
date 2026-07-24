# Twitcher Project Audit

Last updated: 2026-07-24

## Purpose

This is the durable source of truth for the Twitcher cleanup audit. It records
findings before implementation work begins so that nothing is lost, fixed
silently, or converted into a story without review.

The audit is intentionally separate from `review.md`:

- `AUDIT.md` is the current, maintained cleanup register.
- `review.md` is an earlier code review whose claims and line references may be
  stale.
- `status.md` is a product-status document, although parts of it are currently
  inconsistent with the implementation.
- `conductor/archive/` contains historical records and is not treated as current
  project documentation.

## Status Vocabulary

- **Unreviewed**: Evidence was collected, but the finding has not been discussed.
- **Accepted**: We agree the finding should become cleanup work.
- **Needs investigation**: More evidence is required before deciding.
- **Deferred**: Valid finding, intentionally postponed.
- **Rejected**: Reviewed and determined not to require work.
- **Story drafted**: A bounded story exists with acceptance criteria.
- **Complete**: The approved work was implemented and verified.

## Audit Boundaries

Reviewed so far:

- Repository structure and committed-file inventory
- Root, backend, and frontend package manifests
- TypeScript, Vite, Vitest, and ESLint configuration
- Backend production build
- Frontend production build, lint, and test suite
- Production dependency advisories
- Current README, status, review, and operations documents
- Initial dead-code and script-usage scan
- Backend ingestion, poller, incident, enrichment, parser, location, photo,
  summarization, and statistics paths
- Active Prisma model constraints and indexes relevant to backend correctness
- PostgreSQL/SQLite schema shape parity and committed PostgreSQL migration coverage
- API trust boundaries and production dependency advisory reachability
- Every frontend production component and shared utility
- CI, Docker poller image, Compose, and committed operations configuration
- Current and historical documentation structure, registries, and instructions

Not yet fully reviewed:

- Built Docker image contents and behavior at runtime
- GitHub Actions behavior on hosted runners beyond static workflow review
- Production service health or provider configuration
- Database contents, query plans, or live indexes
- Secret-bearing environment files

No production service, database, container, volume, or environment file was
changed during the audit.

## Verification Baseline

| Check | Result | Notes |
|---|---|---|
| Repository state before audit | Clean | Branch `conductor/poller_image_config` |
| Backend production build | Passed | `tsc` completed successfully |
| Frontend production build | Passed | Vite emitted a large-chunk warning |
| Frontend tests | Passed | 15 files, 50 tests |
| Frontend lint | Passed | Production TypeScript/React rules and explicit test-file policy |
| Backend test type-check | Passed | Dedicated test configuration checks tests, support files, and mocks |
| Frontend production dependency audit | Passed | No known production vulnerabilities |
| Backend production dependency audit | Failed | 9 advisories: 3 high, 5 moderate, 1 low |
| Backend unit tests | Passed | 17 files, 49 tests; ran without database environment variables |
| Backend database tests | Not run locally | Requires an explicitly disposable PostgreSQL database; CI is configured to provide one |
| Container/service health | Not checked | No runtime changes were made |

## Proposed Story Map

These are grouping candidates, not approved implementation stories.

| ID | Proposed story | Status | Findings |
|---|---|---|---|
| S01 | Reconcile dead and duplicated code | Unreviewed | F001, F002 |
| S02 | Classify legacy and operator scripts | Unreviewed | F003 |
| S03 | Establish safe test tiers | Unreviewed | F004, F005, F006 |
| S04 | Establish lint and build quality gates | Complete | F007, F008 |
| S05 | Reconcile current documentation | Unreviewed | F009-F013 |
| S06 | Remediate dependency advisories | Unreviewed | F014-F016 |
| S07 | Reduce frontend bundle size | Unreviewed | F017 |
| S08 | Review API security boundaries | Unreviewed | F018 |
| S09 | Review concurrency and quota controls | Unreviewed | F019 |
| S10 | Review database access and indexing | Unreviewed | F020 |
| S11 | Verify deployment and poller configuration | Unreviewed | F021 |
| S12 | Redesign project documentation structure | Unreviewed | F022 |
| S13 | Classify code by runtime reachability | Unreviewed | F023 |
| S14 | Make backend test execution safe by construction | Complete | F004, F024 |
| S15 | Make test names reflect actual boundaries | Complete | F005 |
| S16 | Prevent network escape during tests | Complete | F026 |
| S17 | Type-check backend tests | Complete | F027 |
| S18 | Replace timing-based asynchronous tests | Unreviewed | F028 |
| S19 | Add complete CI quality gates | Complete | F029 |
| S20 | Establish meaningful coverage and assertion standards | Unreviewed | F006, F025, F030-F033 |
| S21 | Define a durable observation identity | Unreviewed | F034, F046 |
| S22 | Make email ingestion atomic and retry-safe | Unreviewed | F035, F036, F037 |
| S23 | Correct incident matching and concurrency | Unreviewed | F038, F039 |
| S24 | Define alert-target lifecycle and poller ownership | Unreviewed | F040, F047 |
| S25 | Bound external work and make enrichment resumable | Unreviewed | F041-F043 |
| S26 | Correct summary state transitions | Unreviewed | F044 |
| S27 | Harden parsing and probabilistic matching | Unreviewed | F045 |
| S28 | Add backend integrity and query indexes | Unreviewed | F046 |
| S29 | Authenticate and constrain operational APIs | Unreviewed | F048-F050 |
| S30 | Establish HTTP security and abuse controls | Unreviewed | F048, F051 |
| S31 | Remediate reachable dependency advisories | Unreviewed | F014, F052 |
| S32 | Define operational-data privacy and retention | Unreviewed | F049, F053 |
| S33 | Represent unknown rarity honestly | Unreviewed | F054 |
| S34 | Establish validated frontend API contracts | Unreviewed | F055, F059 |
| S35 | Repair responsive and accessible controls | Unreviewed | F031, F056, F057 |
| S36 | Make frontend requests race-safe and recoverable | Unreviewed | F055 |
| S37 | Reconcile dashboard and statistics semantics | Unreviewed | F058 |
| S38 | Consolidate frontend styling and remove dead CSS | Unreviewed | F060 |
| S39 | Establish routing and map degradation behavior | Unreviewed | F061, F062 |
| S40 | Make deployment topology reproducible | Unreviewed | F063, F068 |
| S41 | Define truthful health and poller monitoring | Unreviewed | F064, F070 |
| S42 | Harden and reproduce the poller image | Unreviewed | F065, F066 |
| S43 | Establish safe migration ownership | Unreviewed | F067 |
| S44 | Complete CI and supply-chain validation | Unreviewed | F029, F069 |
| S45 | Add graceful backend lifecycle handling | Unreviewed | F071 |
| S46 | Establish a canonical documentation architecture | Unreviewed | F022, F072 |
| S47 | Rewrite setup and operating documentation from verified workflows | Unreviewed | F073, F074 |
| S48 | Reconcile or retire Conductor living-state documents | Unreviewed | F075, F076 |
| S49 | Consolidate agent and contributor instructions | Unreviewed | F077 |
| S50 | Establish changelog and decision records | Unreviewed | F078, F080 |
| S51 | Preserve history without presenting it as current guidance | Unreviewed | F079 |
| S52 | Isolate or retire the SQLite compatibility mode | Unreviewed | F073, F081 |

## Findings

### F001 — Dead streak service and misleading tests

- **Status:** Unreviewed
- **Area:** Backend / tests
- **Evidence:** `backend/src/lib/streak-service.ts` is imported by its test but not
  by production code. `/api/sightings` implements separate streak logic directly
  in `backend/src/index.ts`.
- **Impact:** The dedicated service tests do not protect the code serving the API.
  Two implementations can drift and create false confidence.
- **Decision needed:** Compare the algorithms, then either make production use the
  service or remove the unused service and test.

### F002 — Unused root dependency

- **Status:** Complete
- **Area:** Dependencies
- **Evidence:** The root package declares `cors`, while the only source import is
  in the backend package, which already declares its own `cors` dependency.
- **Impact:** Minor install and ownership ambiguity.
- **Candidate action:** Remove the root declaration after confirming no external
  root-level workflow expects it.
- **Resolution:** Removed the root `cors` declaration and its root lockfile
  entries. The backend retains its own direct `cors` dependency, which is the
  package that imports it.

### F003 — Unclassified one-off and data-mutating scripts

- **Status:** Unreviewed
- **Area:** Backend operations
- **Evidence:** `backend/src/scripts/` includes investigation, simulation,
  migration, reclustering, verification, and reset scripts. Several are not
  exposed through package scripts.
- **Impact:** Operators cannot easily distinguish supported tools from historical
  diagnostics. Some scripts can mutate production data if invoked with the wrong
  environment.
- **Candidate action:** Inventory each script as supported, dangerous/manual,
  historical, or removable. Document prerequisites and mutation behavior.

### F004 — Backend tests require a destructive shared setup

- **Status:** Complete
- **Area:** Test safety
- **Evidence:** `backend/test-setup.js` requires `TEST_DATABASE_URL`, maps it to
  `DATABASE_URL`, and starts Vitest. Global test setup calls database cleanup
  before every test. The cleanup issues broad `deleteMany()` calls across alert
  targets, poll runs, API logs, enrichment attempts, ingestion attempts,
  sightings, incidents, emails, ingestion runs, and cached photos.
- **Impact:** The guard prevents accidental execution without a URL, but a wrongly
  configured URL could still target valuable data. All 155 backend tests inherit
  this behavior, including tests whose application dependencies are completely
  mocked.
- **Candidate action:** Add stronger disposable-database validation and separate
  database integration tests from database-free unit tests.
- **Resolution:** Backend tests now have explicit database-free and
  database-backed tiers. The unit tier has no database setup or cleanup. The
  database tier retains cleanup behind a guarded setup and runner. Bare
  `npx vitest` defaults to the database-free tier.
- **Verification:** The database-free tier passed 17 files and 47 tests with
  `DATABASE_URL`, `TEST_DATABASE_URL`, and the destructive-test acknowledgement
  unset. The backend production build also passed.

### F005 — Backend test categories are mixed

- **Status:** Complete
- **Area:** Tests
- **Evidence:** Files named `.test.ts`, `.integration.test.ts`, `.concurrency.test.ts`,
  `.repro.test.ts`, schema checks, and API tests run under one Vitest configuration.
- **Additional evidence:** `backend/src/lib/integration.test.ts` mocks IMAP,
  sighting persistence, and the entire database module. It verifies mock
  interactions rather than an integrated system. `db-failure.integration.test.ts`
  uses a real Prisma client but replaces selected methods with spies. The frontend
  `smoke.test.tsx` calls itself an E2E test while running in JSDOM with mocked
  `fetch` and MapLibre.
- **Impact:** Fast checks cannot run independently, and test names do not define
  setup or safety boundaries. “Integration” and “E2E” labels overstate the
  confidence those tests provide.
- **Candidate action:** Define explicit unit and integration projects/scripts with
  separate setup, and rename tests according to what crosses a real boundary.
- **Resolution:** Backend tests now run in explicit database-free and
  database-backed tiers with separate setup. The mock-only backend
  `integration.test.ts` was renamed to
  `ingestion-orchestration.unit.test.ts` and describes its mocked boundaries.
  The frontend JSDOM `smoke.test.tsx` was renamed to
  `dashboard.component.test.tsx` and no longer calls itself E2E. Existing tests
  that cross a real database or HTTP-mocking boundary retain their integration
  labels. Assertion fidelity remains separate under F025/S20.
- **Verification:** The renamed backend unit tier passed 17 files and 47 tests;
  the complete frontend suite passed 15 files and 50 tests.

### F006 — Stale suppressions and comments in schema tests

- **Status:** Complete
- **Area:** Tests
- **Evidence:** `schema-check.test.ts` and `incident-summary-fields.test.ts` contain
  TypeScript suppressions and comments describing generated Prisma fields as
  hypothetical even though those fields exist.
- **Impact:** Suppressions can conceal real type drift; comments misdescribe the
  current schema.
- **Candidate action:** Determine whether these tests still catch migration
  mistakes, then strengthen or remove them. Generated-client enum assertions do
  not prove that a deployed database has received the corresponding migration.
- **Resolution:** Removed stale suppressions and comments that described current
  Prisma fields as hypothetical. The tests remain generated-client shape checks;
  they intentionally do not claim to verify deployed migration state.
- **Verification:** The schema tests pass in the database-free tier and compile
  under the backend test TypeScript configuration.

### F007 — Frontend lint is configured but not part of package workflows

- **Status:** Complete
- **Area:** Tooling
- **Evidence:** `frontend/eslint.config.js` exists, but `frontend/package.json` has
  no lint script and the root has no lint command.
- **Impact:** Routine verification can pass while lint errors accumulate.
- **Candidate action:** Agree on lint scope and policy, fix the accepted baseline,
  then add scripts and CI enforcement.
- **Resolution:** Added frontend and root lint scripts. The repository validation
  workflow runs frontend lint on pushes and pull requests.

### F008 — Current lint baseline contains 21 errors

- **Status:** Complete
- **Area:** Frontend / tests
- **Evidence:** ESLint reports 21 errors: test mock `any` casts, synchronous state
  updates in effects, and an impure `Date.now()` call during render.
- **Impact:** The production findings may indicate unnecessary renders or unstable
  output. Test-only type findings may be either useful cleanup or excessive noise.
- **Decision needed:** Review production findings individually and decide whether
  test files should follow the same `no-explicit-any` policy.
- **Resolution:** Test files may use explicit `any` for framework mocks; production
  files retain the stricter rule. The render-time clock was captured once per
  dashboard mount, map height reset moved to the user action, and the tooltip
  measurement and request-loading effects received narrow documented suppressions
  because their state changes are intrinsic to those effects.
- **Verification:** Frontend lint, all 50 frontend tests, and the production build
  pass. The existing large-chunk build warning remains tracked under F017.

### F009 — README names the wrong map stack

- **Status:** Unreviewed
- **Area:** Documentation
- **Evidence:** README lists Leaflet and React-Leaflet. The frontend depends on and
  imports MapLibre GL JS; Leaflet packages are absent.
- **Impact:** Setup and architecture documentation is misleading.

### F010 — Product status marks implemented photo work as unfinished

- **Status:** Unreviewed
- **Area:** Documentation
- **Evidence:** `status.md` lists iNaturalist photo integration as incomplete, while
  the backend photo service, cache model, API response, frontend component, and
  tests exist. Conductor also records the track as completed.
- **Impact:** Roadmap decisions may duplicate shipped work.

### F011 — Product status marks implemented map migration as unfinished

- **Status:** Unreviewed
- **Area:** Documentation
- **Evidence:** `status.md` says Leaflet still needs replacement. The current map
  uses MapLibre and rarity-colored markers.
- **Impact:** Current capabilities and remaining map work are conflated.

### F012 — Known-bug and housekeeping entries are stale

- **Status:** Unreviewed
- **Area:** Documentation
- **Evidence:** `status.md` says TypeScript reports configuration files outside
  `rootDir`; the current backend build passes and those files are excluded. It also
  calls `frontend/src/index.css` mostly Vite starter styling, but the file no longer
  matches that description.
- **Impact:** Engineers may spend time fixing already-resolved issues.

### F013 — Earlier review is not maintained as a current defect list

- **Status:** Unreviewed
- **Area:** Documentation / engineering process
- **Evidence:** `review.md` contains useful findings but stale line numbers and some
  claims contradicted by later tests and implementation work.
- **Impact:** Valid unresolved risks and completed work are difficult to distinguish.
- **Candidate action:** Preserve it as a dated artifact and migrate unresolved,
  revalidated findings into this audit or dedicated stories.

### F014 — Backend production dependency advisories

- **Status:** Unreviewed
- **Area:** Dependencies / security
- **Evidence:** `npm audit --omit=dev` reports nine advisories: three high, five
  moderate, and one low.
- **Impact:** The production-relevant chain includes `imapflow` through
  `nodemailer`; other findings involve Express transitive dependencies and Prisma
  tooling.
- **Candidate action:** Capture the exact dependency update diff, determine which
  advisories are reachable, run the full backend suite against a disposable
  database, and deploy separately from unrelated cleanup.

### F015 — Frontend install reports development dependency advisories

- **Status:** Unreviewed
- **Area:** Dependencies
- **Evidence:** `npm ci` reports six total advisories, but
  `npm audit --omit=dev` reports no production advisories.
- **Impact:** Tooling risk exists, but there is no demonstrated frontend runtime
  exposure.
- **Candidate action:** Review development dependency updates without presenting
  them as a production emergency.

### F016 — Potentially unused backend development dependencies

- **Status:** Unreviewed
- **Area:** Dependencies
- **Evidence:** `nodemon` and `ts-node` are declared, but package scripts use `tsx`
  and no committed source import references them.
- **Impact:** Additional dependency and advisory surface.
- **Decision needed:** Confirm no external operator workflow invokes them before
  removal.

### F017 — Large frontend production chunk

- **Status:** Unreviewed
- **Area:** Frontend performance
- **Evidence:** Production build emits a roughly 1.25 MB minified JavaScript chunk,
  approximately 343 KB gzip, exceeding Vite's 500 KB warning threshold.
- **Impact:** Increased initial download, parse, and execution cost.
- **Candidate action:** Measure composition first. MapLibre is a likely contributor;
  route- or component-level lazy loading may be enough.

### F018 — Ingestion endpoint security requires revalidation

- **Status:** Unreviewed
- **Area:** API security
- **Evidence:** Earlier review material identifies manual ingestion as an exposed,
  quota-consuming operation. Current routes include both `POST /api/ingest` and a
  non-mutating `GET /api/ingest` method response.
- **Impact:** If the POST route remains publicly reachable without a trusted caller
  boundary, it can trigger IMAP, database, and provider work.
- **Next audit step:** Revalidate current authentication, deployment exposure,
  rate-limiting, and cron design before drafting a fix.

### F019 — Background task concurrency and quota risks need revalidation

- **Status:** Unreviewed
- **Area:** Reliability
- **Evidence:** `review.md` and `docs/ops/quota-safety.md` describe summarization,
  photo, enrichment, and ingestion fan-out risks. Later tests suggest some locking
  work may already exist.
- **Impact:** Stale findings could either hide remaining quota risks or cause
  duplicate remediation.
- **Next audit step:** Trace current locks, request coalescing, timeouts, retry
  bounds, and failure isolation before creating stories.

### F020 — Query and indexing findings need schema-level verification

- **Status:** Unreviewed
- **Area:** Database performance
- **Evidence:** Earlier documents identify broad incident loads, ingestion retry
  scans, and missing indexes. Newer PostgreSQL migrations may have addressed part
  of this.
- **Impact:** Treating the earlier SQLite-era review as current could produce
  unnecessary or incorrect migrations.
- **Next audit step:** Compare active Prisma schema, PostgreSQL migrations, and
  current query shapes. Live query plans are out of scope without explicit access.

### F021 — Deployment and poller configuration are only partially audited

- **Status:** Unreviewed
- **Area:** Operations
- **Evidence:** The repository contains a poller Dockerfile, Compose file, and a
  poller-image GitHub workflow. They have not yet been built or exercised.
- **Impact:** Documentation and configuration may disagree in ways static package
  checks do not reveal.
- **Next audit step:** Review image pinning, health checks, secret handling,
  migration behavior, restart policy, and workflow reproducibility. Runtime
  verification must preserve volumes and avoid service disruption.

### F022 — Documentation has overlapping sources of truth

- **Status:** Unreviewed
- **Area:** Documentation architecture
- **Evidence:** Current guidance and history are spread across README, `status.md`,
  `review.md`, `docs/ops/`, `references/`, `conductor/`, `GEMINI.md`, `AGENTS.md`,
  and `souls/`.
- **Impact:** Readers cannot reliably tell current operational guidance, product
  roadmap, audit findings, historical design context, and agent instructions apart.
- **Candidate action:** Design the documentation structure as its own story before
  moving or deleting documents.

### F023 — Most application code is reachable; a small backend tail is uncertain

- **Status:** Unreviewed
- **Area:** Code usage / maintainability
- **Method:** Static traversal of relative TypeScript imports, excluding tests.
  Backend reachability was measured first from `backend/src/index.ts`, then from
  that server entry plus every `tsx src/scripts/*.ts` entry declared in
  `backend/package.json`. Frontend reachability was measured from
  `frontend/src/main.tsx`.
- **Results:**
  - Frontend runtime: 14 of 14 files and 1,632 of 1,632 lines reachable.
  - Backend server runtime: 19 of 51 files and 4,162 of 6,009 lines reachable.
  - Backend server plus declared scripts: 38 of 51 files and 5,353 of 6,009 lines
    reachable.
  - Remaining backend candidates: 13 files and 656 lines, about 11% of the
    non-test backend source by line count.
- **Interpretation:** The repository looks messier than the live code graph
  actually is. Tests and scripts dominate the file count: backend tests contain
  approximately 6,606 lines, compared with 3,807 production library lines and
  1,658 script lines.
- **Likely test-only libraries:**
  - `backend/src/lib/rarity-service.ts`
  - `backend/src/lib/streak-service.ts`
- **Read-only standalone diagnostics not declared in package workflows:**
  - `backend/src/scripts/check-rarity-service.ts`
  - `backend/src/scripts/check-seeding.ts`
  - `backend/src/scripts/investigate-cooks-petrel.ts`
  - `backend/src/scripts/investigate-tufted-duck.ts`
  - `backend/src/scripts/simulate-clustering.ts`
  - `backend/src/scripts/simulate-species.ts`
  - `backend/src/scripts/simulate-tufted-duck.ts`
- **Data-mutating standalone utilities not declared in package workflows:**
  - `backend/src/scripts/migrate-incidents.ts` assigns sightings to incidents
    using the current clustering services.
  - `backend/src/scripts/recluster-sightings.ts` clears sighting incident
    assignments and deletes all incidents before rebuilding them.
  - `backend/src/scripts/reset-emails.ts` resets every incoming email to `new`.
  - `backend/src/scripts/verify-ingestion.ts`
    deletes all sightings in the configured database before inserting sample
    data and running enrichment.
- **Caveat:** Static reachability cannot prove that standalone scripts are unused;
  they may be manually invoked by operators. None of these scripts is referenced
  by the current README, operations docs, package scripts, or GitHub workflow.
  Most originated during April 2026 feature or bug-investigation work. Each still
  needs an ownership/history decision before removal.
- **Candidate action:** Treat the two test-only libraries separately from the
  standalone scripts. Quarantine or add explicit safety guards to undocumented
  mutating scripts before deciding whether to retain them. For read-only scripts,
  establish ownership and operational status before deciding to document,
  archive, expose through package scripts, or remove.

### F024 — Test database safety relies only on an environment variable name

- **Status:** Complete
- **Area:** Test safety
- **Evidence:** The runner checks that `TEST_DATABASE_URL` exists, but does not
  validate the host, database name, role, schema, or an explicit destructive-test
  acknowledgement. It then copies that value to `DATABASE_URL`. Cleanup begins
  automatically in global setup.
- **Impact:** A production or shared database URL placed in the wrong environment
  variable would be accepted and cleared.
- **Candidate action:** Require multiple independent safety properties, such as a
  test-only database name/role convention plus an explicit destructive-test flag.
  CI should create an ephemeral database. Local unit tests should not connect to
  PostgreSQL at all.
- **Resolution:** Database-backed tests now require a PostgreSQL
  `TEST_DATABASE_URL`, database and role names ending in `_test`, and
  `ALLOW_TEST_DATABASE_RESET=1`. Before Prisma generation and again before test
  cleanup, the guard verifies that the connected database and role match the URL.
  `DATABASE_URL` must exactly match the guarded `TEST_DATABASE_URL`, and guard
  errors redact credentials. CI supplies the acknowledgement to its existing
  ephemeral `twitcher_test` PostgreSQL service.
- **Verification:** Automated database-free guard tests cover accepted CI-style
  input, missing or incorrect acknowledgement, malformed and non-PostgreSQL
  URLs, unsafe database and role names, connected-identity mismatches, credential
  redaction, and tier-manifest integrity. Invoking the database tier without
  `TEST_DATABASE_URL` failed before Prisma generation or cleanup. The full
  database-backed suite was not run locally because no disposable PostgreSQL
  target was supplied; hosted CI execution remains the outstanding runtime
  confirmation.

### F025 — Several tests validate mocks or implementation calls, not outcomes

- **Status:** Unreviewed
- **Area:** Test fidelity
- **Evidence:** Mock-heavy tests frequently assert exact Prisma call objects or
  that one mocked service called another mocked service. The file named
  `integration.test.ts` is the clearest example: both persistence and downstream
  sighting saving are replaced, so it cannot detect schema, transaction, or
  persistence failures.
- **Impact:** Refactors can break tests without breaking behavior, while incorrect
  mock models can let broken production integrations pass.
- **Candidate action:** Keep narrow interaction tests only where the interaction is
  itself the contract. Prefer observable results for service tests and a small
  number of real database integration paths.

### F026 — Backend tests allow accidental real network requests

- **Status:** Complete
- **Area:** Test isolation / safety
- **Evidence:** Global MSW setup uses `onUnhandledRequest: 'bypass'`, and the
  default handler list is empty.
- **Impact:** A missing mock can contact eBird, iNaturalist, Groq, Gemini, or another
  network target during tests. That creates nondeterminism, leaks test inputs, and
  can consume real quota if credentials are present.
- **Candidate action:** Fail on unhandled requests. Opt specific tests into explicit
  mock handlers; keep any true live-provider tests separate and disabled by
  default.
- **Resolution:** Both database-free and database-backed backend MSW setup now
  permits intentional loopback requests to temporary application servers but
  rejects unhandled external requests. Provider-facing concurrency tests use
  explicit MSW handlers instead of global fetch replacement. No test is opted
  into live provider access.
- **Verification:** All 49 database-free backend tests passed, including policy
  checks for loopback and unknown external targets. CI's database-backed run
  exposed the original over-broad policy; the corrected policy remains pending
  its next hosted run against ephemeral PostgreSQL.

### F027 — Backend tests are not TypeScript-checked

- **Status:** Complete
- **Area:** Test quality
- **Evidence:** Backend `tsconfig.json` excludes all test and test-support files.
  Vitest transpiles TypeScript without performing a complete type check. Tests use
  many `any` casts and stale `@ts-ignore` / `@ts-expect-error` directives.
- **Impact:** Test doubles can drift away from production interfaces without a
  compile failure, weakening the suite precisely where mock fidelity matters.
- **Candidate action:** Add a test-specific TypeScript configuration and reduce
  broad `any`-based mocks in high-value services.
- **Resolution:** Added a dedicated backend test TypeScript configuration and
  package command. It checks all backend tests, shared test setup, tier manifests,
  and Vitest configuration. Stale suppressions, unsafe array access, and
  Prisma-spy return-type drift found by the initial run were corrected.
- **Verification:** `npm run typecheck:test` passes.

### F028 — Concurrency and background tests rely on wall-clock sleeps

- **Status:** Unreviewed
- **Area:** Test determinism
- **Evidence:** Multiple tests use 50–500 ms `setTimeout` delays to force overlap or
  wait for fire-and-forget work. Photo API tests wait a fixed 500 ms for cache
  writes; concurrency tests use sleeps to arrange races.
- **Impact:** Tests can be slow or flaky under CI load and may pass without proving
  the intended ordering.
- **Candidate action:** Expose completion promises or inject explicit barriers and
  controllable schedulers. Assert that overlap occurred rather than assuming a
  delay caused it.

### F029 — CI validates only the backend poller path

- **Status:** Complete
- **Area:** Continuous integration
- **Evidence:** The only committed workflow is `poller-image.yml`. It provisions
  PostgreSQL, runs backend tests and build, then builds the poller image. Its path
  filters exclude root and frontend source changes. No workflow runs frontend
  tests, frontend build, frontend lint, root scripts, or documentation checks.
- **Impact:** Frontend regressions can merge without any automated validation.
  Root package and documentation drift are also invisible to CI.
- **Candidate action:** Separate general repository validation from poller image
  publication. Run frontend tests/build and agreed lint/type checks on relevant
  changes.
- **Resolution:** Added a general repository validation workflow for pushes, pull
  requests, and manual runs. Its backend job runs dependency installation,
  database-free tests, test type-checking, and the production build. Its frontend
  job runs dependency installation, lint, tests, and the production build.
  Database-backed tests remain in the separate poller workflow where PostgreSQL is
  ephemeral and guarded.
- **Verification:** Every configured command passes locally. Hosted-runner
  execution remains to be observed after the workflow is pushed; action SHA
  pinning and broader supply-chain validation remain under F069/S44.

### F030 — Coverage configuration reports data but enforces nothing

- **Status:** Unreviewed
- **Area:** Test completeness
- **Evidence:** Backend Vitest defines coverage reporters but no include policy,
  exclusions tailored to the project, or thresholds. Normal test and CI commands
  do not request coverage. Frontend has the coverage package but no coverage
  configuration or CI step.
- **Impact:** The presence of coverage tooling creates no regression protection and
  gives no visibility into untested production paths.
- **Candidate action:** First capture a trustworthy baseline by unit/integration
  tier. Add thresholds only for code where coverage correlates with useful
  behavior; do not reward tests that merely execute lines.

### F031 — A known mobile UI defect has a misleading passing test

- **Status:** Unreviewed
- **Area:** Frontend tests
- **Evidence:** `status.md` says the mobile rarity filter is fragile because its
  custom dropdown is hover-driven. Its tests only resize JSDOM, confirm that the
  list markup exists, and directly click an option button. They do not open or
  close the trigger, emulate touch, test keyboard navigation, manage focus, or
  verify outside-click/Escape behavior. The component renders the menu in the DOM
  unconditionally.
- **Impact:** The test suite passes while the documented user-facing defect remains.
- **Candidate action:** Define the intended interaction contract, implement it with
  accessible semantics, and test actual user interactions rather than hidden DOM
  presence.

### F032 — Test volume is inflated by embedded fixtures and overlapping suites

- **Status:** Unreviewed
- **Area:** Test maintainability
- **Evidence:** Backend tests total approximately 6,606 lines for 155 tests.
  `aba-parser.test.ts` alone is about 1,365 lines but contains one test and a very
  large inline CSV fixture. Dashboard behavior is spread across several
  overlapping frontend files. Summarization behavior is split across general,
  bug, efficiency, and failure suites with repeated mock construction.
- **Impact:** File and line volume make the suite look more comprehensive while
  increasing review cost and allowing contradictory assumptions to accumulate.
- **Candidate action:** Move large inputs to named fixtures, consolidate behavior
  matrices, and preserve regression intent in test names rather than keeping
  “research” and “bug fix” suites indefinitely.

### F033 — Accessibility and browser-level behavior are largely untested

- **Status:** Unreviewed
- **Area:** Frontend tests
- **Evidence:** No automated accessibility scan or browser test is configured.
  Existing tests use JSDOM and a simplified global MapLibre mock. Hover tooltips
  are tested with mouse events, but keyboard/focus behavior is not. Navigation,
  layout, CSS visibility, map rendering, and touch interaction are not exercised
  in a real browser.
- **Impact:** Passing component tests cannot detect focus traps, inaccessible
  custom controls, responsive CSS failures, real MapLibre integration failures,
  or browser-only runtime issues.
- **Candidate action:** Add a very small browser smoke/accessibility tier after
  stabilizing unit and integration boundaries.

### F034 — Checklist IDs are incorrectly treated as sighting identities

- **Status:** Unreviewed
- **Area:** Backend / data integrity
- **Evidence:** Poller promotion deduplicates `Sighting` records using only eBird
  `subId`. A `subId` identifies a checklist, not a species observation. One
  checklist can contain several tracked species, so the first promoted species
  suppresses the others. Lifecycle updates likewise call `updateMany({ where:
  { subId } })`, allowing one target species becoming missing or restored to
  change every sighting from that checklist.
- **Additional evidence:** `AlertTargetObservation` correctly scopes its unique
  key to `[alertTargetId, subId]`, but `Sighting` has neither a corresponding
  composite identity nor a unique constraint. The in-memory deduplication set is
  also not updated after each insert, so repeated observations in one API response
  can be inserted twice.
- **Impact:** Valid rare-bird sightings can disappear, and unrelated species can
  be marked missing or removed. This is a direct correctness fault in the new
  poller path.
- **Candidate action:** Define the domain identity before changing code—likely a
  checklist plus species identifier, with location/date considerations documented.
  Backfill and merge policy must be explicit because existing rows may already be
  conflated.

### F035 — Email ingestion is neither atomic nor retry-idempotent

- **Status:** Unreviewed
- **Area:** Backend / data integrity
- **Evidence:** Target upserts, individual sighting inserts, incident
  creation/attachment, email status, and attempt status are separate writes.
  `saveSightings` inserts records one at a time. If a later write fails, earlier
  sightings and incidents remain, the email is marked failed, and retrying inserts
  them again because parsed email sightings have no source-email relation or
  uniqueness key.
- **Additional evidence:** `createIncident` creates an incident and then updates
  the sighting without a transaction, so attachment failure can leave an empty
  incident. Poll-target observation writes, lifecycle updates, target timestamps,
  sighting promotion, and incident attachment are similarly non-atomic.
- **Impact:** Ordinary partial failures can produce duplicate sightings, empty or
  duplicate incidents, misleading timestamps, and permanently half-applied
  ingestion.
- **Candidate action:** Separate durable ingestion stages and give each an
  idempotency key. Use transactions for locally atomic database state changes;
  do not hold transactions across provider calls.

### F036 — Ingestion success and metrics conceal partial failure

- **Status:** Unreviewed
- **Area:** Backend / observability
- **Evidence:** After processing the email loop, ingestion always returns
  `status: 'success'` even when `failed > 0`. The poller only rejects
  `imap_error` and `error`, so an all-email parse failure can proceed as a
  successful ingestion phase. `sightingsAdded` is computed from global table
  counts before and after the run and can include concurrent writers. Failure to
  finish the run record is swallowed, potentially leaving a run marked `running`.
- **Impact:** Schedulers, health checks, and operators cannot reliably distinguish
  success from partial or total per-email failure, and reported counts may not
  belong to the run.
- **Candidate action:** Add an explicit partial-failure result and derive counters
  from owned writes, not table deltas. Make run-finalization failure visible and
  recoverable.

### F037 — Missing IMAP Message-ID collapses unrelated emails

- **Status:** Unreviewed
- **Area:** Backend / ingestion identity
- **Evidence:** The IMAP adapter substitutes the literal string `unknown` when an
  envelope has no Message-ID. `IncomingEmail.messageId` is unique, so all such
  messages share one identity and later messages are skipped or treated as the
  first message.
- **Impact:** Entire alerts can be silently lost.
- **Candidate action:** Construct a deterministic fallback fingerprint from stable
  message attributes and raw content, retaining whether the provider ID was
  absent. Include collision tests.

### F038 — Incident matching contradicts its contract and has no age limit

- **Status:** Unreviewed
- **Area:** Backend / clustering correctness
- **Evidence:** The service comment specifies `25km + 50km/hour`, capped at
  200km within 24 hours. The code uses `25km + 10km/hour`, capped at 50km.
  More importantly, reports more than 24 hours apart still match within 25km with
  no maximum age. Matching includes both `OPEN` and `CLOSED` incidents and uses
  absolute time difference.
- **Impact:** A recurring species at the same site can be merged into and reopen
  the same incident indefinitely; future-dated or out-of-order records can also
  match unexpectedly. Poller ingestion does not run inactive-incident closing,
  increasing stale-state exposure.
- **Decision needed:** Define the biological/product rule for temporal continuity,
  travel radius, late observations, and reopening before modifying the algorithm.

### F039 — Process-local locks do not protect multi-process deployments

- **Status:** Unreviewed
- **Area:** Backend / concurrency
- **Evidence:** Ingestion and summarization use module-level booleans. Photo request
  coalescing uses a process-local map. Concurrent `findMatchingIncident` followed
  by `createIncident` is not serialized. Email claiming narrows one race but does
  not make downstream processing atomic.
- **Impact:** Multiple replicas, overlapping cron invocations, or the web process
  and poller can duplicate provider work and create competing incidents.
- **Candidate action:** First document the intended number of writers. Where
  single-writer operation cannot be guaranteed, use database-backed leases,
  advisory locks, or constraint-driven idempotency with bounded retry.

### F040 — Alert targets are activated but never retired

- **Status:** Unreviewed
- **Area:** Backend / poller lifecycle
- **Evidence:** Summary ingestion upserts every observed target to `active` and
  updates its last-seen timestamp. No production path marks targets inactive when
  they disappear from later alert summaries. Active-target polling has no service
  limit, so the set can only grow.
- **Impact:** The poller can spend increasing quota on obsolete species/region
  combinations and continue changing lifecycle state for targets no longer
  requested by alerts.
- **Decision needed:** Define whether absence from one summary retires a target,
  whether alerts are complete snapshots, and what grace period is safe.

### F041 — Invalid provider dates are silently replaced with the current time

- **Status:** Unreviewed
- **Area:** Backend / data integrity
- **Evidence:** Poller observation date parsing returns `new Date()` when `obsDt`
  is invalid. IMAP messages without an envelope date also receive the current
  time.
- **Impact:** Malformed inputs appear valid and current, which can create or merge
  the wrong incident and corrupt lifecycle/statistical history.
- **Candidate action:** Reject or quarantine invalid dates with diagnostic context;
  represent missing transport metadata separately from observation time.

### F042 — External requests and IMAP cleanup are not reliably bounded

- **Status:** Unreviewed
- **Area:** Backend / reliability
- **Evidence:** eBird, iNaturalist, Nominatim, Groq, and Gemini requests have no
  abort timeout. Retry logic cannot help a request that never settles. IMAP logout
  occurs only on the happy path after fetching; connection, lock, or iteration
  errors skip logout. No explicit IMAP connection/command timeout is configured.
- **Additional evidence:** Reverse-geocode failures, including transient ones, are
  cached as permanent misses for the lifetime of the process. Location resolution
  serially rate-limits calls but has no bounded queue.
- **Impact:** One hung provider can stall ingestion or summarization indefinitely,
  leak an IMAP session, and block later scheduled work.
- **Candidate action:** Set provider-specific deadlines, put IMAP cleanup in
  `finally`, distinguish retryable from permanent failures, and record bounded
  retry/backoff policy.

### F043 — “Background” enrichment blocks ingestion and repeats known misses

- **Status:** Unreviewed
- **Area:** Backend / enrichment
- **Evidence:** After each saved batch, the service synchronously loads every
  sighting from the last three days whose `subId` is null and awaits enrichment.
  The query is unbounded. A no-match result leaves `subId` null, so the same
  sightings are selected and sent through provider matching on every later run.
- **Impact:** Ingestion latency and provider cost grow with recent unmatched data;
  recurring misses can dominate quota. The “background” comments misstate runtime
  behavior.
- **Candidate action:** Persist enrichment state (`pending`, `matched`,
  `no_match`, retryable failure) and process bounded batches through a separately
  observable worker or explicitly synchronous stage.

### F044 — Empty model output advances the summary timestamp but preserves stale text

- **Status:** Unreviewed
- **Area:** Backend / summarization correctness
- **Evidence:** An empty provider response is considered successful. The update
  writes `geminiSummary: summary || incident.geminiSummary` while always advancing
  `summaryGeneratedAt`.
- **Impact:** The incident appears freshly summarized while displaying old content,
  and the freshness filter can suppress a needed retry.
- **Candidate action:** Treat blank output as failure or intentionally clear the
  summary; never advance freshness metadata without the corresponding state.

### F045 — Parser and enrichment matching rely on permissive heuristics

- **Status:** Unreviewed
- **Area:** Backend / parsing and matching
- **Evidence:** Both email parsers implement a hand-written quoted-printable
  decoder over the entire raw message rather than parsing MIME parts and declared
  charsets. The decoder converts every resulting character through an 8-bit byte
  array, which can corrupt already-decoded Unicode. Species matching removes
  generic words, alphabetically reorders tokens, and accepts substring matches;
  it can reduce distinct names to ambiguous forms. If no candidate is within
  72 hours it still scores all species matches before ultimately rejecting the
  best, and there is no minimum location score.
- **Impact:** Format or encoding changes can silently yield zero/incorrect records,
  while enrichment can attach the wrong eBird checklist when species names
  normalize ambiguously.
- **Candidate action:** Parse MIME with a maintained library and store parse
  anomalies. Define conservative match thresholds and diagnostic fixtures for
  ambiguous species, dates, locations, and Unicode.

### F046 — Database constraints and indexes do not support current integrity rules

- **Status:** Unreviewed
- **Area:** Backend / database
- **Evidence:** `Sighting` has no unique observation identity and only status/removal
  indexes; hot queries filter by `subId`, date, incident, and enrichment state.
  `Incident` matching filters by scientific name and status and closing filters by
  status/last-seen, but the active PostgreSQL schema has no corresponding incident
  indexes.
- **Impact:** Application-level deduplication remains race-prone and broad scans
  worsen as data grows.
- **Candidate action:** Design identity and retention semantics first, inspect
  existing duplicates, then add constraints/indexes through a separately reviewed
  migration. Validate with query plans against representative data.

### F047 — Poller ingestion consumes emails without writing their parsed sightings

- **Status:** Unreviewed
- **Area:** Backend / ingestion ownership
- **Evidence:** The poller calls ingestion with `writeParsedSightings: false`, but
  the ingestion service still marks each email `processed`. A later full ingestion
  skips that email, so its detailed email observations can never be written by the
  normal parser. The poller instead relies on target summaries and current eBird
  API results, which are not necessarily equivalent historical data.
- **Impact:** Which process sees an email first changes the persisted dataset.
  Alerts can be irreversibly reduced to target metadata and API-window results.
- **Decision needed:** Decide whether email detail or poller observations are the
  authoritative sighting source. If both are intentional, track their stages
  independently rather than overloading one processed flag.

### F048 — Public unauthenticated routes can trigger ingestion

- **Status:** Unreviewed
- **Area:** Backend / security
- **Evidence:** Both `POST /api/ingest` and `GET /api/ingest` invoke IMAP,
  database, eBird enrichment, photo-related downstream behavior, and
  summarization without authentication or a caller secret. CORS is the only
  apparent request-origin control, but CORS is a browser policy rather than
  authentication; non-browser callers can omit `Origin`, and the middleware
  explicitly permits originless requests.
- **Additional evidence:** The GET route performs a state-changing operation and
  immediately returns 202, making it triggerable by link scanners, prefetchers,
  monitoring tools, and cross-site mechanisms that do not require reading the
  response.
- **Impact:** Anyone who can reach the service can consume provider quota, cause
  database work, and repeatedly start expensive processing. The process-local
  lock limits overlap in one instance but is not an abuse control.
- **Candidate action:** Remove mutation from GET, authenticate scheduler/manual
  callers, and apply database-backed single-flight plus request-rate policy. Keep
  CORS as a browser compatibility control, not the trust boundary.

### F049 — Operational diagnostics are publicly readable

- **Status:** Unreviewed
- **Area:** Backend / privacy and operations
- **Evidence:** `/api/ops/enrichment-summary`,
  `/api/ops/ingestion-runs/:id/logs`, `/api/ops/enrichment-logs`, and
  `/api/ops/ebird-api-calls` have no authentication. Responses include message
  metadata, species, precise textual locations, sighting dates, provider
  endpoints/parameters, rejection diagnostics, and error messages. The general
  ingestion-status route returns the complete latest ingestion-run record.
- **Impact:** Internal operating behavior and potentially sensitive bird-location
  or observer-adjacent metadata are exposed to unauthenticated callers. Sequential
  or discoverable run IDs can broaden access.
- **Decision needed:** Classify which data is intentionally public. Put true
  operator diagnostics behind authentication and return a deliberately reduced
  public health/status shape.

### F050 — Query filters can amplify database work on unauthenticated endpoints

- **Status:** Unreviewed
- **Area:** Backend / abuse resistance
- **Evidence:** The enrichment summary loads up to 5,000 attempts and 5,000 API
  calls per request, then aggregates them in application memory. Other ops routes
  allow repeated substring searches. Incident and statistics endpoints perform
  broad database loads and photo-cache checks. No application rate limiter,
  response cache, request concurrency limit, or authenticated operator boundary
  exists.
- **Impact:** A small number of repeated requests can create avoidable database,
  CPU, memory, and provider pressure.
- **Candidate action:** Fix authentication first, then measure and bound expensive
  queries. Add caching or database aggregation where justified rather than using
  rate limiting to conceal inefficient query shapes.

### F051 — Basic HTTP hardening is absent

- **Status:** Unreviewed
- **Area:** Backend / web security
- **Evidence:** The Express app configures CORS and JSON parsing only. It does not
  set a security-header policy, disable framework identification, define request
  deadlines, or install consistent 404/error middleware. Allowed production
  origins are hard-coded. Health output discloses runtime environment and database
  provider.
- **Impact:** This is defense-in-depth rather than a demonstrated exploit, but it
  increases fingerprinting and makes deployment changes require source edits.
- **Candidate action:** Establish an explicit public API policy: headers,
  proxy/trust assumptions, configurable origins, timeouts, body limits, error
  responses, and minimal public health information.

### F052 — Advisory count overstates runtime reachability but includes update-worthy paths

- **Status:** Unreviewed
- **Area:** Dependencies / security
- **Evidence:** A fresh `npm audit --omit=dev` reports nine advisories. Five
  moderate/high packages (`hono`, `@hono/node-server`, `valibot`, `fast-uri`, and
  `@prisma/dev`) are reached through the Prisma CLI/tooling chain, not the running
  Express application. The low `body-parser` advisory is in the Express runtime,
  but the vulnerable invalid-limit condition is not used because Twitcher accepts
  the middleware default. The high Nodemailer advisory is pulled by the direct
  `imapflow` dependency; Twitcher uses IMAP retrieval and does not call
  Nodemailer's message composition `raw` option described by the advisory.
- **Additional evidence:** `imapflow` itself is marked high solely through
  Nodemailer. Fixes are reported available for all chains.
- **Impact:** There is no evidence that the high Nodemailer file-read/SSRF path is
  reachable in Twitcher's current use, while tooling-only findings should not be
  represented as exposed production endpoints. Keeping avoidably vulnerable
  versions is still unnecessary risk, especially because the poller image installs
  the full dependency tree.
- **Candidate action:** Update `imapflow`/Nodemailer and Express in isolated,
  tested changes. Separate build tooling from the runtime image, and document
  reachability decisions instead of managing security by raw advisory count.

### F053 — Diagnostic error sanitization is inconsistent and heuristic

- **Status:** Unreviewed
- **Area:** Backend / logging
- **Evidence:** Three separate sanitizers use different regular expressions and
  substring rules. Messages not matching those small deny-lists are returned or
  persisted nearly verbatim, including provider response bodies. Conversely,
  harmless errors mentioning Prisma or a stack-like ` at ` are collapsed into a
  generic string.
- **Impact:** Sensitive detail can slip through novel error formats, while useful
  diagnosis is lost unpredictably. Public ops endpoints increase the consequence.
- **Candidate action:** Store structured error codes and explicitly selected
  metadata. Keep detailed logs in a protected sink and return stable, minimal API
  errors.

### F054 — Unknown rarity is displayed and filtered as ABA Code 5

- **Status:** Unreviewed
- **Area:** Frontend / data semantics
- **Evidence:** Dashboard rarity color, filtering, and high-rarity status all
  replace `null` or `0` with code 5. The map does the same. Code 5 has a specific
  meaning—five or fewer ABA Area records or fewer than three recent records—not
  “unknown.”
- **Impact:** Missing reference data is presented as an exceptionally rare bird,
  visually emphasized, and included when users select Code 5. This is material
  misinformation rather than a harmless fallback.
- **Candidate action:** Add an explicit unknown/unclassified state with neutral
  styling and decide whether it is shown by default. Fix missing rarity data at
  ingestion separately; never infer Code 5 from absence.

### F055 — Frontend API consumption has no runtime validation or race control

- **Status:** Unreviewed
- **Area:** Frontend / reliability
- **Evidence:** Dashboard and statistics cast arbitrary JSON directly to local
  TypeScript interfaces. Types are duplicated rather than generated or shared
  from a contract. Fetches have no abort signal or response-shape validation.
  Rapid statistics filter changes start overlapping requests, and an older
  response can overwrite a newer selection.
- **Additional evidence:** Components do not distinguish timeout, offline,
  malformed-response, empty-data, and server errors. Dashboard offers no retry.
  Statistics silently hides failure to load filter options.
- **Impact:** Backend drift can produce incorrect rendering or runtime failure,
  and the statistics screen can show results that do not match the visible
  filters.
- **Candidate action:** Define a versioned response contract with runtime
  validation. Abort superseded requests or ignore stale request IDs, and provide
  deliberate retry/error states.

### F056 — The mobile rarity dropdown has no open/close interaction

- **Status:** Unreviewed
- **Area:** Frontend / responsive behavior
- **Evidence:** The mobile trigger has no click handler or open state.
  `.dropdown-menu` is always `display: none` and becomes visible only under
  `.custom-dropdown:hover`. `aria-expanded` is absent despite
  `aria-haspopup="listbox"`.
- **Impact:** Touch, keyboard, and many assistive-technology users cannot reliably
  access rarity options. This confirms the stale status note and the weakness
  identified in F031.
- **Candidate action:** Implement an explicit disclosure/listbox contract,
  including trigger state, keyboard navigation, focus management, Escape, and
  outside interaction. A native multi-select or checkbox disclosure may be
  simpler and more robust.

### F057 — Several data visualizations and media affordances are mouse-only or underspecified

- **Status:** Unreviewed
- **Area:** Frontend / accessibility
- **Evidence:** Histogram bars are non-focusable `div` elements whose values appear
  only on mouse hover. Statistics chart segments expose detail via `title`
  attributes. Map markers all use the generic label “Bird sighting” rather than
  species/location. Photo alt text is always “Sighting photo,” while attribution
  appears only in a hover overlay. Geolocation errors are not announced through a
  live region.
- **Impact:** Important identity, counts, attribution, and errors are unavailable
  or inefficient for keyboard and screen-reader users.
- **Candidate action:** Give charts a textual/table equivalent, use meaningful
  marker and image names, expose attribution persistently or on focus, and add
  appropriate status/error announcements.

### F058 — Visible UI labels do not match backend semantics

- **Status:** Unreviewed
- **Area:** Frontend / product correctness
- **Evidence:** Cards say `Active N days`, but backend `activeDays` is the inclusive
  span from first to last report, including days with no reports. Statistics
  “State” grouping currently derives from `primaryCountry`, while “County”
  formatting combines `primaryState` and `primaryCountry`; those labels depend on
  confused backend geography fields. Histogram “sightings” counts report rows,
  not necessarily individual birds.
- **Impact:** Users can reasonably interpret the interface as continuity, state
  ranking, and bird counts when it is displaying span length, country/state
  mixtures, and report counts.
- **Decision needed:** Define each metric and geographic level in domain language,
  correct the backend fields, then label the UI from that contract.

### F059 — Statistics defaults can select a year that has no data

- **Status:** Unreviewed
- **Area:** Frontend / behavior
- **Evidence:** The initial year is the browser's current calendar year before
  server options are loaded. It is not reconciled to available years. If the
  dataset has no current-year incidents, the initial page appears empty even
  though historical data exists.
- **Impact:** A healthy system can look devoid of data.
- **Candidate action:** Choose a documented default—active, all years, or newest
  available year—and set it after validated options load without issuing a
  misleading intermediate query.

### F060 — Styling contains overlapping theme layers and confirmed dead rules

- **Status:** Unreviewed
- **Area:** Frontend / maintainability
- **Evidence:** The application imports a 1,394-line `App.css` and a 595-line
  `themes.css`; both redefine central selectors such as cards, headers, map
  wrappers, filters, dropdowns, and hover states. Cascade order is part of the
  effective design. Confirmed unused rule groups include the former ingestion
  status, sighting details/comments/links, about hero/grid/legend/reference, and
  legend component styles. Duplicate declarations and historical comments remain.
- **Impact:** Small visual changes require reasoning across two global sheets and
  multiple media-query blocks. Dead design iterations inflate the CSS bundle
  (about 102 KB minified) and make regressions more likely.
- **Candidate action:** Capture visual baselines, remove selectors proven unused,
  and consolidate by component or a single token/theme layer. Do not combine this
  with behavior fixes that need focused review.

### F061 — Client routing has no explicit unknown-route or host rewrite contract

- **Status:** Unreviewed
- **Area:** Frontend / routing
- **Evidence:** A hand-written pathname switch maps `/about` and `/statistics`;
  every other path silently renders the dashboard. No committed Vercel rewrite
  configuration defines direct-load fallback behavior, and navigation does not
  manage page title, focus, or scroll restoration.
- **Impact:** Mistyped URLs look valid, direct deep links depend on undeclared host
  behavior, and keyboard/screen-reader navigation may retain focus in the prior
  view.
- **Candidate action:** Decide whether a small router is warranted. At minimum,
  define supported paths, a not-found view, host rewrites, title updates, focus,
  and scroll behavior.

### F062 — Map failure and performance behavior is not productized

- **Status:** Unreviewed
- **Area:** Frontend / map
- **Evidence:** Missing MapTiler configuration displays environment-variable names
  to end users. Style/network/runtime failures after construction have no visible
  fallback. Coordinates are trusted without finite/range validation. Every
  incident creates an individual DOM marker and popup, and MapLibre is loaded in
  the sole initial JavaScript chunk.
- **Impact:** Configuration or provider failure yields an implementation message
  rather than a usable list-first experience. Invalid data can destabilize map
  rendering, and map weight contributes heavily to the 1.25 MB initial bundle.
- **Candidate action:** Lazy-load the map, validate coordinates, provide a user
  fallback with operator diagnostics elsewhere, and establish a marker
  clustering/volume threshold.

### F063 — Production topology is inferred rather than reproducible

- **Status:** Unreviewed
- **Area:** Deployment / configuration
- **Evidence:** No committed Render service definition, Vercel configuration, or
  cron/scheduler definition exists. Operations documentation infers Render build
  and start commands and the Vercel project from local metadata and a hard-coded
  CORS origin. The poller Compose file defines only a one-shot container; it does
  not define when or how it is scheduled.
- **Impact:** Provider dashboard state is an undocumented second codebase.
  Recreating production, reviewing a deployment change, or determining which
  ingestion path is authoritative requires external account inspection.
- **Candidate action:** Commit non-secret provider/service configuration where the
  platforms support it, and create one topology document stating owners,
  schedules, URLs, health paths, migration responsibility, and rollback behavior.

### F064 — Health endpoints do not represent application readiness

- **Status:** Unreviewed
- **Area:** Operations / monitoring
- **Evidence:** `/health` always reports success without touching the database and
  may therefore keep a disconnected service “healthy.” `/api/health` checks only
  a database query; its overall `ok` remains true when the latest ingestion failed,
  is stuck running, or has not run recently. Neither checks required provider
  configuration. No committed Render configuration identifies which endpoint is
  used for health.
- **Impact:** Load balancer health and operator health can disagree with the
  service's actual ability to ingest or serve current data.
- **Candidate action:** Separate liveness from readiness and freshness. Readiness
  should cover dependencies needed to serve requests; ingestion freshness/failure
  should be an explicit monitored signal with an agreed threshold.

### F065 — The poller image is a development-style runtime running as root

- **Status:** Unreviewed
- **Area:** Docker / security
- **Evidence:** The image performs a full `npm ci`, retains development tooling,
  Prisma CLI/build-only packages, source, and both database adapters, then runs
  TypeScript through `tsx` via `npm`. No non-root `USER`, init, read-only
  filesystem guidance, capability drop, or multi-stage build is present.
- **Impact:** The image is larger and has a broader package/command attack surface
  than the poller needs. Root execution increases the effect of a dependency or
  script compromise.
- **Candidate action:** Produce a compiled, minimal runtime stage, prune build-only
  dependencies, run as the Node user, and document compatible container
  hardening. Verify Prisma engine and CA certificate requirements before slimming.

### F066 — Poller image selection is mutable and architecture-limited

- **Status:** Unreviewed
- **Area:** Docker / reproducibility
- **Evidence:** CI publishes only `linux/arm64`. Compose defaults to the mutable
  `production` tag and does not define a pull policy; a host can continue using a
  cached image. The base image is the mutable `node:22-slim` tag. SHA-tagged images
  are published but the default deployment does not consume them.
- **Impact:** The same Compose configuration can run different source over time,
  run an old cached image, or fail on an x86_64 host.
- **Candidate action:** Confirm target architecture, publish the required
  multi-platform set, deploy an immutable SHA/digest, and make promotion/rollback
  explicit. Pin the base by digest with an intentional update process.

### F067 — Database migrations run during the inferred web build

- **Status:** Unreviewed
- **Area:** Deployment / database safety
- **Evidence:** The documented Render build command runs `prisma migrate deploy`
  before building and starting the new application. The poller image does not
  migrate and assumes the database is already compatible. There is no committed
  migration owner, expand/contract compatibility policy, pre-deploy backup check,
  or rollback procedure.
- **Impact:** A build can mutate the production schema even if the subsequent
  application build or rollout fails. Old web/poller instances may overlap an
  incompatible migration, and rolling back code may not roll back schema.
- **Candidate action:** Assign one migration job/owner and require backward-
  compatible expand/migrate/contract changes. Document preflight, backup,
  failure, and rollback decisions; never infer automatic down-migration.

### F068 — Production configuration validation and examples are incomplete

- **Status:** Unreviewed
- **Area:** Operations / configuration
- **Evidence:** The poller validator checks only for `GROQ_API_KEY` when writing
  sightings, even though summarization supports Gemini and the poller requires
  database, IMAP, and eBird configuration. The poller example omits
  `GROQ_API_KEY`/`GEMINI_API_KEY` while `poll:prod` requires Groq. No frontend
  example documents `VITE_API_URL`, `VITE_MAPTILER_STYLE_URL`, or
  `VITE_MAPTILER_API_KEY`. CORS production origin is compiled into source.
- **Impact:** The documented example cannot run the production command as written,
  and missing configuration fails late with provider- or library-specific errors.
  Frontend and origin configuration live only in provider dashboards.
- **Candidate action:** Create role-specific, non-secret configuration schemas and
  examples for web, poller, frontend build, tests, and operator tools. Validate
  formats and mutually exclusive provider choices at startup.

### F069 — CI does not execute the produced image or secure action provenance

- **Status:** Unreviewed
- **Area:** CI / supply chain
- **Evidence:** The workflow compiles backend code and builds the poller image but
  never starts the built image, validates its entrypoint, or checks its final
  contents/user. GitHub Actions are pinned to moving major tags rather than commit
  SHAs. No dependency-review, secret scan, SBOM, provenance attestation, or image
  vulnerability scan is configured. General frontend/repository CI is already
  absent under F029.
- **Impact:** A valid Docker build can still ship a broken runtime command or
  incorrect architecture, and third-party workflow code can change without a repo
  diff.
- **Candidate action:** Add a no-provider entrypoint/config smoke test, pin actions
  by reviewed SHA, and choose proportionate supply-chain checks. Keep image
  publication separate from ordinary repository validation.

### F070 — Poller scheduling and failure notification are external and undocumented

- **Status:** Unreviewed
- **Area:** Operations / observability
- **Evidence:** The one-shot poller correctly exits nonzero on detected target or
  summarization partial failure, but no committed scheduler consumes that exit
  status or alerts an operator. Compose sets `restart: "no"`. Ingestion's
  misleading success semantics from F036 can still bypass poller failure.
  `AlertPollRun` records are not included in the public/full health checks.
- **Impact:** Polling can stop or repeatedly fail without a durable alert. It is
  impossible from the repository to determine expected frequency or missed-run
  tolerance.
- **Candidate action:** Define the scheduler, cadence, overlap policy, timeout,
  exit-code capture, log retention, and alert destination. Monitor last successful
  poll separately from container liveness.

### F071 — The web process has no explicit graceful-shutdown lifecycle

- **Status:** Unreviewed
- **Area:** Backend / deployment reliability
- **Evidence:** The server does not retain the listening server handle, stop
  accepting traffic on SIGTERM/SIGINT, wait for in-flight ingestion, or explicitly
  disconnect Prisma. Background summary/photo promises are not tracked for drain.
- **Impact:** Rolling deploys or restarts can interrupt writes and provider calls
  at arbitrary points, compounding the partial-write behavior already identified.
- **Candidate action:** Add bounded graceful shutdown with readiness removal,
  request drain, background-task policy, Prisma disconnect, and a forced-exit
  deadline.

### F072 — At least five documents compete to describe current project state

- **Status:** Unreviewed
- **Area:** Documentation architecture
- **Evidence:** README, `status.md`, `conductor/tech-stack.md`,
  `conductor/dashboard-state.md`, `conductor/ui-components.md`, and
  `conductor/tracks.md` all make current-state claims. They are maintained
  independently and disagree about mapping, database, UI fields, ingestion,
  clustering, photos, and work status. Operations guidance adds another partially
  overlapping view.
- **Impact:** A reader cannot determine truth by document location or title.
  Inferior-model changes followed stale “authoritative” documents and reinforced
  drift.
- **Candidate action:** Define one home for each information class: onboarding,
  architecture/domain model, operations, backlog/stories, decisions, changelog,
  and historical artifacts. Each current document must have an owner and
  verification trigger.

### F073 — README contains false setup, stack, feature, and deployment guidance

- **Status:** Unreviewed
- **Area:** Documentation / onboarding
- **Evidence:** README names Leaflet/React-Leaflet instead of MapLibre. It says
  offline mode blocks only POST ingestion even though GET ingestion also mutates.
  It references a populated local SQLite backup that is untracked and may not
  exist for a new clone. It describes card links/Discord behavior no longer
  rendered. Frontend deployment says Vercel or Netlify without documenting
  required Vite environment variables or route rewrites. Render migration advice
  embeds the unsafe ownership ambiguity in F067.
- **Additional evidence:** Commands are predominantly Windows-specific while this
  repository is currently being operated on macOS. Root offline startup delegates
  to a backend script using Windows `set` syntax and therefore is not portable.
- **Impact:** A clean checkout cannot reliably follow the advertised path, and
  operators may repeat unsafe or obsolete production procedures.
- **Candidate action:** Test onboarding from a clean clone on supported platforms.
  Keep README short: purpose, prerequisites, verified local start, safe test entry
  points, and links to architecture/operations.

### F074 — `status.md` mixes history, backlog, capability, and stale defects

- **Status:** Unreviewed
- **Area:** Documentation / product management
- **Evidence:** Completed tracks are repeated inside a queued section. Photo
  integration and the MapLibre migration are still presented as unfinished.
  Known bugs include resolved TypeScript configuration and summarization behavior,
  while omitting newer poller/data-integrity faults. It describes SQLite-era
  work, proposed features, current functionality, and housekeeping in one undated
  mutable list.
- **Impact:** The file cannot serve reliably as roadmap, release history, or
  operational status.
- **Candidate action:** Replace it with separate current-capabilities and backlog
  views, sourcing story status from one registry. Preserve the old file as a dated
  historical snapshot after migrating still-valid intent.

### F075 — Conductor “living contracts” are materially false

- **Status:** Unreviewed
- **Area:** Documentation / engineering workflow
- **Evidence:** `dashboard-state.md` claims Leaflet/OpenStreetMap, blue pins,
  ingestion status in the header, card links, 21-day histograms, startup
  ingestion, and a `25km + 50km/hour` radius capped at 200 km. Current code uses
  MapLibre/MapTiler and colored markers, does not render ingestion status or card
  links, produces a 25-day histogram, gates startup ingestion off by default, and
  implements a different 50 km-capped formula. `ui-components.md` repeats many of
  those claims and calls itself a living contract.
- **Impact:** Mandatory instructions require agents to consume and update false
  prerequisites before doing work, making incorrect implementation more likely.
- **Candidate action:** Either regenerate these views from code/contracts or stop
  treating them as authoritative. A concise architecture and API contract is more
  maintainable than duplicating component implementation details in prose.

### F076 — The track registry is incomplete and contains orphaned work

- **Status:** Unreviewed
- **Area:** Documentation / backlog
- **Evidence:** `conductor/tracks.md` omits the current poller-image track and
  smart-photo-cropping spec, as well as empty placeholder directories for
  PostgreSQL migration and loading bars. Poller delivery has spec/plan but no
  registry entry or metadata. Smart photo cropping has only a spec. Conversely,
  April cleanup/mobile tracks remain “active” without recent progress, and queued
  ingestion/security specs substantially overlap current audit findings.
- **Impact:** Work can exist outside the supposed source of truth, duplicate other
  stories, or appear active indefinitely.
- **Candidate action:** Reconcile every non-archived directory into one story
  registry with status, owner, dependency, and last-reviewed date. Merge valid
  prior specs into audit-derived stories rather than discarding their context.

### F077 — Contributor/agent instructions conflict with the environment and each other

- **Status:** Unreviewed
- **Area:** Documentation / governance
- **Evidence:** Repository `AGENTS.md` mandates Windows/PowerShell and forbids
  ordinary Unix commands, while the current host is macOS. `GEMINI.md` assumes a
  specific execution agent, mandatory failing-test/commit/git-note/PR steps, and
  says active tracks live in `conductor/archive`, contradicting the actual
  `conductor/tracks` layout. `conductor/workflow.md` and `sdlc.md` add hundreds of
  lines of overlapping process requirements. Root machine instructions impose a
  different changelog and service-safety contract.
- **Impact:** Following one instruction set can violate another. Process volume
  encourages mechanical compliance rather than reliable engineering judgment.
- **Candidate action:** Maintain one short repository contributor/agent contract,
  platform-neutral commands, and links to optional workflow detail. Remove
  model-specific identity instructions from project truth.

### F078 — There was no maintained changelog or decision history

- **Status:** Unreviewed
- **Area:** Documentation / change management
- **Evidence:** Before this audit, feature chronology was scattered across commit
  messages, archived track plans, `status.md`, and dashboard-state change rows.
  No maintained changelog explained user-visible or operational changes. Major
  decisions—PostgreSQL migration, MapLibre adoption, dual ingestion paths, poller
  image architecture, and clustering rules—lack concise decision records with
  consequences.
- **Impact:** Stale documents cannot be confidently retired because their unique
  historical rationale is unknown.
- **Candidate action:** Use `docs/CHANGELOG.md` for dated shipped changes and short
  architecture decision records for consequential choices. Do not turn the
  changelog into another backlog.

### F079 — Historical material is mixed with current guidance and includes incomplete artifacts

- **Status:** Unreviewed
- **Area:** Documentation / history
- **Evidence:** `conductor/archive` is clearly named but its specs are frequently
  linked from current-state registries without a prominent historical disclaimer.
  One archived specification is empty; two active-track placeholders are
  zero-byte files. `review.md` is undated and formatted as a current severity list
  despite stale line numbers and partially fixed claims. `references/` is ignored
  at the repository root while some reference Markdown files are nevertheless
  present locally, so availability differs by checkout.
- **Impact:** Historical intent is valuable, but incomplete/stale artifacts can be
  mistaken for requirements or disappear outside one workstation.
- **Candidate action:** Add dated headers/status to preserved reviews and archives,
  identify intentionally local reference data, and remove empty placeholders only
  after their intended work is reconciled.

### F080 — Core domain and architecture rules exist only implicitly in code

- **Status:** Unreviewed
- **Area:** Documentation / architecture
- **Evidence:** No current document accurately defines checklist versus
  observation identity, authoritative ingestion source, incident temporal/spatial
  continuity, target retirement, rarity unknown state, geography fields, report
  versus individual count, or background-job ownership. These are precisely the
  disputed assumptions behind F034, F038, F040, F047, F054, and F058.
- **Impact:** Refactors and tests encode whichever interpretation an implementer
  guesses, producing locally plausible but globally inconsistent behavior.
- **Candidate action:** Create a compact domain model and data-flow document before
  implementing integrity fixes. Record unresolved choices explicitly rather than
  documenting accidental current behavior as policy.

### F081 — SQLite compatibility mutates shared generated-client state

- **Status:** Unreviewed
- **Area:** Database / local development
- **Evidence:** PostgreSQL and SQLite Prisma schemas currently have equivalent
  models and indexes; the only semantic schema difference found is the datasource
  provider. `prisma validate` passes, and CI builds a fresh PostgreSQL database
  from committed migrations. However, offline startup regenerates the single
  installed Prisma client from the SQLite schema. Switching back to PostgreSQL
  requires a manual regeneration step documented in README. The backend
  `dev:local` command also uses Windows-only environment syntax.
- **Impact:** Two backend processes or scripts in the same checkout cannot safely
  assume different providers, and forgetting regeneration can produce confusing
  adapter/client failures. Every schema change must be duplicated manually.
- **Decision needed:** Decide whether the local SQLite backup remains a supported
  product workflow. If yes, isolate generated clients/build directories and add
  parity validation; if no, archive the data/schema and standardize local
  development on disposable PostgreSQL.

## Recommended Story Sequence

The 52 story candidates above are deliberately narrow. They should not all be
opened at once. This is the dependency-aware order recommended for review.

### Wave 0 — Make change safe and decide the domain

1. **S14/S03 — Safe test tiers and disposable database guardrails.** S14 is
   complete: database-free tests are independently runnable and destructive
   database tests fail closed. Broader S03 classification, naming, and schema-test
   cleanup remains unreviewed.
2. **S50/S46 — Record domain decisions and documentation ownership.** Keep this
   bounded to the decisions needed by the next stories, not a wholesale rewrite.
3. **S21 — Durable observation identity.** Defines the migration and deduplication
   key needed by ingestion and poller repair.
4. **S24 — Ingestion authority and alert-target lifecycle.** Decide email detail
   versus poller ownership and retirement semantics.
5. **S23 — Incident continuity contract.** Decide time/radius/reopening rules
   before changing clustering code.
6. **S43 — Migration ownership.** Establish the safe deployment mechanism before
   applying integrity constraints.

### Wave 1 — Stop active corruption and exposed mutation

1. **S29 — Authenticate ingestion and operator APIs; remove mutation from GET.**
2. **S22/S28 — Make ingestion retry-safe and add the approved identity
   constraints/indexes.**
3. **S23 — Implement concurrency-safe incident clustering from the approved
   contract.**
4. **S24 — Separate email/poller stages and retire stale targets.**
5. **S33/S37 — Stop presenting unknown rarity and ambiguous metrics as facts.**

### Wave 2 — Bound failures and make them observable

1. **S25/S26 — Provider deadlines, resumable enrichment, and correct summary
   state.**
2. **S41/S45 — Truthful health, poller freshness alerts, and graceful shutdown.**
3. **S09/S39/S42 — Cross-process work coordination, map degradation, and hardened
   poller runtime.**
4. **S31 — Dependency upgrades, tested independently from behavioral changes.**

### Wave 3 — Restore trustworthy engineering feedback

1. **S15-S20 — Test naming/fidelity, network isolation, type checking,
   deterministic async tests, useful coverage, and browser/accessibility smoke.**
2. **S04/S44 — Agreed lint/build gates and complete CI.**
3. **S34-S36 — Validated frontend contracts, race-safe fetching, and accessible
   controls.**

### Wave 4 — Simplify and document the resulting system

1. **S40/S42 — Reproducible topology and immutable multi-platform image
   promotion.**
2. **S47-S49/S51 — Rewrite verified onboarding/operations, reconcile Conductor,
   consolidate instructions, and label history.**
3. **S01/S02/S07/S38/S52 — Remove dead code/dependencies/CSS, reduce bundles, and
   resolve SQLite compatibility after behavior is stable.**

## Audit Completion and Remaining Evidence

The static repository audit is complete across code usage, tests, backend
correctness, security/dependencies, frontend, database schemas, deployment, and
documentation.

The following cannot be concluded from the repository and remain explicit
evidence gaps rather than hidden assumptions:

- Whether existing production data already contains checklist/species
  conflation, duplicate sightings, empty incidents, or stale active targets.
- Whether all committed PostgreSQL migrations are applied in production.
- Actual query plans, table growth, database constraints/indexes in the live
  schema, Neon quota, and backup/restore readiness.
- Which Render health endpoint, build command, environment, and cron configuration
  are active.
- Where the poller is scheduled, its host architecture, current deployed image
  digest, last successful run, and alert destination.
- Whether Vercel supplies SPA rewrites and the required frontend build variables.
- Current production HTTP exposure, authentication added outside the repository,
  proxy-level rate limits, and security headers.
- Provider quotas, credential scope/rotation, and runtime timeout behavior under
  real failure.
- Docker image runtime behavior because the image was not built or executed
  during this read-only audit.
- Backend database-tier result because no explicitly disposable local PostgreSQL
  database was provided. The database-free tier passed, guard rejection behavior
  was verified locally, and committed CI now carries the required acknowledgement
  for its ephemeral PostgreSQL service.

## Questions to Resolve During Review

1. Should cleanup stories live in `conductor/tracks/`, a new root backlog, or a
   redesigned documentation tree?
2. Is `status.md` intended to be a roadmap, release history, current capability
   matrix, or all three?
3. Which backend scripts are still used operationally outside package scripts?
4. What disposable PostgreSQL workflow should local development and CI use?
5. Is the poller image the current production ingestion path, or is Render startup,
   cron HTTP ingestion, or another scheduler authoritative?
6. Which existing review findings have already been fixed but never closed out?
7. Is eBird `subId` intended to identify a checklist or a species observation in
   the product model?
8. Are alert summary emails complete snapshots of active targets?
9. Which process is authoritative for creating sightings: web ingestion, the
   standalone poller, or both?
10. Are the `/api/ops/*` endpoints intended for the public dashboard or private
    operators?
11. What authenticates the production scheduler that currently calls ingestion?
12. How should unknown/unseeded ABA rarity be displayed and filtered?
13. Should “active days” mean elapsed span, distinct days with reports, or current
    incident status?
14. Is the dashboard expected to remain fully useful when MapTiler is unavailable?
15. Where is the production poller scheduled, at what cadence, and who receives
    failure alerts?
16. Which deployment component exclusively owns production migrations?
17. Is the poller host ARM64, AMD64, or a mixed target?
18. Which current-state documents should survive the documentation redesign?
19. Is Conductor still the intended story workflow, or should its archives be
    retained while active work moves to a simpler registry?
20. Which operating systems are officially supported for local development?
21. Should the SQLite offline mode remain supported, or become an archived data
    recovery tool?

## Document History

- **2026-07-24:** Created the audit register from the initial read-only repository,
  tooling, dependency, test, and documentation review.
- **2026-07-24:** Added static runtime reachability results and separated likely
  test-only libraries from manually invokable script candidates.
- **2026-07-24:** Classified the unreachable script candidates into read-only
  diagnostics and undocumented data-mutating utilities.
- **2026-07-24:** Deep-reviewed test safety, fidelity, naming, CI coverage,
  network isolation, timing determinism, and frontend interaction gaps.
- **2026-07-24:** Deep-reviewed backend ingestion, polling, incident clustering,
  enrichment, external-provider boundaries, parsing, summarization, and supporting
  database integrity assumptions.
- **2026-07-24:** Deep-reviewed API trust boundaries, operational-data exposure,
  abuse controls, HTTP hardening, current secret hygiene, and production
  dependency advisory reachability.
- **2026-07-24:** Deep-reviewed frontend data semantics, request lifecycles,
  responsive controls, accessibility, routing, map degradation, and CSS
  maintainability.
- **2026-07-24:** Deep-reviewed CI, container construction, image promotion,
  provider topology, migrations, health semantics, poller scheduling, runtime
  configuration, and process shutdown.
- **2026-07-24:** Deep-reviewed onboarding, product status, Conductor registries
  and living contracts, agent guidance, historical artifacts, and missing domain
  decision records.
- **2026-07-24:** Verified current cross-provider schema shape parity, recorded the
  generated-client switching hazard, and reconciled all audit areas into a
  dependency-aware story sequence with explicit production evidence gaps.
- **2026-07-24:** Completed S14 by splitting backend tests into database-free and
  database-backed tiers, adding independent disposable-PostgreSQL guardrails,
  making direct Vitest execution database-free by default, and wiring the
  acknowledgement into CI. Recorded that local database-tier execution remains
  pending an explicitly disposable PostgreSQL target.
- **2026-07-24:** Removed the duplicate root `cors` dependency, completed S16 by
  failing backend tests on unhandled network requests, and completed the bounded
  S15 naming cleanup by relabeling mock-only backend and JSDOM frontend tests
  according to their actual boundaries. Kept assertion-fidelity work in F025
  under S20.
- **2026-07-24:** Completed F006, S17, S04, and S19 by repairing stale schema
  tests, adding backend test type-checking, establishing a clean frontend lint
  policy and baseline, and adding general backend/frontend repository validation
  CI. Hosted workflow execution remains unverified until the changes are pushed.
