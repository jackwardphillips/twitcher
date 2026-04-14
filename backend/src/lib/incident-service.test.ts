import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeScientificName, findMatchingIncident } from './incident-service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const prismaMock = {
  incident: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
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

    it('should not match an incident if all sightings are further than 10km', async () => {
      const mockIncident = {
        id: 'inc-1',
        scientificName: 'Turdus migratorius',
        status: 'OPEN',
        sightings: [
          { latitude: 40.0, longitude: -75.0 }
        ]
      };
      
      prismaMock.incident.findMany.mockResolvedValue([mockIncident]);
      
      // 40.2, -75.2 is about 28km from 40.0, -75.0
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', 40.2, -75.2);
      
      expect(result).toBeNull();
    });

    it('should prioritize OPEN incidents over CLOSED ones', async () => {
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

    it('should maintain order if statuses are the same', async () => {
       const openIncident1 = {
        id: 'inc-open-1',
        scientificName: 'Turdus migratorius',
        status: 'OPEN',
        sightings: [{ latitude: 40.0, longitude: -75.0 }]
      };
      const openIncident2 = {
        id: 'inc-open-2',
        scientificName: 'Turdus migratorius',
        status: 'OPEN',
        sightings: [{ latitude: 40.0, longitude: -75.0 }]
      };
      
      prismaMock.incident.findMany.mockResolvedValue([openIncident1, openIncident2]);
      
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', 40.01, -75.01);
      
      expect(result?.id).toBe('inc-open-1');
    });

    it('should sort CLOSED after OPEN if CLOSED is first in list', async () => {
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

    it('should maintain order if statuses are both CLOSED', async () => {
       const closedIncident1 = {
        id: 'inc-closed-1',
        scientificName: 'Turdus migratorius',
        status: 'CLOSED',
        sightings: [{ latitude: 40.0, longitude: -75.0 }]
      };
      const closedIncident2 = {
        id: 'inc-closed-2',
        scientificName: 'Turdus migratorius',
        status: 'CLOSED',
        sightings: [{ latitude: 40.0, longitude: -75.0 }]
      };
      
      prismaMock.incident.findMany.mockResolvedValue([closedIncident1, closedIncident2]);
      
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', 40.01, -75.01);
      
      expect(result?.id).toBe('inc-closed-1');
    });

    it('should return null if latitude or longitude is missing', async () => {
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', null as any, -75.0);
      expect(result).toBeNull();
      expect(prismaMock.incident.findMany).not.toHaveBeenCalled();
    });

    it('should handle sightings with null coordinates in the incident', async () => {
      const mockIncident = {
        id: 'inc-1',
        scientificName: 'Turdus migratorius',
        status: 'OPEN',
        sightings: [
          { latitude: null, longitude: null },
          { latitude: 40.0, longitude: -75.0 }
        ]
      };
      
      prismaMock.incident.findMany.mockResolvedValue([mockIncident]);
      
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', 40.01, -75.01);
      
      expect(result).toEqual(mockIncident);
    });
  });
});
