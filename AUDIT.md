# Twitcher Engineering Backlog

Last reviewed: 2026-08-13

## Purpose

This is the single source of truth for engineering cleanup and risk work.

- Product setup and current behavior belong in `README.md`.
- Shipped changes belong in `docs/CHANGELOG.md`.
- Operational runbooks belong in `docs/ops/`.
- Completed historical plans remain in `conductor/archive/`.

Only actionable work belongs here. Add evidence and a verifiable completion
condition to new entries. Remove completed entries after recording the change in
the changelog.

## Priorities

- **P0:** Active data-integrity or security risk.
- **P1:** Reliability, compliance, or operational risk.
- **P2:** Correctness, maintainability, accessibility, or performance work.
- **P3:** Product improvements that are safe to defer.

## P0 — Data Integrity and Security

### A01 — Make email ingestion atomic and retry-safe

**Evidence:** Email identity, parsed-sighting writes, incident assignment, and
email completion span multiple operations. The schema does not enforce a durable
pre-enrichment sighting identity, and missing Message-ID handling needs an
explicit fallback.

**Done when:** A failure cannot leave an email permanently skipped with partial
writes; retries are idempotent; concurrent ingestion cannot duplicate a parsed
sighting or corrupt incident aggregates; regression and concurrency tests cover
those guarantees.

### A02 — Authenticate and constrain mutating and operational APIs

**Evidence:** Ingestion and operational endpoints need a documented trusted-caller
boundary. Expensive query parameters and repeated requests can amplify database
or provider work.

**Done when:** Mutating/diagnostic routes require authentication, ingestion is
rate-limited and single-flight, public errors do not expose infrastructure
details, and tests cover unauthorized and throttled requests.

## P1 — Reliability, Compliance, and Operations

### A03 — Bound and resume external-provider work

**Evidence:** IMAP, eBird enrichment, summarization, photo lookup, and geocoding
can run on request paths or repeat work after failures. Timeout, retry, locking,
and backpressure behavior is not consistently defined.

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

**Evidence:** Runtime topology, migration ownership, poller scheduling, provider
configuration, readiness, and failure notification are partly inferred from
hosting configuration rather than a single verified runbook.

**Done when:** A clean deployment can be reproduced from committed instructions;
migration ownership is explicit; health distinguishes liveness/readiness;
graceful shutdown is implemented; poller scheduling and alerting are documented
and tested.

### A08 — Harden the poller image and CI supply chain

**Evidence:** The poller image/runtime and action provenance need runtime
verification, non-root execution, immutable image selection, and architecture
review.

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

### A11 — Represent unknown rarity honestly

**Evidence:** Unknown rarity can be presented or filtered as ABA Code 5 even
though “unknown” and “Code 5” have different meanings.

**Done when:** Unknown rarity is represented separately through the API and UI,
with tests covering display and filtering behavior.

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
