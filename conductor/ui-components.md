# UI Component Registry

This file is the **living contract** between data/logic tracks and the frontend. It records every meaningful UI component, what data it currently consumes, and whether that data is **live** (wired to a real backend/database source) or **hardcoded/placeholder**.

---

## Gemini Instructions

**At the start of every track:**
1. Read this file in full.
2. Cross-reference against the actual component files in `frontend/src/` to verify the table is accurate - correct any stale rows you find before proceeding.
3. Identify any rows where your track's work will change a field from `hardcoded` -> `live`, or add a new field entirely. Note these explicitly in the track spec before writing any code.

**At the end of every track:**
1. Update every row your track touched. Change `hardcoded` -> `live` if you wired it. Change `not started` -> `hardcoded` if you added a placeholder. Add new rows for any new fields you introduced.
2. If your track lands new data (a new DB column, a new API field, or service output) that *could* visibly improve an existing component - even one outside your track's stated scope - add a row for it marked `hardcoded` and note what would be needed to wire it. Do not silently leave data disconnected from the UI.
3. Update `dashboard-state.md` to reflect the current end-to-end visual state of the dashboard.

**A track is not complete until this file and `dashboard-state.md` are updated.**

---

## Component Table

### `Dashboard` / `IncidentCard` (inlined)
*File: `frontend/src/components/Dashboard.tsx`*

| Field | Status | Data Source | Notes |
|---|---|---|---|
| Species common name | live | `Incident.commonName` | |
| Species scientific name | live | `Incident.scientificName` | Normalized to binomial |
| Gemini summary text | live | `Incident.geminiSummary` | Only rendered when present and non-empty |
| Rarity color border | live | `Incident.abaCode` -> `rarity-utils.ts` | Falls back to code 5 styling when rarity is missing |
| Active days badge | live | `Incident.activeDays` | Calculated from first/last seen |
| Location string | live | `Incident.locationName` | |
| Reports count | live | `Incident.sightingCount` | |
| First seen date | live | `Incident.firstSeen` | |
| Last seen date | live | `Incident.lastSeen` | |
| eBird Map link | live | `Incident.latestMapUrl` | |
| Latest Checklist link | live | `Incident.latestChecklistUrl` | |
| Discuss link | hardcoded | static Discord link | Not incident-specific yet |

---

### `SightingMap` / Map Component
*File: `frontend/src/components/SightingMap.tsx`*

| Field | Status | Data Source | Notes |
|---|---|---|---|
| Incident pins rendered | live | `Incident.centroidLat`, `Incident.centroidLng` | |
| Pin color by rarity code | hardcoded | - | Currently uses default Leaflet blue markers |
| Receives already-filtered incidents | live | `Dashboard.displayedIncidents` | Parent applies rarity + near-me filtering before rendering pins |
| Popup: Species name | live | `Incident.commonName` | |
| Popup: Location | live | `Incident.locationName` | |
| Popup: Active days | live | `Incident.activeDays` | |
| Popup: Report count | live | `Incident.sightingCount` | |
| Basemap style | live | Leaflet default tiles | |

---

### `RarityFilter`
*File: `frontend/src/components/RarityFilter.tsx`*

| Field | Status | Data Source | Notes |
|---|---|---|---|
| Rarity buttons (1-6) | live | static list in component | `Dashboard` controls the default selected set of 3-6 |
| Button colors | live | `rarity-utils.ts` | |
| Mobile dropdown presentation | live | viewport width | Uses a custom dropdown when `window.innerWidth < 600` |

---

### `Dashboard` Header
*File: `frontend/src/components/Dashboard.tsx`*

| Field | Status | Data Source | Notes |
|---|---|---|---|
| Ingestion status | live | `/api/ingestion-status` | Shows last email date when one exists |
| IMAP error warning | live | `/api/ingestion-status` | Shows connection issue if the last run failed |
| Near Me toggle | live | browser Geolocation API | Filters parent incident state to 50km |

---

## Status Key

| Status | Meaning |
|---|---|
| `live` | Wired to real data from the DB or an API |
| `hardcoded` | Value exists in the UI but is a static default, not from real data |
| `not started` | Field does not yet exist in the UI |
| `unknown` | Gemini must verify against actual source files before this track proceeds |
