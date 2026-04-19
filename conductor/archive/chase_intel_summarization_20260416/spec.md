# Specification: Chase Intel Summarization

## Overview
Automate the generation of concise (1–2 sentence) "chase intel" summaries for bird incidents using the Gemini 2.0 Flash API. This feature aims to extract actionable location and behavior signals from raw observer comments, filtering out noise and providing birders with immediate, high-value insights directly on the incident dashboard.

## User Stories
- As a birder, I want to see a summary of recent sightings so I can quickly understand where a bird was last seen and how it was behaving without reading dozens of individual comments.
- As a user, I want the dashboard to update these summaries automatically as new sightings are reported.

## Functional Requirements
- **Summarization Trigger:** 
    - Automatically triggered as a background process following the completion of the daily ingestion cycle.
    - Only processes incidents that have received new comments since their last `summaryGeneratedAt` timestamp.
    - Must not block or delay the ingestion response.
- **Input Construction:**
    - Aggregate all observer comments for the incident from the last 7 days.
    - Include the existing `geminiSummary` (if available) to allow for incremental refinement.
    - Skip the Gemini call if no comments exist in the 7-day window and no prior summary exists.
- **Prompt Logic:**
    - Instruction: Extract precise location cues (trails, landmarks, distances), timing patterns, and behavioral context.
    - Noise Filter: Ignore content-free phrases like "continuing," "still present," or "seen today."
    - Output Format: 1–2 sentences of plain prose.
    - Fallback: If no new signal is found in recent comments, retain the old summary. If no useful signal exists at all, return an empty string.
- **Storage:**
    - Field: `geminiSummary` (Nullable String) on the `Incident` model.
    - Field: `summaryGeneratedAt` (Nullable DateTime) on the `Incident` model.
    - Optimization: Do not re-summarize if `summaryGeneratedAt` is already set to the current date.
- **UI Display:**
    - Render the `geminiSummary` on the incident card, positioned directly below the location line.
    - Style: Subtle and distinct treatment (italicized, slightly smaller text).
    - Conditional: Only render if `geminiSummary` is present and non-empty.
- **One-Time Backfill:**
    - Upon deployment, trigger a one-time summarization for all active incidents (incidents with sightings in the last 7 days).

## Non-Functional Requirements
- **API Management:** 
    - `GROQ_API_KEY` or `GEMINI_API_KEY` must be stored in `.env` and never hardcoded.
    - If no API key is configured, the summarization service must skip summarization silently and log a warning. The ingestion flow must remain unaffected.
- **Model:** Use `llama-3.3-70b-versatile` via Groq for high speed, or `gemini-2.0-flash` as a fallback.
- **Resilience:** Log summarization failures on a per-incident basis without interrupting the broader ingestion or summarization process. Failed incidents will naturally be retried during the next ingestion cycle.

## Acceptance Criteria
- [ ] New incidents with comments receive a `geminiSummary` after ingestion.
- [ ] Existing incidents update their summary when new comments are ingested.
- [ ] Summaries correctly filter out "noise" (e.g., "still here") while preserving "signal" (e.g., "by the big oak").
- [ ] The UI renders summaries in the specified "Subtle & Distinct" style.
- [ ] No Gemini API calls are made for incidents with no comments.
- [ ] Summarization runs in the background and does not block the ingestion API response.
- [ ] The system logs a warning and continues without error if `GEMINI_API_KEY` is missing.

## Out of Scope
- Manual "Refresh Summary" button in the UI.
- Summarizing data sources other than observer comments (e.g., external Discord links).
- Detailed "expanded" view for summaries beyond the incident card.