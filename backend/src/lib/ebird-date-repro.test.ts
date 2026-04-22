import { describe, it, expect, vi } from 'vitest';
import { parseEBirdAlert } from './ebird-parser';

describe('eBird Parser Date Reproduction', () => {
  it('should parse "Today" relative to system time (incorrect for historical emails)', () => {
    // Mock system time to April 22, 2026
    const mockNow = new Date('2026-04-22T10:00:00Z');
    vi.setSystemTime(mockNow);

    const emailWithToday = `
Species Name (Scientific Name) (1)
- Reported Today 08:00 by Observer Name
- Location Name
`;

    const sightings = parseEBirdAlert(emailWithToday);
    expect(sightings).toHaveLength(1);
    
    // It should be April 22, 2026
    const sightingDate = sightings[0].date;
    expect(sightingDate.getFullYear()).toBe(2026);
    expect(sightingDate.getMonth()).toBe(3); // April is 3
    expect(sightingDate.getDate()).toBe(22);
    
    // Now if we change system time, the same email content parses differently
    const mockLater = new Date('2026-04-23T10:00:00Z');
    vi.setSystemTime(mockLater);
    
    const sightingsLater = parseEBirdAlert(emailWithToday);
    expect(sightingsLater[0].date.getDate()).toBe(23); // WRONG: Email content stayed the same!

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
