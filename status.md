# Twitcher — Project Tracks

---

## Completed

| Track | Date | Summary |
|---|---|---|
| `rarity_dashboard_20260325` | 2026-03-25 | Initial dashboard, card list, eBird email parser |
| `ebird_enrichment_20260331` | 2026-03-31 | eBird API integration, lat/lng enrichment, streak logic, Field Journal UI |
| `aba_checklist_integration_20260403` | 2026-04-03 | ABA checklist CSV ingested, rarity code lookup service built |
| `root_quick_start_20260404` | 2026-04-04 | Root `npm start` launches frontend + backend concurrently |
| `automated_email_ingestion_20260404` | 2026-04-04 | IMAP polling, deduplication, auto-parsing on ingest |
| `startup_email_ingestion_20260407` | 2026-04-07 | Startup ingestion, backfill script, ingestion status in dashboard header |
| `rarity_color_20260408` | 2026-04-08 | Rarity color wiring (both card locations); species common name cleaning |
| `safety_type_fixes_20260410` | 2026-04-10 | Chore — codebase alignment with TypeScript style guidelines |
| `rarity_code_filter_20260412` | 2026-04-12 | Filter bar at top of dashboard to show/hide sightings by ABA code |
| `incident_clustering_20260413` | 2026-04-13 | Incident model + 10km/species clustering; sightings grouped into Incident records |
| `incident_dashboard_wiring_20260416` | 2026-04-16 | Dashboard switched to /api/incidents; live rarity colors; binomial normalization; active days display |
| `chase_intel_summarization_20260416` | 2026-04-16 | Gemini comment summarization + misID flagging per incident |

---

## Queued

### Foundation — Data Layer

- [x] **T1: ABA Species Code CSV Integration**
  Ingest ABA checklist CSV into SQLite. Species lookup table with codes 1–6 and 4-letter alpha codes. Wire rarity codes to existing color system. Fuzzy name matching for eBird/ABA name divergence. Idempotent — re-runnable on annual taxonomy updates.
  - ✅ `aba_checklist_integration_20260403` — CSV ingested, lookup service built
  - ✅ `rarity_color_20260408` — color wiring + species common name cleaning complete

- [x] **T2: Email Ingestion Pipeline**
  IMAP polling for eBird alert emails. Detect new emails from eBird, extract raw content, store for the existing parser. Idempotent via message ID deduplication. Leaves inbox untouched.
  - ✅ `automated_email_ingestion_20260404` — IMAP polling, deduplication, auto-parsing
  - ✅ `startup_email_ingestion_20260407` — startup ingestion, backfill script, status endpoint

- [x] **T4: Species-Grouped Data Model ("Incident" Model)**
  Refactor from sighting-per-record to incident-per-record. An incident is a cluster of sightings of the same species within ~10km of each other and within the active streak window — representing a single bird at a single location. Grouping key: `species + location_cluster + active_window`. Each incident aggregates: all sightings, observer comments, latest seen, total count, and bounding coordinates.

  Handles two distinct cases:
  - **Same species, different locations** (e.g. Tufted Duck in CA and NY): two separate incidents, two separate cards.
  - **Same bird, border sightings** (e.g. Red-flanked Bluetail reported from both VA and MD within 10km): collapsed into one incident, one card, with both states noted.

  - ✅ `incident_clustering_20260413` — Incident model defined, clustering logic implemented
  - ✅ `incident_dashboard_wiring_20260416` — Dashboard wired to /api/incidents, binomial normalization live
  *Dependencies: T1, T2.*

---

### Logic Layer

- [ ] **T5: State Record Count Tracking**
  Bootstrap state record counts from a one-time EBD download per watched state. Increment on each new accepted sighting (`obsValid: true` only). Display as "Nth accepted [state] record" on card. Flag current sighting as unreviewed if not yet accepted. County-level records deferred.
  *Dependencies: T4.*

- [~] **T6: Streak Tracking with Gap Tolerance**
  Track consecutive sighting days per incident. A gap of ≤2 days does not break the streak.
  - ✅ `ebird_enrichment_20260331` — basic consecutive-day streak logic built, displaying on cards
  - ⬜ Gap tolerance (≤2 days) not yet implemented — build on existing logic, do not replace
  *Dependencies: T4.*

- [x] **T7: Gemini Comment Summarization + MisID Flagging**
  Aggregate observer comments per incident via Gemini API. Produce 2–3 sentence summary: ID confidence, key field marks, caveats. Flag card as "under review" if comments dispute the original ID. Lazy generation on first card open. Cached per incident per day.
  - ✅ `chase_intel_summarization_20260416` — Gemini summarization and misID flagging complete
  *Dependencies: T4.*

- [ ] **T8: Distance-Aware Rarity Relevance Filter**
  Weight ABA rarity code against distance from user location. A code 3 two towns over surfaces above a code 3 in Hawaii. Configurable radius. Scoring formula to be defined explicitly in spec before planning begins.
  *Dependencies: T1, T4.*

---

### UI Layer

- [ ] **T9: iNaturalist Photo Integration**
  Fetch best available photo per species from the iNaturalist REST API. Cache results. Include useful metadata where available (observer, date, quality grade).
  *Dependencies: T4.*

- [~] **T10: One-Card-Per-Incident UI + Sighting Drill-Down**
  Dashboard shows one card per incident: rarity badge, iNat photo, last seen, region, streak indicator, state record count, lifer checkmark (manually toggled by user), last updated timestamp. Clicking opens detail view: Gemini summary, all individual sightings with dates/locations, map inset, misID flag if present.
  - ✅ `incident_dashboard_wiring_20260416` - Dashboard shows one card per incident, with common name, scientific name, rarity code, first seen, last seen, state, country, and number of observations.
  *Dependencies: T4–T9.*

- [ ] **T11: Map Overhaul — Basemap + Bird Pin Icons**
  Replace Leaflet with MapLibre or Mapbox GL JS. Decision must be made in spec and documented in `tech-stack.md` before implementation begins. Pins will display iNat species photos and be color-coded by rarity code. Species-specific silhouette fallback where no photo is available.
  *Dependencies: T1, T4, T9.*

---

### Integrations

- [ ] **T12: Push Notifications**
  Browser push notifications for new incidents. Triggered on email ingestion or notable API poll completing. Configurable: always notify on code 4+, notify on code 3 only if within user-defined radius.
  *Dependencies: T8.*

- [ ] **T13: Weekend Chase Planner — Weather**
  Forward-looking weather summary (2–3 days) for a user-configured home location. Surface as a "chase conditions" indicator alongside active incidents. Weather API to be selected in spec and added to `tech-stack.md`.
  *Dependencies: T10.*

- [ ] **T14: External Sources — Web Search Context**
  Playwright web search for species context per incident: range info, ID tips, recent rare bird reports from around the web. Results surface in the detail card. Facebook groups: deep-link to group search only, no scraping.
  *Dependencies: T10.*

---

### Polish

- [ ] **T15: UI Polish — Animations + Design System**
  Systematic pass on the field journal aesthetic: card entrance animations, map transitions, hover states, loading skeletons, motion tokens. Includes "last updated" widget on the dashboard. Do last when all components are stable.
  *Dependencies: all tracks stable.*

---

## Deferred / Future

- **County Record Counts:** County-level record tracking deferred until state records (T5) are stable. Will require EBD county-level filtering.
- **County Radius Auto-Selection:** Auto-populate watched counties from user location + configurable radius. Build after T3 is stable.
- **Taxonomy Update Tooling:** Annual manual process. Re-run ABA CSV ingestion script and EBD bootstrap for any split or lumped species. Document as a runbook rather than automated infrastructure.
- **Macaulay Library Media:** No public API currently available. Deep-link to Macaulay media search as a stopgap. Revisit if a programmatic endpoint becomes available.
- **eBird Notable API as Primary Ingestion:** Evaluated and deferred. Rate limit and geographic chunking concerns (e.g. California requires county-level subdivision) make email a cleaner primary source. eBird API retained as enrichment-only (match engine pulls coordinates and checklist IDs after ingestion).

---

## Known Bugs

*(none)*