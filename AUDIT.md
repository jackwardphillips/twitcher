# Twitcher Engineering Backlog

Last reviewed: 2026-10-15 (targeted topology and code review; not a fresh dependency or provider-terms audit)

## Purpose

This is the single source of truth for engineering cleanup and risk work.

- Product setup and current behavior belong in `README.md`.
- Shipped changes belong in `docs/CHANGELOG.md`.
- Completed Conductor tracks are consolidated in `docs/CHANGELOG.md` under their
  archive dates. The archive and obsolete `docs/ops/` notes have been removed.

Only actionable work belongs here. Add evidence and a verifiable completion
condition to new entries. Remove completed entries after recording the change in
the changelog.

## Priorities

- **P0:** Active data-integrity or security risk.
- **P1:** Reliability, compliance, or operational risk.
- **P2:** Correctness, maintainability, accessibility, or performance work.
- **P3:** Product improvements that are safe to defer.

## P1 — Security and API Boundaries

### A02 — Bound public API workloads and preserve the local development boundary

**Evidence:** Express is retained for local development and now binds explicitly
to `127.0.0.1`; its ingestion and diagnostic routes assume a trusted local caller.
The boundary is documented in `AGENTS.md`. Production Vercel functions under
`api/` expose only incident and statistics reads, with generic error responses.
Statistics routes now share strict query parsing and return 400 for malformed,
repeated, or unsupported parameters. Active/year filters run in the database
before aggregation. Public request-rate limits and bounds for all-year queries
and the filter-options endpoint remain unimplemented.

**Done when:** Public query work is bounded and tests cover malformed and
throttled requests. Any future remote exposure of Express requires a separate
review of authentication, rate limits, and cross-process ingestion exclusion;
CORS alone is not authentication. Localhost binding does not protect routes
that are deliberately forwarded or proxied.

## P1 — Reliability, Compliance, and Operations

### A03 — Bound and resume external-provider work

**Evidence:** Production polling uses IMAP, eBird, photo lookup, and geocoding;
AI summaries were retired from the production poller. Vercel incident reads do
not trigger provider fetches, while the legacy Express route still refreshes
photos in the background. Photo fetches are coalesced within a process and poller
photo hydration is sequential. Durable retries and cross-process coordination
remain to be specified. HTTP provider calls now have 30-second deadlines,
eBird retries timeouts within its existing three-attempt limit, and IMAP has
explicit connection/greeting/socket timeouts with connection cleanup on failure.
These are per-request/inactivity limits, not a deadline for the entire poller run.

**Done when:** External calls have explicit timeouts; cleanup runs on failure;
background work has bounded concurrency and durable retry state; duplicate work
is coalesced; ingestion does not rescan an unbounded rolling backlog.

### A04 — Define alert-target and incident lifecycle ownership

**Evidence:** Polling targets can outlive useful incidents, and more than one
process may make lifecycle decisions. Recent sighting reconciliation fixed stale
incident aggregates, but ownership and retirement rules remain implicit.

**Done when:** Activation, retirement, reopen, and permanently closed behavior are
documented and tested across web and poller processes.

### A05 — Finish photo, geocoding, and map attribution compliance

**Evidence:** Automatic iNaturalist selection now restricts results to CC0/CC BY
and links source observations. Remaining obligations include persistent
geocoding caching, a contact-bearing Nominatim User-Agent, visible OpenStreetMap
attribution, provider-usage review, and confirmation of MapTiler plan/logo
requirements.

**Done when:** Provider terms are documented, required attribution is visible,
Nominatim traffic complies with its usage policy or moves to an approved
provider, and cached photo/license provenance is displayed. Before
monetization, re-review all accepted licenses.

### A06 — Reassess dependency advisories and unused dependencies

**Evidence:** The July audit found backend production and frontend development
advisories. `nodemon` and `ts-node` appeared unused by committed workflows.
Dependency versions and advisory reachability are time-sensitive.

**Done when:** Fresh production/development audits are recorded, reachable
advisories are remediated or explicitly accepted, unused dependencies are
removed, and the full relevant test suites pass.

### A07 — Make deployment and health behavior reproducible

**Evidence:** Production serves frontend and read APIs on Vercel, uses Neon
Postgres, and polls from the retained Mac checkout. `scripts/vercel-build.js`
already deploys migrations before production builds. Express has health routes,
but Vercel has no equivalent readiness endpoint. Scheduling, failure notification,
and migration concurrency/rollback need one verified deployment contract.

**Done when:** A clean deployment can be reproduced from committed instructions;
migration ownership is explicit; health distinguishes liveness/readiness;
graceful shutdown is implemented; poller scheduling and alerting are documented
and tested.

### A08 — Harden the poller image and CI supply chain

**Evidence:** `.github/workflows/poller-image.yml` already validates the backend
and builds a Linux ARM64 image with revision tags and labels. It does not
smoke-test the built container; actions use mutable major tags.
`backend/Dockerfile.poller` uses `node:22-slim` without a digest or non-root USER.
Live image selection still needs verification.

**Done when:** CI builds and smoke-tests the production image, actions and base
images are pinned appropriately, the container runs as non-root, and supported
architectures are explicit.

## P2 — Correctness and Maintainability

### A09 — Correct incident matching and database constraints

**Evidence:** Incident matching, age limits, location migration, process-local
locking, and hot-query indexes require a current schema-level review.

**Done when:** Matching rules are explicit and tested; database constraints
enforce supported identities; hot filters and joins have verified indexes; query
plans are checked against representative data.

### A10 — Reject or surface invalid provider data

**Evidence:** Invalid provider dates and permissive parser/location heuristics can
silently create plausible but incorrect records.

**Done when:** Invalid dates are quarantined or reported, probabilistic matches
expose confidence/failure, and edge cases have regression tests. Persisted
coordinates are already preferred to string parsing and covered by a regression
test.

### A12 — Validate frontend API contracts and request races

**Evidence:** Frontend consumers trust response shapes and can allow older
requests to replace newer state.

**Done when:** Runtime response validation exists at the API boundary, stale
requests cannot win, failures are recoverable, and tests cover malformed and
out-of-order responses.

### A13 — Reconcile visible dashboard/statistics semantics

**Evidence:** Labels, time windows, counts, and default-year selection need a
contract-level comparison between backend derivation and UI wording.

**Done when:** Each visible metric has one documented definition, empty-year
selection is valid, and API/UI tests assert the same semantics.

### A14 — Improve test signal

**Evidence:** Some suites assert mock calls rather than outcomes, timing-sensitive
tests use sleeps, coverage has no agreed threshold, and browser/accessibility
behavior is lightly exercised.

**Done when:** Critical failure modes have outcome-based tests, sleeps are replaced
with deterministic synchronization, coverage expectations are agreed, and a
small browser/accessibility suite covers core interactions.

### A15 — Classify operator scripts

**Evidence:** `backend/src/scripts/` mixes supported operations, diagnostics,
migrations, simulations, and potentially destructive tools.

**Done when:** Every script is classified, supported scripts document
prerequisites and mutation behavior, dangerous scripts require explicit guards,
and obsolete scripts are removed.

### A16 — Reduce frontend delivery and styling debt

**Evidence:** The production bundle exceeds Vite's chunk warning, MapLibre is a
likely major contributor, and styling contains overlapping/dead rules.

**Done when:** Bundle composition is measured, an intentional loading strategy is
implemented, dead CSS is removed without redesigning unrelated UI, and build and
visual behavior remain verified.

### A17 — Define routing and map degradation behavior

**Evidence:** Unknown routes, host rewrites, map load failures, keyboard access,
and low-performance behavior do not have explicit product contracts.

**Done when:** Direct navigation and unknown routes behave consistently across
hosts, map failures have a usable fallback, and core map affordances are
accessible.

## P3 — Deferred Product Work

- State-record counts.
- Streak gap tolerance.
- Misidentification/under-review flags.
- Distance-aware rarity relevance.
- Incident drill-down and lifer state.
- Push notifications.
- Weekend weather planning.
- External web-search context.
- Final animation/design-system polish.

These items require product specifications before implementation. They are not
engineering cleanup and should move to dedicated issues when prioritized.
