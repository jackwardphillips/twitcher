import { describe, expect, it } from 'vitest';
import { parseEBirdAlertSummary } from './alert-summary-parser';

describe('parseEBirdAlertSummary', () => {
  it('parses species-region targets from the summary block', () => {
    const email = `
*** Species Summary:

Smew (3 Alaska)
Tufted Duck (23 British Columbia, 1 Massachusetts, 2 Newfoundland and Labra=
dor, 8 Ontario)
White Wagtail (2 Washington)
White Wagtail (Black-backed) (2 Washington)
Mottled Owl (6 Texas)

---------------------------------------------

Smew (Mergellus albellus) (1)
- Reported Jul 23, 2026 10:00 by Observer
- 262 Surfview Ct
`;

    expect(parseEBirdAlertSummary(email)).toEqual([
      { species: 'Smew', expectedReports: 3, regionName: 'Alaska' },
      { species: 'Tufted Duck', expectedReports: 23, regionName: 'British Columbia' },
      { species: 'Tufted Duck', expectedReports: 1, regionName: 'Massachusetts' },
      { species: 'Tufted Duck', expectedReports: 2, regionName: 'Newfoundland and Labrador' },
      { species: 'Tufted Duck', expectedReports: 8, regionName: 'Ontario' },
      { species: 'White Wagtail', expectedReports: 4, regionName: 'Washington' },
      { species: 'Mottled Owl', expectedReports: 6, regionName: 'Texas' },
    ]);
  });

  it('does not treat detailed sighting rows as summary targets', () => {
    const email = `
Pink-footed Goose (Anser brachyrhynchus) (1) CONFIRMED
- Reported Apr 01, 2026 15:43 by Shelley Vermillion
- Penobscot, Maine
`;

    expect(parseEBirdAlertSummary(email)).toEqual([]);
  });
});
