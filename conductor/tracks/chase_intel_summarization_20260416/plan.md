# Implementation Plan: Chase Intel Summarization

## Phase 1: Database Schema & Infrastructure [checkpoint: a21b2b7]

- [x] Task: Update Incident model in `schema.prisma` b57bacf
    - [x] Add `geminiSummary String?`
    - [x] Add `summaryGeneratedAt DateTime?`
    - [x] Run `npx.cmd prisma migrate dev --name add_chase_intel_summary`
- [x] Task: Configure Gemini API in `.env` 006175e
    - [x] Add `GEMINI_API_KEY` placeholder to `.env.example`
- [ ] Task: Conductor - User Manual Verification 'Schema & Infra' (Protocol in workflow.md)

## Phase 2: Summarization Service Implementation (Backend) [checkpoint: c2c1b38]

- [x] Task: Create `summarization-service.ts` and unit tests d132f17
    - [x] Write tests for comment aggregation (last 7 days).
    - [x] Implement `getRecentComments(incidentId: string)` logic.
    - [x] Write tests for prompt construction (handling existing summary).
    - [x] Implement Gemini API client wrapper with fallback for missing key.
    - [x] Implement `summarizeIncident(incidentId: string)` core logic.
    - [x] **Task:** Implement de-duplication logic: skip summarization if `summaryGeneratedAt` is already set to the current date.
- [x] Task: Implement Summarization Background Runner 73b5d80
    - [x] Write tests for triggering summarization after ingestion.
    - [x] Implement non-blocking background trigger in `ingestion-service.ts`.
- [ ] Task: Conductor - User Manual Verification 'Summarization Service' (Protocol in workflow.md)

## Phase 3: Frontend Implementation

- [x] Task: Update Frontend Incident Types 273c6b4
    - [x] Update `Incident` type definition in `frontend/src/lib/types.ts` (or equivalent).
- [x] Task: Update `IncidentCard` component and tests 5a448e7
    - [x] Write tests for rendering `geminiSummary` when present.
    - [x] Implement UI rendering with "Subtle & Distinct" styling (italic, smaller font).
    - [x] Ensure summary is hidden if null or empty.
- [ ] Task: Conductor - User Manual Verification 'Frontend Display' (Protocol in workflow.md)

## Phase 4: Backfill & Prompt Tuning

- [ ] Task: Create Backfill Script
    - [ ] Implement `scripts/backfill-summaries.ts` to process all active incidents.
- [ ] Task: Prompt Tuning & Final Validation
    - [ ] Run summarization on real data.
    - [ ] Adjust prompt instructions based on Gemini 2.0 Flash output quality.
- [ ] Task: Conductor - User Manual Verification 'Backfill & Tuning' (Protocol in workflow.md)