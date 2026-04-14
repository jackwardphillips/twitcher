import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  normalizeScientificName, 
  findMatchingIncident, 
  createIncident, 
  addSightingToIncident,
  closeInactiveIncidents
} from './incident-service';
import { IncidentStatus } from '@prisma/client';

// Mock Prisma
const prismaMock = {
  incident: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  sighting: {
    update: vi.fn(),
  },
  $transaction: vi.fn((cb) => cb(prismaMock)),
};

describe('IncidentService', () => {
  describe('normalizeScientificName', () => {
    it('should strip parenthetical qualifiers from scientific names', () => {
      expect(normalizeScientificName('Lonchura malacca (Exotic: Naturalized)')).toBe('Lonchura malacca');
      expect(normalizeScientificName('Passer domesticus (Established)')).toBe('Passer domesticus');
    });

    it('should trim whitespace', () => {
      expect(normalizeScientificName('  Lonchura malacca  ')).toBe('Lonchura malacca');
    });

    it('should handle names without parentheses', () => {
      expect(normalizeScientificName('Turdus migratorius')).toBe('Turdus migratorius');
    });

    it('should handle multiple sets of parentheses (though unlikely)', () => {
      expect(normalizeScientificName('Species name (extra) (info)')).toBe('Species name');
    });

    it('should handle empty or null-like input gracefully', () => {
      // @ts-expect-error - testing invalid input
      expect(normalizeScientificName(null)).toBe('');
      // @ts-expect-error - testing invalid input
      expect(normalizeScientificName(undefined)).toBe('');
      expect(normalizeScientificName('')).toBe('');
    });
  });

  describe('findMatchingIncident', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should return null if no matching incidents exist by scientific name', async () => {
      prismaMock.incident.findMany.mockResolvedValue([]);
      
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', 40.0, -75.0);
      
      expect(result).toBeNull();
      expect(prismaMock.incident.findMany).toHaveBeenCalledWith({
        where: {
          scientificName: 'Turdus migratorius',
          status: { in: ['OPEN', 'CLOSED'] }
        },
        include: { sightings: true }
      });
    });

    it('should match an incident if a sighting is within 10km', async () => {
      const mockIncident = {
        id: 'inc-1',
        scientificName: 'Turdus migratorius',
        status: 'OPEN',
        sightings: [
          { latitude: 40.0, longitude: -75.0 }
        ]
      };
      
      prismaMock.incident.findMany.mockResolvedValue([mockIncident]);
      
      // 40.05, -75.05 is about 7km from 40.0, -75.0
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', 40.05, -75.05);
      
      expect(result).toEqual(mockIncident);
    });

    it('should prioritized OPEN incidents over CLOSED ones', async () => {
       const openIncident = {
        id: 'inc-open',
        scientificName: 'Turdus migratorius',
        status: 'OPEN',
        sightings: [{ latitude: 40.0, longitude: -75.0 }]
      };
      const closedIncident = {
        id: 'inc-closed',
        scientificName: 'Turdus migratorius',
        status: 'CLOSED',
        sightings: [{ latitude: 40.0, longitude: -75.0 }]
      };
      
      prismaMock.incident.findMany.mockResolvedValue([closedIncident, openIncident]);
      
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', 40.01, -75.01);
      
      expect(result?.id).toBe('inc-open');
    });
  });

  describe('createIncident', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should create a new incident with summary data from the first sighting', async () => {
      const mockSighting = {
        id: 1,
        scientificName: 'Lonchura malacca (Exotic)',
        species: 'Tricolored Munia',
        latitude: 40.0,
        longitude: -75.0,
        date: new Date('2026-04-01T10:00:00Z'),
        location: 'Test Location, Montgomery, PA, US'
      };

      prismaMock.incident.create.mockResolvedValue({ id: 'inc-1' });

      const result = await createIncident(prismaMock as any, mockSighting as any);

      expect(result.id).toBe('inc-1');
      expect(prismaMock.incident.create).toHaveBeenCalledWith({
        data: {
          scientificName: 'Lonchura malacca',
          commonName: 'Tricolored Munia',
          status: 'OPEN',
          minLat: 40.0,
          maxLat: 40.0,
          minLng: -75.0,
          maxLng: -75.0,
          firstSeen: mockSighting.date,
          lastSeen: mockSighting.date,
          sightingCount: 1,
          primaryCounty: 'Montgomery',
          primaryState: 'PA',
          primaryCountry: 'US',
          statesCovered: JSON.stringify(['PA']),
          sightings: {
            connect: { id: 1 }
          }
        }
      });
    });
  });

  describe('addSightingToIncident', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should update incident summary when adding a sighting', async () => {
      const existingIncident = {
        id: 'inc-1',
        minLat: 40.0,
        maxLat: 40.0,
        minLng: -75.0,
        maxLng: -75.0,
        firstSeen: new Date('2026-04-01T10:00:00Z'),
        lastSeen: new Date('2026-04-01T10:00:00Z'),
        sightingCount: 1,
        statesCovered: JSON.stringify(['PA']),
        status: 'CLOSED',
        closedAt: new Date('2026-04-02T10:00:00Z')
      };

      const newSighting = {
        id: 2,
        latitude: 40.1,
        longitude: -74.9,
        date: new Date('2026-04-03T10:00:00Z'),
        location: 'New Location, Burlington, NJ, US'
      };

      await addSightingToIncident(prismaMock as any, existingIncident as any, newSighting as any);

      expect(prismaMock.incident.update).toHaveBeenCalledWith({
        where: { id: 'inc-1' },
        data: {
          minLat: 40.0,
          maxLat: 40.1,
          minLng: -75.0,
          maxLng: -74.9,
          lastSeen: newSighting.date,
          sightingCount: 2,
          statesCovered: JSON.stringify(['PA', 'NJ']),
          status: 'OPEN',
          closedAt: null
        }
      });
      expect(prismaMock.sighting.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { incidentId: 'inc-1' }
      });
    });

    it('should NOT reopen if it was PERMANENTLY_CLOSED', async () => {
      const existingIncident = {
        id: 'inc-1',
        status: 'PERMANENTLY_CLOSED',
        sightings: []
      };
      const newSighting = { id: 2, date: new Date() };
      
      await expect(addSightingToIncident(prismaMock as any, existingIncident as any, newSighting as any))
        .rejects.toThrow('Cannot add sighting to PERMANENTLY_CLOSED incident');
    });
  });

  describe('closeInactiveIncidents', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-20T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should close incidents inactive for > 5 days', async () => {
      const activeIncident = {
        id: 'inc-active',
        status: 'OPEN',
        lastSeen: new Date('2026-04-18T10:00:00Z') // 2 days ago
      };
      const inactiveIncident = {
        id: 'inc-inactive',
        status: 'OPEN',
        lastSeen: new Date('2026-04-10T10:00:00Z') // 10 days ago
      };

      prismaMock.incident.findMany.mockResolvedValueOnce([activeIncident, inactiveIncident]);
      prismaMock.incident.findMany.mockResolvedValueOnce([]); // No closed incidents

      await closeInactiveIncidents(prismaMock as any);

      expect(prismaMock.incident.update).toHaveBeenCalledWith({
        where: { id: 'inc-inactive' },
        data: { status: 'CLOSED', closedAt: expect.any(Date) }
      });
    });
  });
});
