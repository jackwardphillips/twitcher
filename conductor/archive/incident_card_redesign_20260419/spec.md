# Track Spec: Incident Card Redesign

## Overview
Redesign the incident card from a vertical stack to a horizontal layout with a photo slot on the left, species/metadata in the center, and a sighting frequency histogram on the right. This is a pure frontend change — no new API endpoints or schema changes required. It also establishes the photo slot that T9 will populate.

## Functional Requirements

### Card Layout
- **Horizontal grid**: fixed-width photo slot (180px) on the left, content area filling remaining width on the right.
- **Left border accent color**: driven by rarity code — existing `getRarityColor()` logic, no changes needed.
- **Card background**: retains field journal parchment aesthetic (`#f7f3eb`, `#c8b89a` border).

### Photo Slot
- **Dimensions**: 180px wide, full card height, `object-fit: cover`.
- **Placeholder**: When no photo is available (pre-T9), render a muted parchment-toned placeholder — no broken image icon, no text, just the empty slot in the card's background color.
- **Attribution**: Attribution text hidden by default, revealed as a translucent overlay on hover (satisfies iNat license requirement when T9 lands).
- **Data Shape**: `{ url: string; attribution: string } | null` — slot renders gracefully for both.

### Content Area — Top Row
- **Left**: Common name (Playfair Display, rust color) + Scientific name (Lora italic, muted).
- **Right**: "Active N days" badge + action links (eBird map, Latest checklist, Discuss) — existing links, repositioned.

### Content Area — Middle Row
- **Details**: Location, first seen, last seen, total reports — existing fields, condensed to a single line.

### Sighting Histogram
- **Position**: Pinned to the bottom of the content area.
- **Time Series**: Daily sighting counts for the past 21 days.
- **Bar Color**: Matches rarity color (same `getRarityColor()` output as the left border).
- **Hover Tooltip**: Date + count (e.g. "Apr 18: 24").
- **Hotspot breakdown**: Deferred.
- **X-Axis**: First and last date labels only.

## Data Requirements
No new backend endpoints. The histogram requires per-day sighting counts.
- **Chosen Approach**: Add a `dailyCounts: { date: string; count: number }[]` field to the existing `/api/incidents` response. This is more efficient than sending all sightings to the client.
- **Photo Data**: The photo slot expects a `photo: { url: string; attribution: string } | null` field on the incident object.

## Typography
- **Common name**: Playfair Display, 500 weight.
- **Scientific name**: Lora italic.
- **Metadata, labels, links**: Lora.
- **Fonts**: Already loaded in the project.

## Out of Scope
- Photo fetching or caching (T9).
- Histogram tooltip hotspot breakdown.
- Map inset or detail view (T10b).
- Gemini summary display (already implemented in `chase_intel_summarization_20260416`, wiring to new card layout is in scope for T10b).
- Any backend schema changes.

## Acceptance Criteria
- Each incident renders as a horizontal card matching the mockup.
- Histogram renders with correct per-day counts and hoverable tooltips.
- Photo slot renders placeholder when photo is null, photo when populated.
- Attribution overlay appears on photo hover.
- Rarity color drives both left border and histogram bar color consistently.
- Existing functionality (links, rarity filter bar, streak display) unaffected.
