# Implementation Plan: Chase Intel Summarization

## Phase 1: Database Schema & Infrastructure

- [x] Task: Update Incident model in `schema.prisma` b57bacf
    - [x] Add `geminiSummary String?`
    - [x] Add `summaryGeneratedAt DateTime?`
    - [x] Run `npx.cmd prisma migrate dev --name add_chase_intel_summary`
- [x] Task: Configure Gemini API in `.env` 006175e
    - [x] Add `GEMINI_API_KEY` placeholder to `.env.example`
- [ ] Task: Conductor - User Manual Verification 'Schema & Infra' (Protocol in workflow.md)

## Phase 2: Summarization Service Implementation (Backend)

- [ ] Task: Create `summarization-service.ts` and unit tests
    - [ ] Write tests for comment aggregation (last 7 days).
    - [ ] Implement `getRecentComments(incidentId: string)` logic.
    - [ ] Write tests for prompt construction (handling existing summary).
    - [ ] Implement Gemini API client wrapper with fallback for missing key.
    - [ ] Implement `summarizeIncident(incidentId: string)` core logic.
    - [ ] **Task:** Implement de-duplication logic: skip summarization if `summaryGeneratedAt` is already set to the current date.
- [ ] Task: Implement Summarization Background Runner
    - [ ] Write tests for triggering summarization after ingestion.
    - [ ] Implement non-blocking background trigger in `ingestion-service.ts`.
- [ ] Task: Conductor - User Manual Verification 'Summarization Service' (Protocol in workflow.md)

## Phase 3: Frontend Implementation

- [ ] Task: Update Frontend Incident Types
    - [ ] Update `Incident` type definition in `frontend/src/lib/types.ts` (or equivalent).
- [ ] Task: Update `IncidentCard` component and tests
    - [ ] Write tests for rendering `geminiSummary` when present.
    - [ ] Implement UI rendering with "Subtle & Distinct" styling (italic, smaller font).
    - [ ] Ensure summary is hidden if null or empty.
- [ ] Task: Conductor - User Manual Verification 'Frontend Display' (Protocol in workflow.md)

## Phase 4: Backfill & Prompt Tuning

- [ ] Task: Create Backfill Script
    - [ ] Implement `scripts/backfill-summaries.ts` to process all active incidents.
- [ ] Task: Prompt Tuning & Final Validation
    - [ ] Run summarization on real data.
    - [ ] Adjust prompt instructions based on Gemini 2.0 Flash output quality.
- [ ] Task: Conductor - User Manual Verification 'Backfill & Tuning' (Protocol in workflow.md)