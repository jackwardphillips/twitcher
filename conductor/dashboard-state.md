# Dashboard State Snapshot

This file is a plain-English description of what the dashboard **currently looks and behaves like**, end to end. It is updated at the close of every track that changes the UI, data model, or API.

Its purpose is to give any track — especially data/logic tracks that don't touch the frontend directly — a concrete picture of what exists, so "wire this to the UI" decisions are never deferred silently.

---

## Gemini Instructions

**At the start of every track:** Read this file. If your track will change anything described here, note it explicitly in the spec's Integration Touchpoints section.

**At the end of every track:** If you changed anything visible in the dashboard — a new field, a wired-up placeholder, a new component, a layout change — update this file to reflect the new state. Keep it honest and concrete. Do not describe things as "live" if they are still hardcoded.

---

## Current State
*Last updated: Documentation update (2026-04-16)*

### Layout
- The page has a **map at the top** (Leaflet, full-width) and a **scrollable vertical card list below**.
- The overall aesthetic is the **"Field Journal" design system**: parchment background, rust/sage/gold palette, Playfair Display / Lora typography.

### Map
- Displays **pins for all filtered incidents** based on their geographical centroids.
- Pin colors are **currently default blue markers** (not yet wired to rarity codes).
- A **"Near Me" toggle** filters incidents to within 50km of the user's browser-detected location using incident centroids.
- Popups display species name, location, active days, and report count.

### Incident Cards
The dashboard uses an **incident-based view**. Each card in the vertical stack displays:
- **Common Name** (live, normalized)
- **Scientific Name** (live, normalized binomial)
- **Location Name** (live, format: `{primaryState}, {primaryCountry}`)
- **Active Badge**, e.g. "Active 3 days" (live, calculated from first/last seen dates)
- **Reports Count**, e.g. "72 sightings" (live)
- **First Seen / Last Seen dates** (live)
- **Rarity Color Border** (live, driven by ABA codes 3-6; defaults to code 5 for unknown rarities)
- **Links** to the latest eBird Map and Checklist for that incident.

### Dashboard Header / Controls
- Displays **"twitcher"** title.
- Displays **"Last email ingested: [date/time]"** pulled from `/api/ingestion-status`.
- Includes a **Rarity Filter** allowing users to toggle visibility of ABA codes 3, 4, 5, and 6.
- Includes a **"Filter Near Me"** toggle.

### Detail View
- **Does not yet exist.** Clicking a card does not open a drill-down view.

### Data Model & Freshness
- Data is served via `GET /api/incidents`, which returns clustered sightings grouped by species and proximity (10km).
- Scientific names are normalized to binomials (Genus species) to ensure consistency across subspecies and mangled alert data.
- Email ingestion runs automatically on backend startup.

---

## Change Log

| Track | Date | What changed |
|---|---|---|
| rarity_dashboard_20260325 | 2026-03-25 | Initial dashboard, card list, email parser |
| ebird_enrichment_20260331 | 2026-03-31 | Map added, lat/lng enrichment, streak logic, Field Journal UI |
| aba_checklist_integration_20260403 | 2026-04-03 | ABA codes in DB, lookup service |
| automated_email_ingestion_20260404 | 2026-04-04 | IMAP polling wired up |
| startup_email_ingestion_20260407 | 2026-04-07 | Startup ingestion, backfill script, ingestion status in dashboard header |
| incident_clustering_20260413 | 2026-04-13 | Sighting clustering into Incidents (10km/species), Incident model in DB |
| rarity_code_filter_20260412 | 2026-04-12 | Rarity filter UI component added |
| incident_dashboard_wiring_20260416 | 2026-04-16 | Dashboard switched to /api/incidents; live rarity colors on cards; binomial normalization; active days display |
| Documentation update | 2026-04-16 | Updated tracks.md with all archived tracks, updated tech-stack.md, corrected map pin status. |
