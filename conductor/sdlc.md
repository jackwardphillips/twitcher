# Software Development Lifecycle (SDLC)

## Purpose

This document defines a lightweight software development lifecycle for projects that use:

- a backlog or portfolio system such as GitHub Projects
- story-level planning artifacts such as `spec.md` and `plan.md`
- an implementation executor such as Conductor/Gemini
- human review at phase boundaries and before merge

It is intentionally project-agnostic. Each project may choose its own tools, folder layout, and delivery cadence, but should preserve the lifecycle stages, gates, and source-of-truth boundaries defined here.

## Core Principles

1. Planning and implementation are separate concerns.
2. A story should not enter implementation until it is actually ready.
3. Execution should happen in bounded phases with explicit pause points.
4. Phase advancement is a review decision, not an executor decision.
5. Source of truth must be explicit at every layer.
6. Risky work must be defined by invariants and failure modes, not by vague implementation tasks.

## Layers

### 1. Portfolio Layer

The portfolio layer manages what work exists and where it sits in the overall queue.

Examples:

- GitHub Projects
- issue tracker
- roadmap board

Owns:

- story intake
- prioritization
- status across all work
- dependencies between stories
- ownership and reviewer assignment

Does not own:

- implementation detail
- phase-by-phase execution notes
- detailed technical design

### 2. Story Planning Layer

The planning layer defines what a specific story means and how it will be approached.

Typical artifacts:

- `spec.md`
- `plan.md`

Owns:

- problem statement
- goals
- scope boundaries
- acceptance criteria
- failure model and invariants for risky work
- phased execution plan

Does not own:

- global queue status
- merge decisions
- implementation progress after execution begins, except where the plan is updated as a working record

### 3. Implementation Layer

The implementation layer executes an already-approved story plan.

Examples:

- Conductor
- an implementation-focused agent
- a developer following the approved plan

Owns:

- implementing the current approved phase
- running required verification for that phase
- summarizing changes and risks
- stopping at the agreed phase boundary

Does not own:

- deciding whether the phase is accepted
- deciding whether the next phase should begin
- changing story scope without review

### 4. Review Layer

The review layer decides whether the implementation work is acceptable.

Owns:

- spec review
- plan review
- phase gate review
- final code review

Outputs one of:

- approved, continue
- approved with follow-up work
- rejected, rework required

### 5. Integration Layer

The integration layer handles the final merge of approved work.

Owns:

- PR review outcome
- merge approval
- branch cleanup
- archive handoff

## Lifecycle Stages

### 1. Backlog

A story has been identified but is not yet planned in detail.

Required outcomes:

- clear short description of the requested change
- initial owner or sponsor
- rough priority

### 2. Spec Draft

The story is being defined.

Required outcomes:

- the problem is described clearly
- goals and out-of-scope items are recorded
- acceptance criteria are drafted

For risky work, the spec must also define:

- failure model
- invariants
- explicit non-goals

### 3. Plan Draft

The story has an approved direction and is being broken into executable phases.

Required outcomes:

- phases are sequenced
- tasks are concrete
- verification expectations are stated
- dependencies are visible

### 4. Ready

The story is approved for implementation but has not started execution.

This is the handoff point from planning to implementation.

### 5. In Progress

The current approved phase is being executed.

Execution continues only until the current phase reaches its review handoff point.

### 6. Phase Review

Execution pauses. A reviewer inspects the completed phase and decides whether the story may proceed.

Possible outcomes:

- accept phase and move to next phase
- accept with follow-up tasks
- reject and return for rework

### 7. Final Review

The story has completed its planned phases and is reviewed as a whole through the PR or equivalent review surface.

### 8. Merged

The approved implementation is integrated into the main line of development.

### 9. Archived

The story record is preserved for future reference and removed from active work queues.

## Source of Truth

Every project adopting this SDLC should define its sources of truth explicitly.

Recommended default model:

- Portfolio state: GitHub Projects or equivalent
- Story definition: `spec.md`
- Story execution plan: `plan.md`
- Active implementation discussion: branch + PR
- Executable truth: code, tests, migrations, and runtime behavior

No status should need to be maintained in more than one canonical place.

## Story States

Recommended story states for a portfolio board:

- Backlog
- Spec Draft
- Plan Draft
- Ready
- In Progress
- In Review
- Blocked
- Merged
- Archived

Projects may rename these states, but should preserve the same control points.

## Required Story Artifacts

Each story should have, at minimum:

- a specification artifact
- a plan artifact
- a branch once implementation begins
- a PR before merge

Optional supporting artifacts may include:

- decision notes
- verification notes
- screenshots
- migration notes
- rollback notes

## Specification Standard

Every story specification should include:

- overview
- problem statement
- goals
- out of scope
- acceptance criteria

Risky stories should also include:

- failure model
- invariants
- design decisions
- recovery or rollback expectations

Examples of risky work:

- concurrency
- retries
- background jobs
- migrations
- external integrations
- security-sensitive flows

## Plan Standard

Every story plan should:

- be broken into phases when the work is not trivially small
- describe concrete tasks, not vague aspirations
- define verification expectations for each phase
- make dependencies explicit
- identify where review handoff occurs

Phases should be defined around correctness boundaries where possible, not around cosmetic implementation slices.

Bad phase examples:

- "harden things"
- "misc fixes"
- "cleanup follow-up"

Better phase examples:

- "define failure model and invariants"
- "implement ownership and recovery semantics"
- "add adversarial verification for stale-worker behavior"

## Definition of Ready

A story is Ready only when:

- the story has been reviewed at the planning level
- the specification exists and is coherent
- the plan exists and is executable
- acceptance criteria are explicit
- dependencies are known
- open design questions are either resolved or intentionally deferred

For risky stories, Ready also requires:

- failure model documented
- invariants documented
- verification strategy described

## Definition of Done

A story is Done only when:

- planned implementation work is complete
- required tests and verification have run
- review feedback has been resolved or consciously deferred
- the final review has approved merge
- the work has been merged
- story artifacts are archived or finalized according to the project's conventions

## Conductor's Role

Conductor is an implementation framework, not the whole SDLC.

Conductor begins after a story reaches Ready.

Conductor owns:

- execution of the current approved phase
- implementation-time verification and reporting
- producing reviewable work
- stopping at phase boundaries

Conductor does not own:

- backlog management
- spec approval
- plan approval
- phase gate approval
- final merge approval

## Phase Execution Loop

The standard phase loop is:

1. reviewer approves the next phase for execution
2. implementation executes the approved phase
3. required verification for that phase is run
4. implementation summarizes outcomes, risks, and open issues
5. execution stops
6. reviewer decides whether to proceed, add follow-up work, or require rework

This loop repeats until the story is ready for final review.

## Phase Review Outcomes

Phase review should result in one of three explicit decisions:

1. Accept and proceed
2. Accept with follow-up tasks
3. Reject and rework

Review should evaluate:

- whether the intended acceptance criteria for the phase were met
- whether the implementation preserved story invariants
- whether tests prove the intended behavior instead of merely passing
- whether the next phase still makes sense given what was learned

## Risk-Driven Verification

For risky technical work, verification should be adversarial.

That means:

- proving the broken behavior is real when practical
- forcing overlap, failure, restart, delay, or stale-state conditions where relevant
- validating invariants directly

Examples:

- concurrency work should force overlap
- recovery work should simulate interruption and reclaim
- migration work should verify both upgrade and preserved data integrity

Passing tests are not sufficient if the tests do not meaningfully exercise the failure mode.

## Merge and Archive

After final review approval:

1. merge the story branch
2. close or update the portfolio record
3. finalize story artifacts
4. archive the story according to project conventions

Archive quality matters. Placeholder or incomplete story artifacts should not be treated as valid historical records.

## Adoption Notes

Projects adopting this SDLC should document:

- which tool owns portfolio state
- where story artifacts live
- who can approve readiness
- who performs phase review
- what verification is mandatory for backend, frontend, migrations, and risky systems work

This document is intended to provide the lifecycle shape. Each project should add implementation-specific conventions separately rather than bloating the SDLC itself.
