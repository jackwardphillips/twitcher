# Twitcher - Project Status

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
| `rarity_color_20260408` | 2026-04-08 | Incident card rarity colors wired to ABA codes |
| `safety_type_fixes_20260410` | 2026-04-10 | Parser and enrichment safety fixes |
| `rarity_code_filter_20260412` | 2026-04-12 | Filter bar at top of dashboard to show/hide sightings by ABA code |
| `incident_clustering_20260413` | 2026-04-13 | Incident model + 10km/species clustering; sightings grouped into incident records |
| `incident_dashboard_wiring_20260416` | 2026-04-16 | Dashboard switched to `/api/incidents`; live rarity colors; binomial normalization; active days display |
| `chase_intel_summarization_20260416` | 2026-04-16 | Incident summary generation shipped; misID flagging is still not present in the UI or API |

---

## Queued

### Foundation - Data Layer

- [x] **T1: ABA Species Code CSV Integration**
  Ingest ABA checklist CSV into SQLite. Species lookup table with codes 1-6 and 4-letter alpha codes. Wire rarity codes to existing color system. Fuzzy name matching for eBird/ABA name divergence. Idempotent - re-runnable on annual taxonomy updates.
  Done: `aba_checklist_integration_20260403`
  Done: `rarity_color_20260408`

- [x] **T2: Email Ingestion Pipeline**
  IMAP polling for eBird alert emails. Detect new emails from eBird, extract raw content, store for the existing parser. Idempotent via message ID deduplication. Leaves inbox untouched.
  Done: `automated_email_ingestion_20260404`
  Done: `startup_email_ingestion_20260407`

- [x] **T4: Species-Grouped Data Model ("Incident" Model)**
  Refactor from sighting-per-record to incident-per-record. An incident is a cluster of sightings of the same species within ~10km of each other and within the active streak window - representing a single bird at a single location. Grouping key: `species + location_cluster + active_window`. Each incident aggregates all sightings, observer comments, latest seen, total count, and bounding coordinates.

  Handles two distinct cases:
  Same species, different locations: two separate incidents.
  Same bird, border sightings within 10km: one collapsed incident.

  Done: `incident_clustering_20260413`
  Done: `incident_dashboard_wiring_20260416`
  *Dependencies: T1, T2.*

---

### Logic Layer

- [ ] **T5: State Record Count Tracking**
  Bootstrap state record counts from a one-time EBD download per watched state. Increment on each new accepted sighting (`obsValid: true` only). Display as "Nth accepted [state] record" on card. Flag current sighting as unreviewed if not yet accepted. County-level records deferred.
  *Dependencies: T4.*

- [~] **T6: Streak Tracking with Gap Tolerance**
  Track consecutive sighting days per incident. A gap of <= 2 days does not break the streak.
  Done: `ebird_enrichment_20260331` shipped basic consecutive-day streak logic and card display.
  Remaining: Gap tolerance itself is still not implemented.
  *Dependencies: T4.*

- [~] **T7: Chase Intel Summarization + MisID Flagging**
  Aggregate observer comments per incident into a short summary and flag cards as under review when comments dispute the original ID.
  Done: `chase_intel_summarization_20260416` shipped backend summarization plus summary text on cards.
  Remaining: There is no misID / under-review flag in the current backend or frontend.
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
  Dashboard shows one card per incident: rarity badge, iNat photo, last seen, region, streak indicator, state record count, lifer checkmark, and last updated timestamp. Clicking opens detail view with summary text, all individual sightings, map inset, and any misID status.
  Done: `incident_dashboard_wiring_20260416` shipped one card per incident with common name, scientific name, rarity color styling, first seen, last seen, location, and sighting count.
  Done: `chase_intel_summarization_20260416` added optional summary text on cards.
  Remaining: no drill-down detail view, no photo integration, no lifer state, no state record count, and no misID flag.
  *Dependencies: T4-T9.*

- [ ] **T11: Map Overhaul - Basemap + Bird Pin Icons**
  Replace Leaflet with MapLibre or Mapbox GL JS. Decision must be made in spec and documented in `tech-stack.md` before implementation begins. Pins will display iNat species photos and be color-coded by rarity code. Species-specific silhouette fallback where no photo is available.
  *Dependencies: T1, T4, T9.*

---

### Integrations

- [ ] **T12: Push Notifications**
  Browser push notifications for new incidents. Triggered on email ingestion or notable API poll completing. Configurable: always notify on code 4+, notify on code 3 only if within user-defined radius.
  *Dependencies: T8.*

- [ ] **T13: Weekend Chase Planner - Weather**
  Forward-looking weather summary (2-3 days) for a user-configured home location. Surface as a "chase conditions" indicator alongside active incidents. Weather API to be selected in spec and added to `tech-stack.md`.
  *Dependencies: T10.*

- [ ] **T14: External Sources - Web Search Context**
  Playwright web search for species context per incident: range info, ID tips, recent rare bird reports from around the web. Results surface in the detail card. Facebook groups: deep-link to group search only, no scraping.
  *Dependencies: T10.*

---

### Polish

- [ ] **T15: UI Polish - Animations + Design System**
  Systematic pass on the field journal aesthetic: card entrance animations, map transitions, hover states, loading skeletons, motion tokens. Includes a "last updated" widget on the dashboard. Do last when all components are stable.
  *Dependencies: all tracks stable.*

---

## Deferred / Future

- County record counts: deferred until state records (T5) are stable
- County radius auto-selection: build after a stable user-location preference model exists
- Taxonomy update tooling: annual manual process and runbook
- Macaulay Library media: no public API currently available
- eBird notable API as primary ingestion: evaluated and deferred in favor of email-first ingestion

---

## Known Bugs

- The mobile rarity filter uses a hover-driven custom dropdown. That is fragile on touch devices and does not behave like a durable mobile control.
- Incident cards (e.g., Baikal Teal in Ontario) show incorrect first/last seen dates derived from ingestion time rather than the actual sighting dates. The incident model needs to derive these bounds from the underlying aggregated sightings. Additionally, while the histogram shows the correct distribution of counts, the days are mislabeled.
- Incident clustering logic may need adjustment; incidents of the same species are sometimes splitting when they could be merged. Consider expanding the clustering radius (e.g., to 50km) or allowing incidents to "migrate" as new sightings are added.
- The summarization cycle is inefficient: it only triggers if at least one new email is ingested during a run, but then re-summarizes *all* active incidents (seen in the last 7 days) regardless of whether they had new sightings today. This leads to redundant LLM API calls for incidents with no new information.

---

## Housekeeping Notes

- `frontend/src/index.css` still contains a large amount of Vite starter styling that is mostly unrelated to the current dashboard.
- `conductor/archive/incident_dashboard_wiring_20260416/spec.md` is still a placeholder (`test`) rather than a preserved archived spec.
