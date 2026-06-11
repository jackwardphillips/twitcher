# Ops Inventory

This inventory is based on committed repo configuration and docs. Provider dashboards may contain additional settings that are not present in the repo.

## Hosts

- Frontend host: Vercel, based on `.vercel/project.json`.
- Frontend production URL: `https://twitcher-sigma.vercel.app`, based on backend CORS allowlist.
- Backend host: Render, based on README deployment docs.
- Backend production URL: not committed. Set `BACKEND_URL` before running production ops checks.

## Render Backend

Service root:

```powershell
backend
```

Build command:

```powershell
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

Start command:

```powershell
node dist/index.js
```

## Vercel Frontend

Repo-local Vercel metadata:

- Project name: `twitcher`
- Project metadata file: `.vercel/project.json`

No committed `vercel.json` was found. Frontend build command is inferred from `frontend\package.json`:

```powershell
npm run build
```

## Neon Database

Runtime configuration:

- `DATABASE_URL`
- PostgreSQL provider in `backend\prisma\schema.prisma`
- Prisma runtime adapter: `@prisma/adapter-pg`
- Connection string should include `sslmode=require`

No Neon project ID, branch ID, or API key is committed.

## Cron Ingestion

No committed cron configuration was found. Cron should call an approved ingestion entrypoint only after read-only monitoring is working.

Current ingestion entrypoints:

- `POST /api/ingest`
- `backend\src\scripts\backfill-emails.ts`
- Startup ingestion only when `RUN_STARTUP_INGESTION=true`

## Required Environment Variables

- `DATABASE_URL`
- `TEST_DATABASE_URL` for tests
- `IMAP_HOST`
- `IMAP_PORT`
- `IMAP_USER`
- `IMAP_PASS`
- `IMAP_SECURE`
- `RUN_STARTUP_INGESTION`

Optional environment variables:

- `BACKEND_URL`
- `FRONTEND_URL`
- `EBIRD_API_KEY`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `RENDER_API_KEY`
- `NEON_API_KEY`
- `VERCEL_TOKEN`

## Health Endpoints

- `GET /health`: process health, no database query.
- `GET /api/health`: full health with database latency and latest ingestion state.

## Ingestion Endpoints

- `POST /api/ingest`: manual ingestion trigger. This mutates data and should not be used by read-only monitoring agents.
- `GET /api/ingestion-status`: latest ingestion state. This is read-only.

## Relevant Logs

Startup and ingestion logs:

- `Server is running on port ...`
- `Startup ingestion disabled.`
- `Running startup email ingestion...`
- `Startup ingestion complete: ...`
- `Startup ingestion failed: ...`
- `Triggering ingestion via API...`
- `Ingestion result: ...`
- `Ingestion failed via API: ...`
- `Found ... new emails and ... pending emails.`
- `Processing email .../...`
- `Ingestion failed: ...`

Background processing logs:

- `Background summarization cycle failed: ...`
- `Background photo check/fetch failed for ...`

Prisma/Neon logs:

- Prisma errors are sanitized before API output.
- No Neon-specific application logs were found.

## Healthy Site Checklist

1. Set production URLs without committing them:

```powershell
$env:BACKEND_URL="https://<render-service>.onrender.com"
$env:FRONTEND_URL="https://twitcher-sigma.vercel.app"
```

2. Check frontend/backend HTTP health:

```powershell
npm run ops:health
```

3. Check database connectivity:

```powershell
npm run ops:db
```

4. Check table counts:

```powershell
npm run ops:db-counts
```

5. Check ingestion state:

```powershell
npm run ops:ingestion
```

6. Confirm environment safety:

```powershell
npm run ops:env
```

7. Confirm latest provider deploys manually or through read-only provider APIs:

```powershell
gh run list
vercel ls
vercel inspect <deployment-url>
```

8. In Render, confirm the latest backend deploy succeeded and `RUN_STARTUP_INGESTION=false`.

9. In Neon, confirm project/branch/compute status and quota are healthy.
