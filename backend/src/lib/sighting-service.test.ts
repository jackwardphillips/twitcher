import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveSightings } from './sighting-service';
import { prisma } from './db';

vi.mock('./db', () => ({
  prisma: {
    sighting: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    rarityCode: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('./enrichment-service', () => {
  return {
    EnrichmentService: class {
      enrichAllUnenriched = vi.fn().mockResolvedValue(undefined);
      enrichSighting = vi.fn().mockResolvedValue(undefined);
      enrichSightings = vi.fn().mockResolvedValue(undefined);
    },
  };
});

vi.mock('./ebird-client', () => ({
  EbirdClient: vi.fn(),
}));

vi.mock('./match-engine', () => ({
  MatchEngine: vi.fn(),
}));

vi.mock('./region-service', () => ({
  RegionService: vi.fn(),
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
      {
        species: 'Common Bird',
        scientificName: 'Commonis birdis',
        count: 1,
        confirmed: true,
        observer: 'Alexander Dabbs',
        location: 'Deering Rd',
        date: new Date('2026-03-29T17:00:00Z'),
      },
    ];

    (prisma.rarityCode.findMany as any).mockResolvedValue([
      { scientificName: 'Anser fabalis', abaCode: 4 }
    ]);

    (prisma.sighting.create as any).mockImplementation(({ data }: any) => Promise.resolve({
      id: Math.floor(Math.random() * 1000),
      ...data,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
    }));

    await saveSightings(mockSightings);

    expect(prisma.sighting.create).toHaveBeenCalledTimes(2);
    expect(prisma.sighting.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        species: 'Taiga Bean-Goose',
        rarity: 4
      }),
    });
    expect(prisma.sighting.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        species: 'Common Bird',
        rarity: 0
      }),
    });
  });
});
