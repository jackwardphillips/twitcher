# Specification: Rarity Color Implementation

## Overview
Currently, the `getRarityColor` function in `Dashboard.tsx` is hardcoded with logic based on species keywords. This track will replace that implementation with a dynamic lookup, utilizing the `abaCode` from the backend database against a static mapping in the frontend.

## Functional Requirements
- Backend: Expose `abaCode` information for sightings by joining `Sighting` with `RarityCode` at query time.
- Frontend: `Dashboard.tsx` will use this `abaCode` to determine the card's left-border color using a static `RARITY_COLOR_MAP: Record<number, string>`.
- Mapping:
  - 1: #9e9e9e
  - 2: #9e9e9e
  - 3: #7a9e7e
  - 4: #c9a84c
  - 5: #6b3fa0
  - 6: #a01010
  - Default: #9e9e9e
- Default: If rarity information is missing, use the default #9e9e9e.

## Non-Functional Requirements
- Maintain performance: Rarity information should ideally be included with the sighting data to avoid an extra network roundtrip.

## Acceptance Criteria
- Dashboard sightings display colors derived from the `abaCode` provided by the backend, mapped via frontend constant.
- Hardcoded string matching in `Dashboard.tsx` is removed.
- Default color is used as a fallback if no rarity information is available.

## Out of Scope
- Modifying the existing `RarityCode` table schema or data.
- Modifying the visual design of the cards beyond the border color.
