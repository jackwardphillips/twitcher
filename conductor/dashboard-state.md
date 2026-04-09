# Dashboard State Snapshot

This file is a plain-English description of what the dashboard **currently looks and behaves like**, end to end. It is updated at the close of every track that changes the UI, data model, or API.

Its purpose is to give any track — especially data/logic tracks that don't touch the frontend directly — a concrete picture of what exists, so "wire this to the UI" decisions are never deferred silently.

---

## Gemini Instructions

**At the start of every track:** Read this file. If your track will change anything described here, note it explicitly in the spec's Integration Touchpoints section.

**At the end of every track:** If you changed anything visible in the dashboard — a new field, a wired-up placeholder, a new component, a layout change — update this file to reflect the new state. Keep it honest and concrete. Do not describe things as "live" if they are still hardcoded.

---

## Current State
*Last updated: aba_checklist_integration track (approx. 2026-04-03)*

> **Gemini: before beginning T1 (or whichever is the next queued track), verify this section against the actual running app and correct anything that is stale.**

### Layout
- The page has a **map at the top** (Leaflet, full-width) and a **scrollable vertical card list below**.
- The overall aesthetic is the **"Field Journal" design system**: parchment background, rust/sage/gold palette, Playfair Display / Lora typography.

### Map
- Displays **pins for all enriched sightings** that have lat/lng coordinates from the eBird API.
- Pin colors are **hardcoded** — they do not yet reflect ABA rarity codes from the database.
- Clicking a pin focuses the corresponding card in the list below.
- A **"Near Me" toggle** filters pins to within 50km of the user's browser-detected location.

### Sighting Cards
Each card in the vertical stack currently displays:
- Species common name (live)
- Location string (live)
- Date of sighting (live)
- Observer name (live)
- Streak indicator, e.g. "Seen 3 days in a row" (live)
- Rarity color badge/border (hardcoded — color is a static default, not driven by ABA code from the database even though ABA codes are now stored)

Cards do **not** yet display: photos, state record counts, lifer checkmarks, Gemini summaries, or MisID flags.

### Dashboard Header / Status Bar
- Displays **"Last Email Ingested: [date/time]"** pulled from `/api/ingestion-status`.
- Displays a **subtle warning indicator** if the last IMAP ingestion attempt failed.

### Detail View
- **Does not yet exist.** Clicking a card does not open a drill-down view. (T10 dependency.)

### Data Freshness
- Email ingestion runs **automatically on backend startup** and can be triggered manually via `POST /api/ingest`.
- Sightings in the DB currently come from email ingestion only.
- Sighting enrichment process adds data like lat/lng coordinates from the eBird API.

---

## Change Log

| Track | Date | What changed |
|---|---|---|
| rarity_dashboard_20260325 | 2026-03-25 | Initial dashboard, card list, email parser |
| ebird_enrichment_20260331 | 2026-03-31 | Map added, lat/lng enrichment, streak logic, Field Journal UI |
| aba_checklist_integration_20260403 | 2026-04-03 | ABA codes in DB, lookup service — UI not yet updated |
| automated_email_ingestion_20260404 | 2026-04-04 | IMAP polling wired up |
| startup_email_ingestion_20260407 | 2026-04-07 | Startup ingestion, backfill script, ingestion status in dashboard header |