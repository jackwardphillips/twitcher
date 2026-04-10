import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseEBirdAlert } from './ebird-parser';

describe('eBird Parser Robustness', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should skip records with missing scientific name or count', () => {
    const malformedSpecies = `
Taiga Bean-Goose (Anser fabalis) CONFIRMED
- Reported Mar 29, 2026 17:00 by Alexander Dabbs
- Deering Rd, Capital CA-BC
`;
    const sightings = parseEBirdAlert(malformedSpecies);
    expect(sightings).toHaveLength(0);
    // expect(console.warn).toHaveBeenCalled(); // Should be added later when we implement logging
  });

  it('should skip records with missing date/observer line', () => {
    const missingDate = `
Taiga Bean-Goose (Anser fabalis) (2) CONFIRMED
- Deering Rd, Capital CA-BC
- Map: http://maps.google.com/?q=test
`;
    const sightings = parseEBirdAlert(missingDate);
    // CURRENT BEHAVIOR: It might still return a sighting with default date/observer
    // SPEC REQUIREMENT: It should skip the record.
    expect(sightings).toHaveLength(0);
  });

  it('should skip records with missing location', () => {
    const missingLocation = `
Taiga Bean-Goose (Anser fabalis) (2) CONFIRMED
- Reported Mar 29, 2026 17:00 by Alexander Dabbs
- Map: http://maps.google.com/?q=test
`;
    // Current behavior might set location to ''
    const sightings = parseEBirdAlert(missingLocation);
    expect(sightings).toHaveLength(0);
  });

  it('should skip records with invalid date format', () => {
    const invalidDate = `
Taiga Bean-Goose (Anser fabalis) (2) CONFIRMED
- Reported NOT_A_DATE by Alexander Dabbs
- Deering Rd, Capital CA-BC
`;
    const sightings = parseEBirdAlert(invalidDate);
    expect(sightings).toHaveLength(0);
  });
});
