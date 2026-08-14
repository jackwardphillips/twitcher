# Rare Bird Dashboard

Rare Bird Dashboard is a personal birding dashboard for tracking ABA rarity alerts from eBird. The app ingests ABA Rarities emails, parses sightings, enriches them with eBird data when possible, clusters related sightings into incident records, and shows those incidents in a React dashboard with a Leaflet map and card list.

## Current Capabilities

- Email ingestion from an IMAP inbox for eBird ABA Rarities alerts
- Parsing of quoted-printable `.eml` alert bodies into structured sightings
- PostgreSQL storage through Prisma
- Optional eBird API enrichment for coordinates, checklist IDs, and related metadata
- Incident clustering by normalized species name and proximity
- Background incident summarization using Groq first, with Gemini fallback
- Dashboard filtering by ABA rarity code and a 50 km "Near Me" toggle

## Stack

- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, Vitest
- Frontend: React, TypeScript, Vite, Leaflet, React-Leaflet
- Automation: IMAP via `imapflow`

## Local Setup

### Prerequisites

- Node.js
- npm

### Install

```bash
npm run install:all
```

### Backend Environment

Create `backend/.env` from `backend/.env.example` and set what you need:

- `DATABASE_URL` for the application database
- `PRODUCTION_DATABASE_URL` for branch safety checks
- `NEON_API_KEY`, `NEON_PROJECT_ID`, and `NEON_PRODUCTION_BRANCH`
- `NEON_DEVELOPER` if your system username is not suitable for a branch name
- `IMAP_HOST`
- `IMAP_PORT`
- `IMAP_USER`
- `IMAP_PASS`
- `IMAP_SECURE`
- `RUN_STARTUP_INGESTION=false`
- `DISABLE_EXTERNAL_SIDE_EFFECTS=false`
- `BACKEND_URL` for ops scripts
- `FRONTEND_URL` for ops scripts
- `EBIRD_API_KEY` for enrichment
- `GROQ_API_KEY` and/or `GEMINI_API_KEY` for summaries

### Database

The backend is configured for PostgreSQL. A Neon connection string should include SSL:

```powershell
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
```

Run Prisma migrations from `backend\` as needed:

```powershell
npx.cmd prisma migrate dev
```

The active migrations are under `backend\prisma\postgres-migrations`.

## Run

From the repo root:

```powershell
npm.cmd run dev
```

That starts:

- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173`

The frontend proxies `/api` requests to the backend during local development.

`npm.cmd run dev` creates or reuses `dev-<developer>` from production, injects its pooled connection string into the backend, disables startup ingestion and external side effects, and starts both applications. The connection string is never printed. Set `NEON_DEVELOPER` to give the persistent branch a stable explicit suffix.

`npm.cmd start` remains the environment-backed command for intentionally using the `DATABASE_URL` already configured in `backend\.env`.

## Tests

Database-free backend tests are safe to run without PostgreSQL:

```powershell
npm.cmd run test:unit --prefix backend
npm.cmd test --prefix frontend
```

Database-backed backend tests delete application data between tests. The command
creates a production-derived Neon branch, verifies its endpoint differs from
production, runs the destructive tier, and deletes the branch even when tests fail:

```powershell
npm.cmd run test:db --prefix backend
```

The read-only production-data smoke tier uses a separate fresh clone and verifies
representative API reads do not change core table counts:

```powershell
npm.cmd run test:smoke --prefix backend
```

`npm.cmd test --prefix backend` runs the unit tier first and then the guarded
database tier.

GitHub database validation requires repository secrets `NEON_API_KEY`,
`NEON_PROJECT_ID`, and `PRODUCTION_DATABASE_URL`, plus the repository variable
`NEON_PRODUCTION_BRANCH`. Fork pull requests keep the database-free validation
but skip the secret-backed database/image workflow. CI branches expire after six
hours as a cancellation fallback; normal completion and PR closure also delete
them.

## PostgreSQL Rebuild

Run these commands from `backend\` against an empty PostgreSQL database:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run seed:rarity
npm.cmd run backfill:emails
npm.cmd run backfill:summaries
npm.cmd run check:counts
```

Step notes:

- `seed:rarity` is required and idempotent; it upserts ABA checklist rows.
- `backfill:emails` is required for historical production data and is idempotent by `IncomingEmail.messageId`.
- `backfill:summaries` is required for chase intel summaries and is safe to rerun; it skips incidents whose summaries are current.
- `seed:emails` is optional local fixture loading from `references\*.eml`; it is not idempotent for sightings and should not be run in the same production rebuild as `backfill:emails`.
- `check:counts` verifies table counts after population.

The references folder contains the ABA checklist CSV and 3 local `.eml` files; full historical email reconstruction depends on IMAP access.

## Deployment

### Neon

1. Create a Neon project and database.
2. Copy the pooled or direct connection string.
3. Ensure the URL ends with `sslmode=require`.
4. Store it as `DATABASE_URL`; do not commit it.

### Render Backend

Use the `backend` directory as the service root.

Build command:

```powershell
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

Start command:

```powershell
node dist/index.js
```

Set these Render environment variables:

- `DATABASE_URL`
- `IMAP_HOST`
- `IMAP_PORT`
- `IMAP_USER`
- `IMAP_PASS`
- `IMAP_SECURE`
- `RUN_STARTUP_INGESTION=false`
- `DISABLE_EXTERNAL_SIDE_EFFECTS=false`
- `EBIRD_API_KEY` if enrichment is enabled
- `GROQ_API_KEY` and/or `GEMINI_API_KEY` if summaries are enabled

Do not use `prisma db push --accept-data-loss` in production.

### Frontend

Deploy the frontend to Vercel or Netlify and point its API configuration/proxy at the Render backend URL.

### Ops Checks

These commands are read-only monitoring checks:

```powershell
npm run ops:health
npm run ops:db
npm run ops:db-counts
npm run ops:ingestion
npm run ops:env
```

Set `BACKEND_URL` and `FRONTEND_URL` before checking production. Keep provider tokens such as `RENDER_API_KEY`, `NEON_API_KEY`, and `VERCEL_TOKEN` out of git.

## Migration Notes

- Prisma uses PostgreSQL through `@prisma/adapter-pg`.
- Prisma 7 no longer allows `url` in `schema.prisma`; `DATABASE_URL` is read from `prisma.config.ts`, and runtime connections use `@prisma/adapter-pg`.
- A new Postgres initial migration lives in `backend\prisma\postgres-migrations`.
- `statesCovered` remains a `String` containing JSON text to preserve current application behavior with minimal schema change.

## Risks

- Running `seed:emails` repeatedly creates duplicate sightings because `saveSightings` does not enforce a source-level unique key.
- Running both `seed:emails` and `backfill:emails` can duplicate sightings if the same alerts exist in both local `.eml` files and IMAP.
- `backfill:emails` needs valid IMAP credentials; without them, full historical production data cannot be rebuilt from source.
- `backfill:summaries` needs `GROQ_API_KEY` or `GEMINI_API_KEY`; without either key it exits without populating summaries.
- Database tests run against disposable production-derived Neon branches.

## Notes

- Startup ingestion runs only when `RUN_STARTUP_INGESTION=true`; keep it `false` in production unless explicitly supervised.
- The dashboard currently renders incident cards and map pins, but it does not yet have a drill-down detail view.
- The "Discuss" link on cards is still a static Discord link, not incident-specific routing.

## Project Documentation

- `AUDIT.md` is the current engineering backlog and risk register.
- `docs/CHANGELOG.md` records shipped changes.
- `docs/ops/` contains operational runbooks and provider-safety notes.
- `conductor/archive/` is legacy history, not a current backlog. Useful details
  will move to the changelog before the archive is removed.
