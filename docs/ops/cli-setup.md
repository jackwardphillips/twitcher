# Ops CLI Setup

Monitoring is read-only by default. Do not grant an agent permission to redeploy, mutate environment variables, rotate credentials, trigger ingestion, or write database data until read-only visibility is working.

## GitHub CLI

Install and authenticate:

```powershell
winget install GitHub.cli
gh auth login
```

Read-only checks:

```powershell
gh repo view
gh run list
gh run view <run-id>
```

Required capability: inspect repository metadata, workflow runs, workflow logs, branches, commits, issues, and pull requests.

## Vercel CLI

Install and authenticate:

```powershell
npm i -g vercel
vercel login
```

Read-only checks:

```powershell
vercel ls
vercel inspect <deployment-url>
vercel logs <deployment-url>
```

Use `vercel inspect` to confirm the latest deployment state and build settings. Use `vercel logs` for recent runtime errors. Do not run deploy, rollback, env add, env rm, or env pull in an agent workflow without explicit approval.

## Render CLI/API

Render does not provide an official general-purpose CLI suitable for this repo's default Windows PowerShell environment. Use Render's HTTPS API with a Render API key stored outside the repo.

Set the token in the shell or secret store:

```powershell
$env:RENDER_API_KEY="..."
```

Read-only API capabilities to implement or use:

- List services.
- List deploys for the backend service.
- Fetch recent logs if the account/API plan supports log access.
- Inspect environment variable names without printing values.
- Inspect cron jobs and their schedules.

Do not commit the API key. Do not call deploy, restart, suspend, resume, env mutation, or cron mutation APIs without explicit approval.

## Neon CLI/API

Install and authenticate with the Neon CLI, or use the Neon API with an API key stored outside the repo:

```powershell
npm i -g neonctl
neonctl auth
```

Read-only checks:

```powershell
neonctl projects list
neonctl branches list --project-id <project-id>
neonctl databases list --project-id <project-id> --branch <branch-id>
```

Required capabilities:

- Project status.
- Branch status.
- Compute status.
- Quota and usage status if available for the account/API plan.
- Connection check using `DATABASE_URL` without printing it.
- Database size and row counts.

Do not commit Neon API keys, database URLs, passwords, or pooled connection strings.

## Local App Checks

From the repo root:

```powershell
npm run ops:health
npm run ops:db
npm run ops:db-counts
npm run ops:ingestion
npm run ops:env
```

For production checks, set URLs without committing them:

```powershell
$env:BACKEND_URL="https://<render-service>.onrender.com"
$env:FRONTEND_URL="https://twitcher-sigma.vercel.app"
npm run ops:health
```
