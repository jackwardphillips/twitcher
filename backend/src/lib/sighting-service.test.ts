import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveSightings } from './sighting-service';
import { prisma } from './db';

vi.mock('./db', () => ({
  prisma: {
    sighting: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('./enrichment-service', () => {
  return {
    EnrichmentService: class {
      enrichAllUnenriched = vi.fn().mockResolvedValue(undefined);
      enrichSighting = vi.fn().mockResolvedValue(undefined);
    },
  };
});

vi.mock('./ebird-client', () => ({
  EbirdClient: vi.fn(),
}));

vi.mock('./match-engine', () => ({
  MatchEngine: vi.fn(),
}));

describe('Sighting Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save multiple sightings to the database', async () => {
    const mockSightings = [
      {
        species: 'Taiga Bean-Goose',
        scientificName: 'Anser fabalis',
        count: 2,
        confirmed: true,
        observer: 'Alexander Dabbs',
        location: 'Deering Rd',
        date: new Date('2026-03-29T17:00:00Z'),
      },
    ];

    await saveSightings(mockSightings);

    expect(prisma.sighting.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.sighting.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        species: 'Taiga Bean-Goose',
        scientificName: 'Anser fabalis',
        observer: 'Alexander Dabbs',
      })],
    });
  });
});
