import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveSightings } from './sighting-service';
import prisma from './db';

vi.mock('./db', () => ({
  default: {
    sighting: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
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

    expect(prisma.sighting.create).toHaveBeenCalledTimes(1);
    expect(prisma.sighting.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        species: 'Taiga Bean-Goose',
        scientificName: 'Anser fabalis',
        observer: 'Alexander Dabbs',
      }),
    });
  });
});
