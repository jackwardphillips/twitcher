import { describe, it, expect, vi } from 'vitest';
import { parseEBirdAlert } from './ebird-parser';

describe('eBird Parser Date Reproduction', () => {
  it('should parse "Today" correctly when providing a basisDate', () => {
    // Current system time is April 23
    vi.setSystemTime(new Date('2026-04-23T10:00:00Z'));

    const emailWithToday = `
Species Name (Scientific Name) (1)
- Reported Today 08:00 by Observer Name
- Location Name
`;

    // Email was received on April 21
    const basisDate = new Date('2026-04-21T10:00:00Z');
    
    const sightings = parseEBirdAlert(emailWithToday, basisDate);
    expect(sightings).toHaveLength(1);
    
    // It should be April 21, 2026
    const sightingDate = sightings[0].date;
    expect(sightingDate.getFullYear()).toBe(2026);
    expect(sightingDate.getMonth()).toBe(3); // April
    expect(sightingDate.getDate()).toBe(21);
    expect(sightingDate.getHours()).toBe(8);

    vi.useRealTimers();
  });

  it('should parse "Yesterday" correctly when providing a basisDate', () => {
    vi.setSystemTime(new Date('2026-04-23T10:00:00Z'));

    const emailWithYesterday = `
Species Name (Scientific Name) (1)
- Reported Yesterday 20:00 by Observer Name
- Location Name
`;

    const basisDate = new Date('2026-04-21T10:00:00Z');
    const sightings = parseEBirdAlert(emailWithYesterday, basisDate);
    
    // Yesterday relative to April 21 is April 20
    const sightingDate = sightings[0].date;
    expect(sightingDate.getDate()).toBe(20);
    expect(sightingDate.getHours()).toBe(20);

    vi.useRealTimers();
  });

  it('should parse absolute dates correctly but they might be shifted by timezone', () => {
    const emailWithDate = `
Species Name (Scientific Name) (1)
- Reported Apr 01, 2026 15:00 by Observer Name
- Location Name
`;
    // This depends on the local timezone of the machine running the test
    const sightings = parseEBirdAlert(emailWithDate);
    const date = sightings[0].date;
    
    // If we want to be timezone-resilient, we should ensure the backend normalizes these.
    // eBird alerts are likely in the local time of the sighting, but doesn't say which.
    // The spec says: "Format all date fields... as 'YYYY-MM-DD' strings before sending...
    // This prevents the frontend from applying local timezone offsets to ISO timestamps."
    
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3); // April
    expect(date.getDate()).toBe(1);
  });
});
