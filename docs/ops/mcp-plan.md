# MCP Monitoring Plan

Default access should be read-only monitoring. Add write capabilities only after the operator approves a specific task.

## GitHub MCP

Credentials needed:

- GitHub app installation or fine-scoped token.

Allowed read-only operations:

- Read repository metadata.
- Read branches, commits, pull requests, issues, checks, workflow runs, and workflow logs.

Write operations to keep disabled by default:

- Push commits.
- Merge pull requests.
- Re-run workflows.
- Edit repository settings or secrets.

Safety concerns:

- Workflow logs can contain accidental secrets.
- Re-running workflows may consume CI quota or deploy if workflows are coupled to deployment.

## Vercel MCP

Credentials needed:

- Vercel token scoped to the project/team.

Allowed read-only operations:

- List projects and deployments.
- Inspect latest production deployment state.
- Read build/runtime logs.
- Read environment variable names without values.

Write operations to keep disabled by default:

- Deploy, rollback, alias changes, domain changes, and environment variable mutation.

Safety concerns:

- Logs can contain sensitive request data.
- Rollbacks and aliases affect production traffic.

## Render API Wrapper MCP

Credentials needed:

- Render API key stored outside the repo.

Allowed read-only operations:

- List services.
- Inspect backend service metadata.
- List deploys and latest deploy status.
- Read logs if available.
- Inspect cron jobs and schedules.
- List environment variable names without values.

Write operations to keep disabled by default:

- Deploy, restart, suspend, resume, scale, cron edits, and environment variable mutation.

Safety concerns:

- Restart/deploy actions can cause downtime.
- Environment values must never be printed or stored in logs.

## Neon API Wrapper MCP

Credentials needed:

- Neon API key stored outside the repo.
- Read-only database connection role if available.

Allowed read-only operations:

- Inspect project, branch, compute, and quota status.
- Check database connectivity.
- Report database size and row counts.
- Inspect schema and index metadata.

Write operations to keep disabled by default:

- Branch creation/deletion, compute changes, role/password changes, migrations, and data mutation.

Safety concerns:

- Database URLs are secrets.
- Query access should use a read-only role when possible.
- Unbounded queries can consume Neon quota; monitoring queries should use counts and metadata only.
