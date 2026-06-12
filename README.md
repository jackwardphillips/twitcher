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
- `TEST_DATABASE_URL` for tests; use a disposable PostgreSQL database
- `IMAP_HOST`
- `IMAP_PORT`
- `IMAP_USER`
- `IMAP_PASS`
- `IMAP_SECURE`
- `RUN_STARTUP_INGESTION=false`
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

The old SQLite database files are intentionally left in `backend\` as backups. The preserved SQLite schema is `backend\prisma\schema.sqlite.prisma`, and the old SQLite migrations remain under `backend\prisma\migrations`. The active Postgres migrations are under `backend\prisma\postgres-migrations`.

## Run

From the repo root:

```powershell
npm start
```

That starts:

- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173`

The frontend proxies `/api` requests to the backend during local development.

### Run Offline Against Local SQLite

Use this mode when you want to test the dashboard against the populated local SQLite backup without hitting IMAP, eBird, iNaturalist, Groq, or Gemini.

Start the app from the repo root:

```powershell
npm.cmd run dev
```

That generates the SQLite Prisma client, uses `backend\dev.db`, sets `LOCAL_OFFLINE=true`, disables startup ingestion, blocks `POST /api/ingest`, and skips background photo refreshes from `/api/incidents`.

`npm.cmd start` remains the normal environment-backed dev command and will use the `DATABASE_URL` from `backend\.env`. To switch back to PostgreSQL development after running local SQLite mode, regenerate the default client from `backend\`:

```powershell
npx.cmd prisma generate
```

## Tests

```powershell
npm.cmd test --prefix backend
npm.cmd test --prefix frontend
```

Backend tests require `TEST_DATABASE_URL` and may clear data, so do not point it at production.

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

The current local SQLite backup contains populated data, but the Postgres rebuild is intended to use source systems instead of direct SQLite migration. At the time of migration analysis, `backend\dev.db` contained 1161 rarity codes, 24887 sightings, 683 incidents, and 122 incoming emails. The references folder contains the ABA checklist CSV and 3 local `.eml` files; full historical email reconstruction depends on IMAP access.

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

- Prisma datasource provider changed from SQLite to PostgreSQL.
- Prisma 7 no longer allows `url` in `schema.prisma`; `DATABASE_URL` is read from `prisma.config.ts`, and runtime connections use `@prisma/adapter-pg`.
- A new Postgres initial migration lives in `backend\prisma\postgres-migrations`.
- Existing SQLite files and SQLite migration history were not deleted.
- `statesCovered` remains a `String` containing JSON text to preserve current application behavior with minimal schema change.

## Risks

- Running `seed:emails` repeatedly creates duplicate sightings because `saveSightings` does not enforce a source-level unique key.
- Running both `seed:emails` and `backfill:emails` can duplicate sightings if the same alerts exist in both local `.eml` files and IMAP.
- `backfill:emails` needs valid IMAP credentials; without them, full historical production data cannot be rebuilt from source.
- `backfill:summaries` needs `GROQ_API_KEY` or `GEMINI_API_KEY`; without either key it exits without populating summaries.
- Tests now require a disposable PostgreSQL `TEST_DATABASE_URL` because the old SQLite test copy flow is incompatible with the active Postgres Prisma client.

## Notes

- Startup ingestion runs only when `RUN_STARTUP_INGESTION=true`; keep it `false` in production unless explicitly supervised.
- The dashboard currently renders incident cards and map pins, but it does not yet have a drill-down detail view.
- The "Discuss" link on cards is still a static Discord link, not incident-specific routing.
