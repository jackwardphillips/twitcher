# Specification - Bug: Incident Dates & Histogram Mismatch

Incident cards are showing incorrect dates for "first seen" and "last seen". These dates appear to be tied to the time the email was ingested rather than the actual sighting date reported in the email. Additionally, the activity histogram shows a correct distribution of sightings but the dates on the x-axis (tooltips) are misaligned or mislabeled.

## Requirements

- **Date Accuracy**: Ensure `firstSeen` and `lastSeen` on the `Incident` model are strictly derived from the `date` field of the aggregated `Sighting` records.
- **Histogram Alignment**: Ensure the activity histogram correctly maps sightings to the dates they occurred, and tooltips reflect the correct calendar day.
- **Timezone Safety**: Dates extracted from eBird emails should be treated consistently (e.g., as local dates or normalized to UTC at midnight) to avoid "off-by-one" day errors.

## Proposed Changes

### Backend

- **ebird-parser.ts**:
    - Improve date parsing to handle relative dates like "Today" or "Yesterday" if they appear in alerts.
    - Ensure dates are parsed with a consistent timezone assumption (e.g., use the observer's local time or normalize to UTC).
- **incident-service.ts**:
    - In `getOpenIncidents`, verify that the `dailyCounts` generation correctly aligns `sightingsByDate` with the generated calendar days.
    - Ensure `firstSeen` and `lastSeen` are updated correctly when adding sightings, especially if sightings arrive out of order.
- **API Serialization (index.ts / incident-service.ts)**:
    - **Mandatory**: Format all date fields (`firstSeen`, `lastSeen`, and dates in `dailyCounts`) as "YYYY-MM-DD" strings before sending them in the JSON response. This prevents the frontend from applying local timezone offsets to ISO timestamps.

### Frontend

- **SightingHistogram.tsx**:
    - Verify that `new Date(hovered.date)` in the tooltip handles the date string correctly without timezone shifts.
    - Consider formatting the date string in the backend to be timezone-agnostic (e.g., "YYYY-MM-DD") to avoid JS `Date` constructor ambiguities.

## Verification Plan

- **Automated Tests**:
    - Add a test in `ebird-parser.test.ts` with various date formats (fixed date, relative if applicable).
    - Add a test in `incident-service.test.ts` to verify `firstSeen`/`lastSeen` bounds when sightings are added out of chronological order.
    - Add a test for `getOpenIncidents` to verify histogram data alignment.
- **Manual Verification**:
    - Ingest a known email with a specific sighting date.
    - Verify the incident card shows that date, not the current date.
    - Hover over the histogram bars and verify the dates match the expected 21-day window.
