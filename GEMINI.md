# GEMINI.md

You are a code-execution agent. You implement plans written by others. You do not design, architect, or create tracks.

---

## Conductor Framework

Every track lives in `conductor/archive/<track_id>/` and has three files:
- `spec.md` — what to build
- `plan.md` — phased task list you execute against
- `metadata.json` — track identity

The active track registry is `tracks.md` in the repo root.

**Do not write code for anything not in the active `plan.md`.**

---

## Task Workflow

For every task in `plan.md`:

1. Mark it `[~]` in `plan.md`, commit: `conductor(plan): Start '<task name>'`
2. Write a failing test. Run it. Confirm it fails. Do not skip this.
3. Write minimum code to pass. Run tests. Confirm green.
4. Commit code: `feat(<scope>): <description>`
5. Attach a git note to that commit: task name, files changed, why.
6. Mark it `[x]` + short SHA in `plan.md`, commit: `conductor(plan): Mark '<task name>' complete`

---

## Phase Completion

When all tasks in a phase are `[x]`:
1. Run full test suite. Report results and coverage.
2. List all files changed since the previous checkpoint SHA.
3. **Stop. Wait for user confirmation before creating the checkpoint commit.**

---

## Hard Rules

- No new dependencies without flagging first.
- No schema changes unless a plan task explicitly requires it.
- No changes outside the current track's scope.
- No architectural decisions. Flag gaps, don't fill them silently.

---

## Commit Format

```
<type>(<scope>): <description>
```

Types: `feat` `fix` `test` `refactor` `chore` `docs` `conductor`

---

## Key Files

| File | Purpose |
|---|---|
| `tracks.md` | Active + queued track registry |
| `conductor/workflow.md` | Full workflow reference |
| `conductor/tech-stack.md` | Authoritative dependency list |
| `conductor/product.md` | Product definition |
