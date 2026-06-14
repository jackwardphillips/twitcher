# Specification - Smart Photo Cropping for Sighting Cards

## Overview
The dashboard already caches bird photos locally, but the current rendering always uses a centered `cover` crop. That works for some images and cuts off the subject badly on others, especially tall field-guide style photos. This track adds stored focal-point metadata so the existing card layout can frame the bird more intelligently without changing the overall dashboard design.

## Goals
- Keep the bird or primary subject visible inside the existing sighting card photo slot as often as possible.
- Avoid per-render image analysis; compute crop metadata once and reuse it.
- Preserve the current postcard/card layout and card sizing behavior.
- Provide a safe fallback when detection fails or photo metadata is incomplete.

## Functional Requirements
- Add focal-point fields to cached photo records.
- Generate focal points during ingest or a dedicated backfill pass.
- Return focal-point metadata from the backend with each incident photo.
- Render images using `object-fit: cover` and `object-position` derived from the stored focal point.
- Fall back to a centered crop when focal metadata is missing.
- Allow future replacement of the detection provider without changing the frontend contract.

## API / Schema Details

### Data model
- Add `focusX` and `focusY` to `SpeciesPhoto`.
- Store both values as normalized percentages from `0` to `100`.
- Keep existing `photoUrl`, `attribution`, and `fetchedAt` fields unchanged.
- Default new photos to `50 / 50` when no focal point is available.

### Backend output
- Extend the incident photo payload returned by `/api/incidents` to include:
  - `url`
  - `attribution`
  - `focusX`
  - `focusY`
- If a photo has no stored focal point, return `50 / 50`.
- Do not block incident delivery on focal-point generation.

### Detection interface
- Introduce a backend photo-focus service that accepts a photo URL or downloaded image and returns a focal point.
- The service should normalize vendor output into a simple `{ focusX, focusY }` shape.
- The exact provider can be configured or swapped later, but the app-facing contract should stay stable.

## Ingest / Backfill Flow
- When a species photo is fetched or refreshed, attempt focal-point detection once.
- If detection succeeds, persist `focusX` and `focusY` alongside the photo URL and attribution.
- If detection fails, persist the photo anyway and keep the focal point at the default center.
- Add a backfill script that walks existing `SpeciesPhoto` rows and fills in missing focal points without re-fetching every image unless needed.
- Keep the backfill idempotent so it can be rerun safely.

## Frontend Rendering
- Update the photo slot to consume focal-point metadata in addition to the image URL and attribution.
- Keep the current photo slot dimensions and card layout intact.
- Render the image with `object-fit: cover`.
- Set `object-position` from `focusX` / `focusY`.
- If a card has no focal metadata, render as centered cover crop.
- Do not introduce layout shifts when focal metadata is present or absent.

## Test Cases
- Schema test: verify `SpeciesPhoto` can store and retrieve `focusX` / `focusY`.
- Backend test: verify `/api/incidents` includes focal-point metadata for photos when present.
- Backend fallback test: verify incidents still return when focal-point detection fails.
- Backfill test: verify the backfill job updates missing focal points without duplicating rows.
- Frontend test: verify `PhotoSlot` applies `object-position` from supplied focal metadata.
- Visual regression check: confirm the image still fits the existing card shell and does not change card width or height.

## Acceptance Criteria
- [ ] `SpeciesPhoto` stores `focusX` and `focusY` in the database.
- [ ] `/api/incidents` returns photo focal metadata together with the URL and attribution.
- [ ] Existing cached photos are backfilled with focal points where detection succeeds.
- [ ] `PhotoSlot` renders with `object-position` driven by the stored focal point.
- [ ] Images with missing focal metadata fall back to centered cover crop.
- [ ] Failed detection does not block photo caching or incident rendering.
- [ ] Automated tests cover the missing-metadata fallback and the detection-failure path.

## Integration Touchpoints

### Components this track must update

| Component | Field | Current Status | After This Track |
|---|---|---|---|
| PhotoSlot | Image crop framing | live, centered cover crop | live, focal-point driven crop |
| Dashboard | Incident photo prop shape | live, url + attribution only | live, url + attribution + focusX/focusY |

### New data this track produces

| Data | Where stored | Wired to UI in this track? | If deferred, which track |
|---|---|---|---|
| SpeciesPhoto.focusX | Prisma-backed SpeciesPhoto row | Yes | - |
| SpeciesPhoto.focusY | Prisma-backed SpeciesPhoto row | Yes | - |
| Incident.photo.focusX | `/api/incidents` response | Yes | - |
| Incident.photo.focusY | `/api/incidents` response | Yes | - |

### Components this track does NOT touch (but could in future)

- SightingMap: no map pin or popup changes are required for this crop work.
- SightingHistogram: no relation to image framing.
- NotebookTabs: unrelated navigation work.

## Non-Functional Requirements
- Idempotent backfill and refresh paths.
- No per-request image analysis in the frontend.
- Safe fallback behavior when detection is unavailable.
- Minimal added rendering complexity in the card component.
- Keep the card layout stable on desktop and mobile.

## Out of Scope
- Redesigning the card layout.
- Manual crop editors.
- Runtime image analysis in the browser.
- Changing the photo source away from the current cache.
- Subject-detection tuning beyond basic fallback behavior.

## Tech Stack Notes
- Backend changes should stay in the existing Node + Prisma service layer.
- Frontend changes should stay in the existing React card/photo components.
- A vendor-specific detection provider is acceptable, but the app should depend on a small normalization wrapper rather than vendor output directly.
