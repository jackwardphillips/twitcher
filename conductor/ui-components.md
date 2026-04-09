# UI Component Registry

This file is the **living contract** between data/logic tracks and the frontend. It records every meaningful UI component, what data it currently consumes, and whether that data is **live** (wired to a real backend/database source) or **hardcoded/placeholder**.

---

## Gemini Instructions

**At the start of every track:**
1. Read this file in full.
2. Cross-reference against the actual component files in `frontend/src/` to verify the table is accurate — correct any stale rows you find before proceeding.
3. Identify any rows where your track's work will change a field from `hardcoded` → `live`, or add a new field entirely. Note these explicitly in the track spec before writing any code.

**At the end of every track:**
1. Update every row your track touched. Change `hardcoded` → `live` if you wired it. Change `not started` → `hardcoded` if you added a placeholder. Add new rows for any new fields you introduced.
2. If your track lands new data (a new DB column, a new API field, a new service output) that *could* visibly improve an existing component — even one outside your track's stated scope — add a row for it marked `hardcoded` and note what would be needed to wire it. Do not silently leave data disconnected from the UI.
3. Update `dashboard-state.md` to reflect the current end-to-end visual state of the dashboard.

**A track is not complete until this file and `dashboard-state.md` are updated.**

---

## Component Table

### `SightingCard` / Incident Card
*Gemini: verify exact file path in `frontend/src/` before proceeding*

| Field | Status | Data Source | Notes |
|---|---|---|---|
| Species common name | live | eBird email parser | |
| Rarity color badge | hardcoded | — | ABA codes landed in DB (aba_checklist_integration track); needs wiring to `AbaSpecies.code` → color system |
| Rarity code label (e.g. "Code 4") | unknown | — | Gemini: verify whether this is displayed at all |
| Location string | live | eBird email parser | |
| Date last seen | live | eBird email parser | |
| Observer name | live | eBird email parser | |
| Streak indicator (e.g. "3 days in a row") | live | streak logic, ebird_enrichment track | |

---

### `SightingMap` / Map Component
*Gemini: verify exact file path in `frontend/src/` before proceeding*

| Field | Status | Data Source | Notes |
|---|---|---|---|
| Sighting pins rendered | live | enriched lat/lng from eBird API | |
| Pin color by rarity code | hardcoded | — | ABA codes in DB; needs wiring. Same fix as card rarity badge |
| Click pin → focus card | live | ebird_enrichment track | |
| "Near Me" radius filter | live | browser Geolocation API | |
| Basemap style | live | Leaflet default tiles | |

---

### `Dashboard` / Top-level layout
*Gemini: verify whether this is `App.tsx`, `Dashboard.tsx`, or both*

| Field | Status | Data Source | Notes |
|---|---|---|---|
| Ingestion status / last email date | live | `/api/ingestion-status` | Added in startup_email_ingestion track |
| IMAP error warning indicator | live | `/api/ingestion-status` | Added in startup_email_ingestion track |

---

## Status Key

| Status | Meaning |
|---|---|
| `live` | Wired to real data from the DB or an API |
| `hardcoded` | Value exists in the UI but is a static default, not from real data |
| `not started` | Field does not yet exist in the UI |
| `unknown` | Gemini must verify against actual source files before this track proceeds |