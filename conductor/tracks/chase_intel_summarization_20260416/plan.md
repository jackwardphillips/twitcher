# Implementation Plan: Chase Intel Summarization

## Phase 1: Database Schema & Infrastructure [checkpoint: a21b2b7]

- [x] Task: Update Incident model in `schema.prisma` b57bacf
    - [x] Add `geminiSummary String?`
    - [x] Add `summaryGeneratedAt DateTime?`
    - [x] Run `npx.cmd prisma migrate dev --name add_chase_intel_summary`
- [x] Task: Configure Gemini API in `.env` 006175e
    - [x] Add `GEMINI_API_KEY` placeholder to `.env.example`
- [x] Task: Conductor - User Manual Verification 'Schema & Infra' (Protocol in workflow.md) 968eafe
- [x] Task: Conductor - User Manual Verification 'Summarization Service' (Protocol in workflow.md) 968eafe
- [x] Task: Conductor - User Manual Verification 'Frontend Display' (Protocol in workflow.md) 968eafe

## Phase 4: Backfill & Prompt Tuning [checkpoint: 968eafe]

- [x] Task: Create Backfill Script d254d61
    - [x] Implement `scripts/backfill-summaries.ts` to process all active incidents.
- [x] Task: Prompt Tuning & Final Validation d254d61
    - [x] Run summarization on real data.
    - [x] Adjust prompt instructions based on Gemini 2.0 Flash output quality.
- [x] Task: Conductor - User Manual Verification 'Backfill & Tuning' (Protocol in workflow.md) 968eafe
    - Note: Identified open item to restrict summarization trigger to only fire when new emails are ingested.
- [x] Task: Address bugs raised by user. dea6e66
    - [x] Currently, the script is set to not resummarize a sighting already seen today. However in the current functionality, the sightings can be summarized before the email is sent, and then when there is actually new data, it won't summarize. This also is incondusive to testing the prompt. This feature should be removed.
    - [x] When prompt tuning is finished, the script should be set up to only summarize when a new email is ingested.
    - [x] Standardize Gemini response parsing and fix test mock failures.