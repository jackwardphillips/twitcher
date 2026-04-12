# Specification — Rarity Code Filter

## Overview
Add a multi-select rarity code filter to the dashboard header to allow users to filter sightings by ABA rarity codes (1-6). This providing a more focused view, especially for users only interested in higher-tier rarities (codes 3-6 by default).

## Goals
- Provide a clear, visual way to filter the dashboard by rarity codes.
- Ensure consistent filtering across both the card list and the map pins.
- Maintain the \"Field Journal\" aesthetic using the existing rarity color system.

## Functional Requirements
- **Filter UI (Desktop):** Six inline toggle buttons (one per code 1-6), each styled with its rarity color.
- **Filter UI (Mobile):** A compact dropdown menu containing toggles for ABA codes 1 through 6 on viewports narrower than ~600px.
- **Header Placement:** The filter should group visually with the existing \"Filter Near Me\" button in the header.
- **Default State:** Codes 3, 4, 5, and 6 are selected by default on every load.
- **Single Source of Truth:** Deselecting a code hides matching sightings from both the `sightings-list` and the `SightingMap`.
- **Empty-State Guard:** At least one code must remain selected at all times. If the user tries to deselect the last active code, the action is ignored (toggle disabled/feedback message).
- **Visual Styling:** Each toggle in the dropdown/inline UI should use the rarity color defined in `RARITY_COLOR_MAP` for that code.

## Non-Functional Requirements
- **Consistency:** The UI must adhere to the \"Field Journal\" design system (Playfair Display / Lora typography).
- **Performance:** Filtering should be performed client-side on the already-fetched `sightings` array to ensure instantaneous updates.

## Acceptance Criteria
- [ ] Default selection is codes 3, 4, 5, 6 on every load.
- [ ] Deselecting a code hides matching cards in the list.
- [ ] Deselecting a code hides matching pins on the map (verify in running app).
- [ ] At least one code remains selected; the last active toggle cannot be deselected.
- [ ] Buttons/Toggles are styled with their respective rarity colors from `rarity-utils.ts`.
- [ ] Filter UI is positioned between the title block and the \"Filter Near Me\" button.
- [ ] Responsive switch: Inline on desktop, dropdown on mobile (<600px).

## Integration Touchpoints

### Components this track must update

| Component | Field | Current Status | After This Track |
|---|---|---|---|
| Dashboard | Filter Controls | Only \"Near Me\" filter | Added Rarity Code dropdown/inline filter |
| Dashboard | Sighting Filtering | Filters by proximity only | Filters by proximity AND rarity code |
| SightingMap | Pin Display | Shows all proximity-filtered pins | Shows pins filtered by proximity AND rarity code |

### New data this track produces
None. This track uses existing `rarity` field on the `Sighting` objects.

### Components this track does NOT touch
- SightingCard: The card itself won't change, but its visibility will be toggled.
- Backend API: No changes required to `/api/sightings`.

## Out of Scope
- Filtering by state, distance (beyond existing \"Near Me\"), or date.
- Persistence of filter selection across sessions.
- Modifying rarity color definitions.

## Tech Stack Notes
None.