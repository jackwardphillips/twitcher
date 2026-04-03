# Track Specification: eBird API Integration & Geospatial Enrichment

## Overview
Integrate the eBird API to enrich rare bird alerts parsed from emails with precise geospatial data (lat/lng), checklist IDs, and real-time status. Implement an interactive map and proximity-based filtering, culminating in a "Field Journal" UI overhaul.

## Functional Requirements
- **Match Engine:** A backend service that links email-based "alerts" to precise eBird API 2.0 "Notable Observations" records.
- **Geospatial Data:** Store `latitude`, `longitude`, `subId` (checklist), and `regionCode` for each sighting.
- **Map Component:** A React-Leaflet map anchored at the top of the dashboard displaying sighting pins.
- **"Near Me" Filter:** A frontend toggle that uses the browser's Geolocation API to filter sightings within a 50km radius.
- **Sighting Streaks:** Logic to calculate and display how many consecutive days a species has been reported at a location.
- **Field Journal UI (Phase 5):** Apply the "Field Journal" design system (warm parchment, rust/sage colors, serif typography, vertical stack of cards).

## Non-Functional Requirements
- **TOS Compliance:** Avoid bulk downloads; use surgical fetches and caching for regional notable sightings.
- **Responsiveness:** Ensure the top-down map/list layout is usable on mobile devices.

## Acceptance Criteria
- Email alerts are successfully enriched with precise coordinates and checklist links.
- Map displays pins for all sightings; clicking a pin focuses the corresponding card.
- "Near Me" filter correctly restricts sightings to a 50km radius.
- Cards clearly display "streak" information (e.g., "Seen 3 days in a row").
- Final UI strictly follows the "Field Journal" aesthetic defined in `design-system.md`.

## Out of Scope
- Detailed bird information pages or species deep-dives.
- Display of rich media (photos/audio) or verification badges.
- Handling of private property warnings (deferred to a later track).
