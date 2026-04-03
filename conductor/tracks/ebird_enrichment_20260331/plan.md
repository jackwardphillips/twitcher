# Implementation Plan - eBird API Integration & Geospatial Enrichment

This plan outlines the steps for integrating the eBird API to enrich rare bird alerts and overhauling the UI with a "Field Journal" aesthetic and interactive map.

## Phase 1: API Foundation & Model Update [checkpoint: a2a115b]
Initial setup for eBird API communication and database schema expansion.

- [x] **Task: Update Prisma schema for geospatial and eBird metadata** (058f542)
    - [x] Define migration for `latitude`, `longitude`, `subId`, `locId`, `speciesCode`, `howMany`, etc.
    - [x] Run migrations and generate updated Prisma client
- [x] **Task: Implement eBird API Client** (7aac1be)
    - [x] Write unit tests for `EbirdClient` with mocked API responses
    - [x] Implement `EbirdClient` to fetch notable observations and checklist details
- [x] **Task: Conductor - User Manual Verification 'API Foundation & Model Update' (Protocol in workflow.md)**

## Phase 2: Match Engine & Enrichment [checkpoint: 8b66a51]
Developing the logic to link parsed email alerts to precise eBird API records.

- [x] **Task: Implement Match Engine Service** (c944432)
    - [x] Write unit tests for fuzzy-matching logic (species, date, and location string similarity)
    - [x] Implement `MatchEngine` to resolve email sightings to API `subId` and coordinates
- [x] **Task: Create Enrichment Background Worker** (aee25a6)
    - [x] Write integration tests for the email-to-API enrichment flow
    - [x] Implement worker to automatically enrich sightings after ingestion
- [x] **Task: Conductor - User Manual Verification 'Match Engine & Enrichment' (Protocol in workflow.md)** (8b66a51)

## Phase 3: Geospatial Dashboard (Functionality) [checkpoint: 49df60f]
Integrating the interactive map and the top-down dashboard layout.

- [x] **Task: Integrate React-Leaflet Map** (49df60f)
    - [x] Write unit tests for `SightingMap` component rendering markers
    - [x] Implement `SightingMap` at the top of the dashboard
- [x] **Task: Implement Top-Down Dashboard Layout** (49df60f)
    - [x] Write tests for the map-on-top and scrollable list structure
    - [x] Implement CSS structure for the integrated layout (functional only)
- [x] **Task: Conductor - User Manual Verification 'Geospatial Dashboard' (Protocol in workflow.md)**

## Phase 4: Proximity & Streaks [checkpoint: f30ef79]
Adding user location filtering and historical sighting context.

- [x] **Task: Implement "Near Me" Geolocation Filter** (9e671c4)
    - [x] Write unit tests for proximity filtering logic (50km radius)
    - [x] Implement Geolocation API integration and "Near Me" toggle
- [x] **Task: Implement Sighting Streak Logic** (6008602)
    - [x] Write unit tests for calculating consecutive days reported
    - [x] Implement streak display (e.g., "Seen 3 days in a row") on cards
- [x] **Task: Conductor - User Manual Verification 'Proximity & Streaks' (Protocol in workflow.md)** (f30ef79)

## Phase 5: Field Journal UI (Aesthetic & Polish) [checkpoint: e34aaa8]
Applying the "Field Journal" design system and final project refinement.

- [x] **Task: Apply "Field Journal" Design System** (770447b)
    - [x] Write tests for design system CSS variables and font loading
    - [x] Implement parchment background, rust/sage palette, and serif typography
- [x] **Task: Refactor Sighting Cards & Vertical Stack** (656ba41)
    - [x] Write tests for vertical card stack and rarity border logic
    - [x] Implement "Field Journal" card style and vertical layout
- [x] **Task: Final Polish & Responsive Verification** (0220c42)
    - [x] Perform manual verification of mobile responsiveness and touch targets
    - [x] Conduct final end-to-end verification of the enrichment flow
- [x] **Task: Conductor - User Manual Verification 'Field Journal UI' (Protocol in workflow.md)** (e34aaa8)

## Phase: Review Fixes
- [x] Task: Apply review suggestions (18f9615)
