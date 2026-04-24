import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  normalizeScientificName, 
  findMatchingIncident, 
  createIncident, 
  addSightingToIncident,
  closeInactiveIncidents,
  getOpenIncidents
} from './incident-service';
import { IncidentStatus } from '@prisma/client';

// Mock Prisma
const prismaMock = {
  incident: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  sighting: {
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  rarityCode: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((cb) => cb(prismaMock)),
};

describe('IncidentService', () => {
  describe('getOpenIncidents', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should fetch only OPEN incidents and enrich them with rarity and summary data', async () => {
      const mockIncident = {
        id: 'inc-1',
        scientificName: 'Turdus migratorius',
        commonName: 'American Robin',
        status: 'OPEN',
        minLat: 40.0,
        maxLat: 40.2,
        minLng: -75.0,
        maxLng: -74.8,
        firstSeen: new Date('2026-04-10T10:00:00Z'),
        lastSeen: new Date('2026-04-15T10:00:00Z'),
        sightingCount: 5,
        primaryCounty: 'Montgomery',
        primaryState: 'PA',
        primaryCountry: 'US',
        sightings: [
          { id: 5, date: new Date('2026-04-15T10:00:00Z'), mapUrl: 'map5', checklistUrl: 'check5' },
          { id: 1, date: new Date('2026-04-10T10:00:00Z'), mapUrl: 'map1', checklistUrl: 'check1' }
        ]
      };

      const mockRarity = {
        scientificName: 'Turdus migratorius',
        abaCode: 1
      };

      prismaMock.incident.findMany.mockResolvedValue([mockIncident]);
      prismaMock.rarityCode.findMany.mockResolvedValue([mockRarity]);

      const result = await getOpenIncidents(prismaMock as any);

      expect(prismaMock.incident.findMany).toHaveBeenCalledWith({
        where: { status: 'OPEN' },
        include: {
          sightings: {
            orderBy: { date: 'desc' }
          }
        }
      });

      expect(result).toHaveLength(1);
      const enriched = result[0];
      expect(enriched.id).toBe('inc-1');
      expect(enriched.abaCode).toBe(1);
      expect(enriched.centroidLat).toBe(40.1);
      expect(enriched.centroidLng).toBe(-74.9);
      expect(enriched.locationName).toBe('PA, US');
      expect(enriched.latestMapUrl).toBe('map5');
      expect(enriched.latestChecklistUrl).toBe('check5');
      expect(enriched.activeDays).toBe(6); // 10th to 15th inclusive is 6 days
      expect(enriched.dailyCounts).toBeDefined();
      expect(Array.isArray(enriched.dailyCounts)).toBe(true);
      // We'll define exactly what we expect in the Green phase, but for now, it should exist.
    });

    it('should use scientificName normalization for rarity lookup', async () => {
       const mockIncident = {
        id: 'inc-1',
        scientificName: 'Lonchura malacca',
        status: 'OPEN',
        minLat: 0, maxLat: 0, minLng: 0, maxLng: 0,
        firstSeen: new Date(), lastSeen: new Date(),
        sightings: []
      };

      // In the database, rarity might be stored with the same scientific name
      const mockRarity = {
        scientificName: 'Lonchura malacca',
        abaCode: 4
      };

      prismaMock.incident.findMany.mockResolvedValue([mockIncident]);
      prismaMock.rarityCode.findMany.mockResolvedValue([mockRarity]);

      const result = await getOpenIncidents(prismaMock as any);
      expect(result[0].abaCode).toBe(4);
    });

    it('should handle incidents without matching rarity codes gracefully', async () => {
      const mockIncident = {
        id: 'inc-1',
        scientificName: 'Unknown species',
        status: 'OPEN',
        minLat: 0, maxLat: 0, minLng: 0, maxLng: 0,
        firstSeen: new Date(), lastSeen: new Date(),
        sightings: []
      };

      prismaMock.incident.findMany.mockResolvedValue([mockIncident]);
      prismaMock.rarityCode.findMany.mockResolvedValue([]);

      const result = await getOpenIncidents(prismaMock as any);
      expect(result[0].abaCode).toBeNull();
    });
  });

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

    it('should handle stray parentheses', () => {
      expect(normalizeScientificName('Lonchura malacca) (Exotic: Naturalized')).toBe('Lonchura malacca');
      expect(normalizeScientificName('Machetornis rixosa) (Exotic: Provisional')).toBe('Machetornis rixosa');
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

    it('should return empty array if no matching incidents exist by scientific name', async () => {
      prismaMock.incident.findMany.mockResolvedValue([]);
      
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', 40.0, -75.0, new Date());
      
      expect(result).toEqual([]);
      expect(prismaMock.incident.findMany).toHaveBeenCalledWith({
        where: {
          scientificName: 'Turdus migratorius',
          status: { in: ['OPEN', 'CLOSED'] }
        },
        include: { sightings: true }
      });
    });

    it('should match an incident if a sighting is within 10km (base 25km radius now)', async () => {
      const mockIncident = {
        id: 'inc-1',
        scientificName: 'Turdus migratorius',
        status: 'OPEN',
        lastSeen: new Date(),
        sightings: [
          { latitude: 40.0, longitude: -75.0 }
        ]
      };
      
      prismaMock.incident.findMany.mockResolvedValue([mockIncident]);
      
      // 40.05, -75.05 is about 7km from 40.0, -75.0
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', 40.05, -75.05, new Date());
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockIncident);
    });

    it('should prioritized OPEN incidents over CLOSED ones', async () => {
       const openIncident = {
        id: 'inc-open',
        scientificName: 'Turdus migratorius',
        status: 'OPEN',
        lastSeen: new Date(),
        sightings: [{ latitude: 40.0, longitude: -75.0 }]
      };
      const closedIncident = {
        id: 'inc-closed',
        scientificName: 'Turdus migratorius',
        status: 'CLOSED',
        lastSeen: new Date(),
        sightings: [{ latitude: 40.0, longitude: -75.0 }]
      };
      
      prismaMock.incident.findMany.mockResolvedValue([closedIncident, openIncident]);
      
      const result = await findMatchingIncident(prismaMock as any, 'Turdus migratorius', 40.01, -75.01, new Date());
      
      expect(result[0]?.id).toBe('inc-open');
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
          statesCovered: JSON.stringify(['PA'])
        }
      });
      expect(prismaMock.sighting.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { incidentId: 'inc-1' }
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
          firstSeen: existingIncident.firstSeen,
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

    it('should close incidents inactive for > 3 days', async () => {
      const activeIncident = {
        id: 'inc-active',
        status: 'OPEN',
        lastSeen: new Date('2026-04-18T10:00:00Z') // 2 days ago
      };
      const inactiveIncident = {
        id: 'inc-inactive',
        status: 'OPEN',
        lastSeen: new Date('2026-04-16T10:00:00Z') // 4 days ago
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

  describe('Fragmentation Reproduction (Cook\'s Petrel April 22, 2026)', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should NOT fragment Cook\'s Petrel sightings with new velocity-aware radius', async () => {
      // S0: 13:44, Lat: 37.535089, Lng: -123.665607
      const s0 = {
        scientificName: 'Pterodroma cookii',
        latitude: 37.535089,
        longitude: -123.665607,
        date: new Date('2026-04-22T13:44:00.000Z')
      };

      // S10: 14:05, Lat: 37.62679, Lng: -123.737018
      const s10 = {
        scientificName: 'Pterodroma cookii',
        latitude: 37.62679,
        longitude: -123.737018,
        date: new Date('2026-04-22T14:05:00.000Z')
      };

      // S11: 14:15, Lat: 37.4027, Lng: -123.4622 (21km from S0, 34km from S10)
      const s11 = {
        scientificName: 'Pterodroma cookii',
        latitude: 37.4027,
        longitude: -123.4622,
        date: new Date('2026-04-22T14:15:00.000Z')
      };

      // Mock behavior: first check finds no incident
      prismaMock.incident.findMany.mockResolvedValueOnce([]);
      
      const match1 = await findMatchingIncident(prismaMock as any, s0.scientificName, s0.latitude, s0.longitude, s0.date);
      expect(match1).toHaveLength(0);

      // Create first incident (Inc A) with S0 and S10
      const incA = {
        id: 'inc-A',
        scientificName: s0.scientificName,
        status: 'OPEN',
        lastSeen: s10.date,
        sightings: [s0, s10]
      };

      // Second check (for S11) finds Inc A.
      // S11 is 21km from S0. 
      // Time diff S11 to Inc.lastSeen (S10) is 10 mins (0.17h).
      // Radius is 25 + 0.17*50 = 33.5km.
      // 21km < 33.5km. Match!
      
      prismaMock.incident.findMany.mockResolvedValueOnce([incA]);
      const match2 = await findMatchingIncident(prismaMock as any, s11.scientificName, s11.latitude, s11.longitude, s11.date);
      expect(match2).not.toHaveLength(0); 
    });

    it('should bridge and merge two separate incidents', async () => {
      const s1 = { id: 1, scientificName: 'Bird A', latitude: 40.0, longitude: -75.0, date: new Date('2026-04-01T10:00:00Z'), location: 'L1' };
      const s2 = { id: 2, scientificName: 'Bird A', latitude: 40.1, longitude: -75.0, date: new Date('2026-04-01T10:05:00Z'), location: 'L2' };
      const s3 = { id: 3, scientificName: 'Bird A', latitude: 40.05, longitude: -75.0, date: new Date('2026-04-01T10:10:00Z'), location: 'L3' };

      const inc1 = { 
        id: 'inc-1', 
        scientificName: 'Bird A', 
        status: 'OPEN', 
        lastSeen: s1.date, 
        sightings: [s1], 
        createdAt: new Date('2026-04-01T10:00:00Z'), 
        statesCovered: '["PA"]', 
        minLat: 40.0, maxLat: 40.0, minLng: -75.0, maxLng: -75.0, 
        firstSeen: s1.date,
        sightingCount: 1
      };
      const inc2 = { 
        id: 'inc-2', 
        scientificName: 'Bird A', 
        status: 'OPEN', 
        lastSeen: s2.date, 
        sightings: [s2], 
        createdAt: new Date('2026-04-01T10:05:00Z'), 
        statesCovered: '["PA"]', 
        minLat: 40.1, maxLat: 40.1, minLng: -75.0, maxLng: -75.0, 
        firstSeen: s2.date,
        sightingCount: 1
      };

      prismaMock.incident.findMany.mockResolvedValue([inc1, inc2]);
      prismaMock.incident.update.mockResolvedValue({ ...inc1, sightingCount: 3 });
      
      const matches = await findMatchingIncident(prismaMock as any, 'Bird A', s3.latitude, s3.longitude, s3.date);
      expect(matches).toHaveLength(2);

      await addSightingToIncident(prismaMock as any, matches, s3 as any);
      
      // Verify merge reassigned sightings from inc2 to inc1
      expect(prismaMock.sighting.updateMany).toHaveBeenCalledWith({
        where: { incidentId: { in: ['inc-2'] } },
        data: { incidentId: 'inc-1' }
      });
      // Verify inc2 was deleted
      expect(prismaMock.incident.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['inc-2'] } }
      });
      // Verify s3 was added to inc1
      expect(prismaMock.sighting.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { incidentId: 'inc-1' }
      });
    });
  });
});
