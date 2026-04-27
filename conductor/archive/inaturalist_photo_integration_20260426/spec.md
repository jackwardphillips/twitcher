# Specification: T9 — iNaturalist Photo Integration

## Overview
This track integrates the iNaturalist REST API into the Twitcher dashboard to provide representative species photos for each rare bird incident. Photos are fetched lazily, cached locally in SQLite for performance, and displayed on the incident cards with proper CC attribution.

## Goals
- Provide high-quality visual context for rare bird sightings.
- Minimize API latency through local caching and lazy fetching.
- Ensure compliance with iNaturalist's CC-licensing via attribution display.
- Maintain a clean "field journal" aesthetic in the UI.

## Functional Requirements

### 1. Backend: iNaturalist Integration Service
- Implement a `PhotoService` to interact with the iNaturalist API (`https://api.inaturalist.org/v1`).
- Endpoint: `GET /taxa?q={species_name}&rank=species&per_page=1`.
- Extract `default_photo.medium_url` and `default_photo.attribution`.
- Map species names from incidents (scientific name preferred, fallback to common name) to iNaturalist taxa search.

### 2. Backend: Caching Layer
- New Prisma Model: `SpeciesPhoto`
  - `speciesName` (String, Unique): The lookup key.
  - `photoUrl` (String, Optional): URL to the medium photo.
  - `attribution` (String, Optional): License attribution text.
  - `fetchedAt` (DateTime): Timestamp of the last fetch.
- Cache expiration: 30 days.
- Negative caching: If no photo is found, store a record with `null` fields to prevent repeated API calls for 30 days.

### 3. Backend: Lazy Fetch Trigger
- Modify the `/api/incidents` endpoint to:
  - Join or query `SpeciesPhoto` for each incident.
  - If a photo is missing from the cache (or stale), trigger an asynchronous, fire-and-forget fetch to the iNaturalist API.
  - Respond immediately to the frontend; do not wait for the fetch to complete. Return `null` if no photo is cached yet.

### 4. Frontend: Incident Card Integration
- Update `Incident` type definition to include `photo: { url: string; attribution: string } | null`.
- Ensure the `Dashboard` component correctly passes photo data to the `PhotoSlot`.
- Refine `PhotoSlot.tsx`:
  - Show photo and attribution overlay if available.
  - **Placeholder:** If no photo is available, display a blank parchment-colored box (remove the existing bird silhouette).
  - **Attribution:** Ensure the attribution overlay is small and fits the "field journal" aesthetic (Muted, font-size: 0.7rem).

## Non-Functional Requirements
- **Performance:** Background fetches must not impact the responsiveness of the `/api/incidents` endpoint.
- **Privacy:** iNaturalist API does not require an API key for this usage; no secrets management needed for this track.
- **Reliability:** Handle iNaturalist API failures gracefully (log error, do not crash).

## Acceptance Criteria
- [ ] Backend successfully fetches and stores iNaturalist photos in SQLite.
- [ ] `/api/incidents` returns photo URLs and attribution for cached species.
- [ ] Incident cards display the fetched photo with an attribution overlay on hover.
- [ ] If no photo is cached, the card displays a clean blank box (no silhouette).
- [ ] Missing photo results (negative cache) prevent API calls for 30 days.
- [ ] Stale cache (>30 days) is eventually refreshed via background fetch.

## Out of Scope
- Observer-specific sighting photos.
- Multiple photos or photo galleries per species.
- Lightbox or full-screen photo views (T10).
- Map pin photo integration (T11).
