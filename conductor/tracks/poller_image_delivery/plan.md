# Plan - Poller Image Delivery

## Phase 1: Application and delivery implementation [checkpoint: cce9e4f]

- [x] Add tests for production poller preflight, awaited summarization, partial
  failures, and structured completion output.
- [x] Add tests for target-poll eBird diagnostics and diagnostic persistence
  failures.
- [x] Add the additive Prisma relations and PostgreSQL migration.
- [x] Implement the production poller orchestration and correlated diagnostics.
- [x] Add the gated Linux ARM64 GitHub Actions/GHCR workflow and switch Compose
  to the published image.
- [x] Add tested server-owned run, retention, lock, and rollback tooling.
- [x] Validate TypeScript, Prisma, tests, workflow, Compose, and shell scripts.

Validation note: all five PostgreSQL migrations apply to a fresh disposable
database, all 155 backend tests pass, TypeScript builds, the workflow YAML and
shell syntax validate, and server-runner boundary tests pass. Coverage is
74.28% overall and 80% by lines for `src/lib`; the directly changed runtime,
eBird client, incident, and summarization modules are above 90% by statements,
while the pre-existing 539-line alert-target service remains the main coverage
gap.

## Phase 2: Server activation and supervised verification

- [x] Confirm `GROQ_API_KEY` is present without reading its value.
- [x] Confirm a public production image exists in GHCR.
- [x] Install the approved cron entry with the overnight quiet window.
- [x] Run the poller once under supervision against production services.
- [x] Verify the selected digest/revision, poll-run correlation, summaries,
  diagnostics, local history, and container cleanup.
- [x] Record the verified operational change in the home-server changelog.

Phase 2 intentionally remains separate because it changes host scheduling and
runs production ingestion. It begins only after Phase 1 review and explicit
operator confirmation.

Phase 2 completed on 2026-07-24 with production image digest
`sha256:21544bf246f37220444510d65589470264e80270c9f207d91c8b2af9afe904c6`
and `AlertPollRun` `cmrz7brec004t0up5oygmscrh`. The supervised run completed
59 targets and 59 correlated eBird calls with zero failures; Groq updated 7
eligible summaries and skipped 9.
