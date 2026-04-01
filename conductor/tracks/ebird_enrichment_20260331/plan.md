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

## Phase 2: Match Engine & Enrichment
Developing the logic to link parsed email alerts to precise eBird API records.

- [x] **Task: Implement Match Engine Service** (c944432)
    - [x] Write unit tests for fuzzy-matching logic (species, date, and location string similarity)
    - [x] Implement `MatchEngine` to resolve email sightings to API `subId` and coordinates
- [ ] **Task: Create Enrichment Background Worker**
    - [ ] Write integration tests for the email-to-API enrichment flow
    - [ ] Implement worker to automatically enrich sightings after ingestion
- [ ] **Task: Conductor - User Manual Verification 'Match Engine & Enrichment' (Protocol in workflow.md)**

## Phase 3: Geospatial Dashboard (Functionality)
Integrating the interactive map and the top-down dashboard layout.

- [ ] **Task: Integrate React-Leaflet Map**
    - [ ] Write unit tests for `SightingMap` component rendering markers
    - [ ] Implement `SightingMap` at the top of the dashboard
- [ ] **Task: Implement Top-Down Dashboard Layout**
    - [ ] Write tests for the map-on-top and scrollable list structure
    - [ ] Implement CSS structure for the integrated layout (functional only)
- [ ] **Task: Conductor - User Manual Verification 'Geospatial Dashboard' (Protocol in workflow.md)**

## Phase 4: Proximity & Streaks
Adding user location filtering and historical sighting context.

- [ ] **Task: Implement "Near Me" Geolocation Filter**
    - [ ] Write unit tests for proximity filtering logic (50km radius)
    - [ ] Implement Geolocation API integration and "Near Me" toggle
- [ ] **Task: Implement Sighting Streak Logic**
    - [ ] Write unit tests for calculating consecutive days reported
    - [ ] Implement streak display (e.g., "Seen 3 days in a row") on cards
- [ ] **Task: Conductor - User Manual Verification 'Proximity & Streaks' (Protocol in workflow.md)**

## Phase 5: Field Journal UI (Aesthetic & Polish)
Applying the "Field Journal" design system and final project refinement.

- [ ] **Task: Apply "Field Journal" Design System**
    - [ ] Write tests for design system CSS variables and font loading
    - [ ] Implement parchment background, rust/sage palette, and serif typography
- [ ] **Task: Refactor Sighting Cards & Vertical Stack**
    - [ ] Write tests for vertical card stack and rarity border logic
    - [ ] Implement "Field Journal" card style and vertical layout
- [ ] **Task: Final Polish & Responsive Verification**
    - [ ] Perform manual verification of mobile responsiveness and touch targets
    - [ ] Conduct final end-to-end verification of the enrichment flow
- [ ] **Task: Conductor - User Manual Verification 'Field Journal UI' (Protocol in workflow.md)**
