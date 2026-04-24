import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getOpenIncidents } from './incident-service';

// Mock Prisma
const prismaMock = {
  incident: {
    findMany: vi.fn(),
  },
  rarityCode: {
    findMany: vi.fn(),
  },
};

describe('Incident Histogram Reproduction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should align sightings correctly in the 21-day window', async () => {
    // Set system time to April 22, 2026, 10:00 AM
    const mockNow = new Date('2026-04-22T10:00:00Z');
    vi.setSystemTime(mockNow);

    const mockIncident = {
      id: 'inc-1',
      scientificName: 'Species',
      commonName: 'Species',
      status: 'OPEN',
      minLat: 0, maxLat: 0, minLng: 0, maxLng: 0,
      firstSeen: new Date('2026-04-01T00:00:00Z'),
      lastSeen: new Date('2026-04-22T00:00:00Z'),
      sightings: [
        // Sighting on the very first day of the 21-day window (April 2nd)
        { id: 1, date: new Date('2026-04-02T12:00:00Z') },
        // Sighting today (April 22nd)
        { id: 2, date: new Date('2026-04-22T08:00:00Z') }
      ]
    };

    prismaMock.incident.findMany.mockResolvedValue([mockIncident]);
    prismaMock.rarityCode.findMany.mockResolvedValue([]);

    const result = await getOpenIncidents(prismaMock as any);
    const dailyCounts = result[0].dailyCounts;

    expect(dailyCounts).toHaveLength(21);
    
    // Last day should be April 22
    expect(dailyCounts[20].date).toBe('2026-04-22');
    expect(dailyCounts[20].count).toBe(1);

    // First day should be April 2
    expect(dailyCounts[0].date).toBe('2026-04-02');
    expect(dailyCounts[0].count).toBe(1);
  });
});
