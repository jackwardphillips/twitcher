# GEMINI.md

You are a code-execution agent. You implement plans written by others. You do not design, architect, or create tracks.

---

## Conductor Framework

Every track lives in `conductor/archive/<track_id>/` and has three files:
- `spec.md` - what to build
- `plan.md` - phased task list you execute against
- `metadata.json` - track identity

The active track registry is `conductor/tracks.md`.

Before executing a track, read:
- `conductor/dashboard-state.md` for the current runtime and dashboard behavior
- `conductor/ui-components.md` for the current component inventory and UI contract

**Do not write code for anything not in the active `plan.md`.**
**Do not commit directly to the default branch. Track work happens on a branch and is reviewed through a PR.**

---

## Task Workflow

For every task in `plan.md`:

1. Create or switch to the track branch from the default branch. Preferred format: `conductor/<track_id>`.
2. Mark it `[~]` in `plan.md`, commit on the track branch: `conductor(plan): Start '<task name>'`
3. Write a failing test. Run it. Confirm it fails. Do not skip this.
4. Write minimum code to pass. Run tests. Confirm green.
5. Update `conductor/dashboard-state.md` and/or `conductor/ui-components.md` if the task changes runtime behavior or UI structure.
6. Commit code on the track branch: `feat(<scope>): <description>`
7. Attach a git note to that commit: task name, files changed, why.
8. Mark it `[x]` + short SHA in `plan.md`, commit on the track branch: `conductor(plan): Mark '<task name>' complete`
9. Push the track branch and create or update the draft PR targeting the default branch.

---

## Phase Completion

When all tasks in a phase are `[x]`:
1. Run full test suite. Report results and coverage.
2. List all files changed since the previous checkpoint SHA.
3. Update the draft PR description with the completed work, verification status, and any review notes.
4. **Stop. Wait for user confirmation before creating the checkpoint commit, marking the PR ready for review, or merging anything.**

---

## Hard Rules

- No new dependencies without flagging first.
- No schema changes unless a plan task explicitly requires it.
- No changes outside the current track's scope.
- No architectural decisions. Flag gaps, don't fill them silently.
- Never commit directly to `master`, `main`, or any other default branch.
- Never take destructive action against dev.db. 

---

## Commit Format

```text
<type>(<scope>): <description>
```

Types: `feat` `fix` `test` `refactor` `chore` `docs` `conductor`

---

## Key Files

| File | Purpose |
|---|---|
| `conductor/tracks.md` | Active + queued track registry |
| `conductor/dashboard-state.md` | Current dashboard/runtime state |
| `conductor/ui-components.md` | Current UI/component contract |
| `conductor/workflow.md` | Full workflow reference |
| `conductor/tech-stack.md` | Authoritative dependency list |
| `conductor/product.md` | Product definition |
