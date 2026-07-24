# Specification - Poller Image Delivery

## Overview

Move Twitcher's poller build out of the scheduled home-server job and into
GitHub Actions. A successful build from the default branch will publish a
Linux ARM64 poller image to GitHub Container Registry (GHCR); the home server
will check for that image immediately before each scheduled ingestion run.

This design intentionally does not let GitHub execute commands on the home
server. The repository is public, so the server will make outbound,
read-only requests to GHCR and will not expose a webhook, SSH endpoint, or
self-hosted GitHub Actions runner for deployment.

## Problem

The current cron job performs four different responsibilities:

1. Pulls the Twitcher Git repository.
2. Builds the poller image locally.
3. Wakes the Render backend.
4. Runs ingestion and polling.

Pulling and rebuilding every two hours is redundant when the source has not
changed, and it couples routine ingestion to Git and build availability. It
also deploys every new default-branch commit without a distinct build result.
The Render wake is not part of the current ingestion path: the local poller
connects directly to IMAP, Neon, and eBird.

## Goals

- Build the poller once per relevant default-branch change instead of once
  per scheduled ingestion.
- Publish an image compatible with the Apple Silicon home server.
- Let the server adopt a published image on the next scheduled run.
- Keep the home server inaccessible from the public internet and from
  GitHub-hosted workflow runners.
- Preserve local ingestion logs and make image versions traceable to Git
  commits.
- Continue running the last locally available image when GHCR is temporarily
  unavailable.
- Include Groq incident summarization as an explicit stage of each production
  poller run.
- Preserve retry-level eBird API diagnostics and correlate them with the
  poll run and bird/region target that caused each request.

## Functional Requirements

### GitHub image build

- Add a GitHub Actions workflow triggered by a push to the repository's
  default branch when poller build inputs change.
- The workflow must also support manual execution with `workflow_dispatch`.
- Relevant build inputs include:
  - `backend/Dockerfile.poller`
  - `backend/package.json`
  - `backend/package-lock.json`
  - `backend/tsconfig.json`
  - `backend/prisma/**`
  - `backend/src/**`
  - The workflow file itself
- The workflow must build the existing poller Dockerfile for `linux/arm64`.
- The workflow must publish the image to:
  `ghcr.io/jackwardphillips/twitcher-poller`.
- Each published image must have an immutable tag derived from the full Git
  commit SHA.
- A successful default-branch build must also update a moving `production`
  tag used for server discovery.
- The published image must carry OCI source and revision labels.
- The GHCR package must be configured for anonymous read access. Publishing
  will use GitHub's short-lived `GITHUB_TOKEN`; no long-lived registry token
  will be stored on the server.

### Build gates

- The workflow must verify that the backend TypeScript project builds before
  publishing the image.
- The workflow must build the final container successfully before publishing.
- Tests requiring a PostgreSQL database must not use the production Neon
  database.
- GitHub Actions must start a disposable PostgreSQL service for backend tests
  and supply a test-only `TEST_DATABASE_URL`.
- The disposable PostgreSQL service must be destroyed with the GitHub-hosted
  job and must not use production Neon credentials or data.
- The full backend test suite must pass against the disposable database before
  a production image is published.
- Pull-request workflows may build and test the image but must not publish a
  production image.

### Server-side image adoption

- Replace the poller's Compose `build` configuration with the GHCR image
  reference.
- A server-owned run script must execute the scheduled poller. Cron must call
  this script instead of embedding the full command chain.
- Before ingestion, the script must attempt to pull the `production` image.
- A registry or network failure must be logged but must not prevent ingestion
  when a previously pulled image is available locally.
- If no local image exists and the pull fails, the job must exit non-zero
  without attempting ingestion.
- The script must log the exact image digest used for each run.
- The script must prevent overlapping poller runs with a local lock.
- The script must run the one-shot poller container with `--rm`.
- The script must return a non-zero status when ingestion or polling fails.
- The script must add timestamps to run start, image selection, warning,
  success, and failure messages.
- Log retention must be bounded so `backend/poller.log` cannot grow
  indefinitely.
- In addition to the human-readable log, the server must maintain a local
  JSON Lines history file with one sanitized summary record per completed
  poller run.
- Each history record must contain:
  - Start and finish timestamps and total duration
  - Overall `success`, `partial_failure`, or `failure` status
  - Image digest and source commit
  - Ingestion email counts
  - eBird targets attempted and failed
  - eBird HTTP attempts and failures
  - Incident summarization status
  - The correlated `AlertPollRun` identifier, when one was created
- A run history record must not contain email subjects or bodies, raw API
  parameters or responses, provider error bodies, stack traces, credentials,
  or other secrets.
- The local structured history must retain at least the latest 90 days of
  completed runs using bounded rotation or pruning.
- Failure to write the structured history must be visible in the
  human-readable log and the job's final status.
- Human-readable logs must rotate daily, be compressed after rotation, and
  retain the latest 14 daily files.

### Separation of deployment and ingestion

- The cron job must no longer run `git pull`.
- The cron job must no longer build a Docker image.
- The poller must no longer wake Render before local ingestion.
- Render health monitoring, if desired, must remain a separate availability
  check and must not gate local ingestion.
- Source checkout updates on the server must be manual and must use
  `git pull --ff-only`.

### Incident summarization

- `GROQ_API_KEY` must be supplied to the poller at runtime from the existing
  server-local `backend/.env.poller` file.
- The Groq key must not be stored in GitHub, GHCR, the image, Compose source,
  build arguments, image labels, or logs.
- After eBird polling has written new sightings and updated incidents, the
  poller must run the existing incident summarization cycle.
- Summarization must be awaited before the one-shot container exits. It must
  not be started as an unobserved background promise.
- The existing freshness behavior must be preserved: incidents whose summary
  is current must be skipped, and incidents with newer sightings may be
  summarized again.
- A missing `GROQ_API_KEY` must be reported as a configuration error before
  the poller starts production work.
- A Groq or summarization failure must not roll back successfully committed
  email, sighting, incident, or polling data.
- A run with successful ingestion but incomplete summarization must be logged
  as a partial failure and return a non-zero status so monitoring can detect
  it. It must not automatically repeat ingestion with another image.
- Existing Gemini fallback support may remain available when
  `GEMINI_API_KEY` is configured, but Gemini is not required by this track.
- OpenRouter integration is not part of the current codebase and is out of
  scope.

### eBird API call diagnostics

- Every target-specific eBird request made by the production poller must
  create an `EbirdApiCallLog` record for each HTTP attempt, including retries.
- Each call record must include the existing endpoint, sanitized parameters,
  HTTP status, duration, attempt number, maximum attempts, response item
  count, sanitized error, and timestamp fields.
- Poller call records must be correlated with both the containing
  `AlertPollRun` and the corresponding `AlertTargetPollAttempt`.
- The implementation must add the minimum Prisma schema fields, relations,
  indexes, and production-safe PostgreSQL migration required for those
  correlations.
- Existing ingestion/enrichment relationships on `EbirdApiCallLog` must
  remain supported.
- The eBird API token and request authorization headers must never be stored
  in the database or written to local logs.
- Error bodies must use the existing sanitization boundary before
  persistence. Logs must not expose connection strings, passwords, tokens,
  stack traces containing local paths, or other secrets.
- The poller's local log must print the `AlertPollRun` identifier so an
  operator can correlate a cron run with detailed Neon records.
- Target-level output must identify the bird, region, final status, and a
  sanitized final error when the target fails.
- Existing 30-day pruning of detailed eBird call logs must remain in effect
  and cover records produced by target polling.
- A failure to persist diagnostic logging must not silently convert a failed
  eBird request into a successful result. Logging persistence behavior and
  its effect on the target status must be explicit and covered by tests.

### Rollback

- Every run must record the immutable digest it used.
- The run script must check for a Git-ignored, server-local, non-secret image
  override file. When absent, it must use the moving `production` tag.
- The override file must select a previously published immutable image digest.
- A small operator command must support showing status, activating an
  override, and clearing an override without editing cron or Compose.
- Logs and structured run history must clearly identify when an override is
  active.
- Rollback must not require rebuilding the image.
- Automatic retry with an older image after a partially completed poller run
  is out of scope because it could duplicate or conflict with database work.

### Schedule

- Cron must run at midnight, 2:00 AM, and every two hours from 6:00 AM through
  10:00 PM in the server's `America/New_York` timezone.
- The intended daily hours are:
  `0, 2, 6, 8, 10, 12, 14, 16, 18, 20, 22`.
- The four-hour 2:00 AM–6:00 AM interval is an intentional overnight quiet
  window; there must be no 4:00 AM run.

## Non-Functional Requirements

- **Security:** No new inbound port, Tailscale Serve route, Funnel, webhook, or
  self-hosted Actions runner may be introduced.
- **Least privilege:** The server must pull the public image anonymously and
  must not store a GitHub package token.
- **Reliability:** GHCR availability must not become a hard dependency for
  each ingestion after at least one valid image has been cached locally.
- **Architecture:** The published image must support `linux/arm64`, matching
  the Apple Silicon Docker host.
- **Traceability:** A local log entry must connect each run to both an image
  digest and source commit, and connect the cron run to its `AlertPollRun`.
- **Machine readability:** Historical run summaries must use a documented,
  stable JSON Lines schema so future local monitoring can consume multiple
  runs without parsing human-oriented logs.
- **Idempotency:** Re-running the GitHub workflow for the same commit must not
  create a different source identity, even if the registry manifest digest is
  replaced by a rebuild.
- **Data safety:** The change must not modify Neon data, delete Docker volumes,
  or read or change `backend/.env.poller`.
- **Secrets:** No `.env.poller` values may be copied into the image, GitHub
  workflow, build arguments, labels, or Actions logs.
- **Completion:** A successful production job means ingestion, target polling,
  sighting/incident updates, and the required summarization cycle all reached
  a successful terminal state.

## Failure Behavior

| Failure | Required behavior |
|---|---|
| GitHub build or validation fails | Do not update `production`; retain the last published image |
| GHCR publish fails | Report a failed workflow; retain the prior `production` image |
| GHCR cannot be reached by the server | Log a warning and use the cached image if present |
| Pull succeeds but no local image can be inspected | Stop before ingestion and exit non-zero |
| Another poller run holds the lock | Do not start a second container; log and exit non-zero |
| Poller exits non-zero | Preserve its logs, record failure, and return non-zero |
| Newly published image fails during ingestion | Do not automatically rerun ingestion; require operator review and optional rollback |
| `GROQ_API_KEY` is missing | Stop before production work, log a configuration error, and exit non-zero |
| Groq or summarization fails after ingestion | Preserve committed ingestion data, log a partial failure, and exit non-zero without automatically rerunning ingestion |
| An eBird HTTP attempt fails | Persist its sanitized retry-level diagnostics and continue according to the existing retry policy |
| All retries for a target fail | Mark the target attempt failed, include a sanitized error, and allow the remaining independent targets to run |
| Diagnostic persistence fails | Make the failure visible in the target/run result; do not report an unconditional success |
| Structured local history cannot be written | Preserve the human-readable error and return a detectable failed or partial result |

## Test Strategy

- Validate the workflow syntax and Compose configuration without accessing
  production secrets.
- Build the poller image for `linux/arm64` and inspect its declared platform.
- Verify the built image can start its Node entrypoint without embedding
  `.env.poller`.
- Test the server run script with Docker and registry commands stubbed at the
  process boundary:
  - Successful pull selects and logs the new digest.
  - Failed pull uses an existing local image.
  - Failed pull with no local image exits before running the poller.
  - Existing lock prevents a second run.
  - Poller failure is returned to cron.
- Test the production poller orchestration with Groq mocked at the network
  boundary:
  - New or stale incidents are summarized after sighting/incident writes.
  - Incidents with current summaries are skipped.
  - A missing Groq key fails preflight without starting ingestion.
  - A Groq failure preserves committed ingestion work but produces a
    detectable partial-failure result.
- Test eBird call diagnostics at the network and database boundaries:
  - Successful calls persist endpoint, sanitized parameters, status,
    duration, attempt count, response count, poll run, and target attempt.
  - A retry sequence persists each HTTP attempt in order.
  - A final target failure is isolated from later targets and retains a
    sanitized final error.
  - Authorization headers and API tokens are absent from persisted and local
    logs.
  - Diagnostic records are removed by the existing 30-day retention process.
  - Diagnostic persistence failure produces an observable failed or partial
    result rather than false success.
- Test structured local run history:
  - Successful, partial, and failed runs append one valid JSON record.
  - Required counts, identifiers, image details, timestamps, and duration are
    present.
  - Secrets and unsanitized provider data are absent.
  - Records older than the configured 90-day retention are pruned without
    removing newer history.
  - A history-write failure is visible in the final result.
- Manually verify a non-production `workflow_dispatch` build publishes a SHA
  tag before allowing the workflow to move the `production` tag.
- Manually run the server script once under supervision and confirm:
  - The digest and source revision are logged.
  - The one-shot container exits successfully and is removed.
  - The ingestion result appears in Neon-backed status data.
  - Eligible incident summaries are updated through Groq.
  - Render is not awakened as a prerequisite.

## Acceptance Criteria

- [ ] A relevant push to the default branch produces a
      `linux/arm64` GHCR image.
- [ ] The image has an immutable commit-SHA tag and source revision metadata.
- [ ] Only a successful gated build updates the `production` tag.
- [ ] Pull requests from the public repository cannot publish images or
      execute commands on the home server.
- [ ] The home server has no GitHub Actions runner and exposes no new ingress.
- [ ] The scheduled job performs no Git pull and no local image build.
- [ ] A temporary GHCR failure still permits a run using the cached image.
- [ ] Every scheduled run logs the selected image digest and source commit.
- [ ] Every scheduled run logs its `AlertPollRun` identifier.
- [ ] Every target-specific eBird HTTP attempt, including retries, is
      correlated with its poll run and target attempt in Neon.
- [ ] Failed targets retain sanitized diagnostics while independent targets
      continue.
- [ ] Detailed target-polling call records follow the existing 30-day
      retention policy.
- [ ] Every completed run appends one sanitized, machine-readable local
      history record.
- [ ] Local structured run history retains at least 90 days and remains
      bounded.
- [ ] Concurrent scheduled runs cannot overlap.
- [ ] Poller failures remain visible as non-zero cron results and in the local
      log.
- [ ] The production poller requires its server-local Groq key and awaits the
      incident summarization cycle before exiting.
- [ ] A summarization failure is reported as a partial failure without
      rolling back or automatically repeating successful ingestion work.
- [ ] The Render backend is no longer woken or required by local ingestion.
- [ ] A documented operator procedure can select a prior SHA tag or digest
      without rebuilding.
- [ ] `backend/.env.poller` remains local, ignored, and absent from the image.
- [ ] The affected Compose service is verified after the change without
      deleting or recreating persistent data.

## Integration Touchpoints

### Components this track must update

| Component | Current status | After this track |
|---|---|---|
| GitHub Actions | No poller image workflow | Builds and publishes gated ARM64 images to GHCR |
| `backend/Dockerfile.poller` | Built locally by cron | Built in GitHub Actions; remains the image definition |
| `backend/docker-compose.poller.yml` | Contains a local `build` section | References the GHCR poller image |
| Poller package command | Wakes Render unless explicitly disabled | Runs local ingestion without a Render wake |
| Incident summarization | Runs only from the Render ingestion wrapper | Runs as an awaited local poller stage using the server-local Groq key |
| `EbirdApiCallLog` | Supports ingestion/enrichment context, but target polling passes no context | Also correlates retry-level calls to poll runs and target attempts |
| Prisma schema and PostgreSQL migrations | No eBird-call relation to alert polling | Adds nullable alert poll/run relations and supporting indexes |
| Home-server cron | Pulls Git, builds, wakes Render, and runs | Invokes one server-owned run script |
| `backend/poller.log` | Receives only the final command's redirected output | Receives bounded, timestamped lifecycle and poller output |
| Local structured run history | Does not exist | Stores bounded JSONL summaries for future monitoring |
| Home-server changelog | Describes the current inline cron flow | Records the image-delivery and cron architecture |

### New data this track produces

| Data | Where stored | Purpose |
|---|---|---|
| Poller container image | GHCR | Reusable, prebuilt ingestion runtime |
| Commit SHA tag | GHCR | Immutable source-version selection |
| `production` tag | GHCR | Latest successful default-branch build discovery |
| Image digest and revision | Local poller log | Audit and rollback identification |
| Optional image override | Server-local non-secret config | Manual rollback selection |
| Poll run and target-attempt references | Neon `EbirdApiCallLog` | Correlate each eBird HTTP attempt with scheduled work |
| Sanitized run summary | Server-local JSONL history | Supports future multi-run health and trend views |

### Components this track does NOT touch

- Existing Neon application data, except for the additive logging migration
  and new diagnostic records defined by this track.
- Render backend deployment and sleep policy.
- Vercel frontend deployment.
- Poller ingestion, target-selection, or eBird polling algorithms.
- IMAP, Neon, eBird, Groq, or Gemini credentials.

## Out of Scope

- Immediate deployment through a self-hosted GitHub Actions runner.
- A public webhook or SSH access from GitHub-hosted runner IP addresses.
- Tailscale access for GitHub-hosted runners.
- The Homepage health widget, its presentation, or a monitoring API.
- Multi-architecture image publishing beyond `linux/arm64`.
- Keeping Render continuously awake.
- Adding OpenRouter or another AI provider.
- Automatic application-level rollback after a poller has started.
- Refactoring ingestion or eBird polling performance.

## Implementation Decisions

1. **CI database:** Use a disposable PostgreSQL service in GitHub Actions and
   require the full backend suite to pass before publishing.
2. **Retention:** Keep 14 compressed daily human-readable logs, 90 days of
   structured local run summaries, and 30 days of detailed Neon eBird call
   diagnostics.
3. **Rollback:** Use a Git-ignored local image-override file managed through a
   small operator command. Rollback remains a deliberate manual decision.
4. **Schedule:** Run at `0, 2, 6, 8, 10, 12, 14, 16, 18, 20, 22` local time,
   intentionally skipping 4:00 AM.

## Tech Stack Notes

This track adds GitHub Actions, Docker Buildx, and GitHub Container Registry
as delivery infrastructure. It does not add an application runtime
dependency. `conductor/tech-stack.md` must be updated before implementation
to record GHCR and the ARM64 build target.
