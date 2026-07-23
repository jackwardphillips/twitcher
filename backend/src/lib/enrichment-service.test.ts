import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrichmentService } from './enrichment-service.js';
import { MatchEngine } from './match-engine.js';
import { prisma } from './db.js';
import { RegionService } from './region-service.js';
import type { EbirdObservation } from './ebird-client.js';

describe('EnrichmentService', () => {
  let matchEngine: MatchEngine;
  let regionService: RegionService;
  let enrichmentService: EnrichmentService;

  beforeEach(async () => {
    // Clean up DB before each test
    await prisma.ebirdApiCallLog.deleteMany({});
    await prisma.enrichmentAttempt.deleteMany({});
    await prisma.emailIngestionAttempt.deleteMany({});
    await prisma.sighting.deleteMany({});
    await prisma.incident.deleteMany({});
    await prisma.ingestionRun.deleteMany({});
    await prisma.incomingEmail.deleteMany({});
    
    matchEngine = {
      findMatch: vi.fn(),
      selectBestMatch: vi.fn(),
      ebirdClient: {
        getNotableObservations: vi.fn(),
        getNearbyNotableObservations: vi.fn(),
      },
    } as any;

    regionService = {
      findSubregionCode: vi.fn(),
    } as any;

    enrichmentService = new EnrichmentService(matchEngine, regionService);
  });

  it('should enrich a sighting with matching eBird observation', async () => {
    // 1. Arrange: Create an unenriched sighting in the database
    const sighting = await prisma.sighting.create({
      data: {
        species: 'Rare Goose',
        location: 'Victoria, BC (48.4, -123.3)',
        date: new Date('2026-03-29T12:00:00'),
        observer: 'Alice',
      },
    });

    const mockMatch: EbirdObservation = {
      speciesCode: 'rargoose',
      comName: 'Rare Goose',
      sciName: 'Anser rarus',
      locId: 'L123',
      locName: 'Victoria waterfront',
      obsDt: '2026-03-29 12:05',
      lat: 48.42,
      lng: -123.32,
      subId: 'S999',
      howMany: 2,
      obsValid: true,
      obsReviewed: true,
      locationPrivate: false,
    };

    (matchEngine.ebirdClient.getNearbyNotableObservations as any).mockResolvedValue([mockMatch]);
    (matchEngine.selectBestMatch as any).mockReturnValue(mockMatch);

    // 2. Act: Run enrichment
    await enrichmentService.enrichSighting(sighting.id);

    // 3. Assert: Sighting should be updated with geospatial and eBird metadata
    const enriched = await prisma.sighting.findUnique({
      where: { id: sighting.id },
    });

    expect(enriched?.subId).toBe('S999');
    expect(enriched?.latitude).toBe(48.42);
    expect(enriched?.longitude).toBe(-123.32);
    expect(enriched?.speciesCode).toBe('rargoose');
    expect(enriched?.howMany).toBe(2);
  });

  it('should cluster a sighting after enrichment', async () => {
    // Clean up incidents
    await prisma.incident.deleteMany({});

    const sighting = await prisma.sighting.create({
      data: {
        species: 'Tricolored Munia',
        scientificName: 'Lonchura malacca',
        location: 'Montgomery, PA, US',
        date: new Date('2026-04-01T10:00:00Z'),
        observer: 'John Doe',
      },
    });

    const mockMatch: EbirdObservation = {
      speciesCode: 'trimun',
      comName: 'Tricolored Munia',
      sciName: 'Lonchura malacca',
      locId: 'L123',
      locName: 'Test Park',
      obsDt: '2026-04-01 10:00',
      lat: 40.0,
      lng: -75.0,
      subId: 'S123',
      howMany: 1,
      obsValid: true,
      obsReviewed: true,
      locationPrivate: false,
    };

    (matchEngine.ebirdClient.getNotableObservations as any).mockResolvedValue([mockMatch]);
    (matchEngine.selectBestMatch as any).mockReturnValue(mockMatch);
    (regionService.findSubregionCode as any).mockResolvedValue(null);

    await enrichmentService.enrichSighting(sighting.id);

    // Verify Sighting was updated
    const enriched = await prisma.sighting.findUnique({
      where: { id: sighting.id }
    });
    expect(enriched?.latitude).toBe(40.0);

    // Verify Incident was created
    const incident = await prisma.incident.findFirst({
      where: { scientificName: 'Lonchura malacca' }
    });
    expect(incident).not.toBeNull();
    expect(enriched?.incidentId).toBe(incident?.id);
    expect(incident?.sightingCount).toBe(1);
  });

  it('should mark a sighting as checked even if no match found (to avoid infinite retry)', async () => {
    const sighting = await prisma.sighting.create({
      data: {
        species: 'Phantom Bird',
        location: 'Nowhere',
        date: new Date(),
        observer: 'Bob',
      },
    });

    (matchEngine.ebirdClient.getNotableObservations as any).mockResolvedValue([]);
    (matchEngine.selectBestMatch as any).mockReturnValue(null);
    (regionService.findSubregionCode as any).mockResolvedValue(null);

    await enrichmentService.enrichSighting(sighting.id);

    const unenriched = await prisma.sighting.findUnique({
      where: { id: sighting.id },
    });

    // It should still have null subId but we might need a way to track that it was checked
    // For now, let's be strict but log rejections.
    expect(unenriched?.subId).toBeNull();
  });

  it('should enrich all unenriched sightings', async () => {
    await prisma.sighting.create({
      data: { species: 'A', location: 'Victoria, British Columbia', date: new Date(), observer: '1' }
    });
    await prisma.sighting.create({
      data: { species: 'B', location: 'Portland, Maine', date: new Date(), observer: '2' }
    });

    (matchEngine.ebirdClient.getNotableObservations as any).mockResolvedValue([]);
    (matchEngine.ebirdClient.getNearbyNotableObservations as any).mockResolvedValue([]);
    (regionService.findSubregionCode as any).mockResolvedValue(null);

    // We also need to mock selectBestMatch for the new refactored logic
    (matchEngine as any).selectBestMatch = vi.fn().mockReturnValue({
      speciesCode: 'abc', comName: 'Bird', subId: 'S1', lat: 1, lng: 2
    });

    await enrichmentService.enrichAllUnenriched();

    const sightings = await prisma.sighting.findMany();
    expect(sightings.every(s => s.subId === 'S1')).toBe(true);
  });

  it('should use stored latitude and longitude for geo enrichment when location text has no coordinates', async () => {
    const sighting = await prisma.sighting.create({
      data: {
        species: 'Curlew Sandpiper',
        scientificName: 'Calidris ferruginea',
        location: 'Pte. Mouillee SGA, Monroe, Michigan',
        date: new Date('2026-07-21T15:40:00Z'),
        observer: 'Jane Doe',
        latitude: 41.961,
        longitude: -83.190,
      },
    });
    const mockMatch: EbirdObservation = {
      speciesCode: 'cursan',
      comName: 'Curlew Sandpiper',
      sciName: 'Calidris ferruginea',
      locId: 'L456',
      locName: 'Pte. Mouillee SGA',
      obsDt: '2026-07-21 15:42',
      lat: 41.962,
      lng: -83.191,
      subId: 'S456',
      howMany: 1,
      obsValid: true,
      obsReviewed: true,
      locationPrivate: false,
    };

    (matchEngine.ebirdClient.getNearbyNotableObservations as any).mockResolvedValue([mockMatch]);
    (matchEngine.selectBestMatch as any).mockReturnValue(mockMatch);

    await enrichmentService.enrichSighting(sighting.id);

    expect(matchEngine.ebirdClient.getNearbyNotableObservations).toHaveBeenCalledWith(
      41.961,
      -83.190,
      10,
      30,
      expect.anything()
    );
    expect(matchEngine.ebirdClient.getNotableObservations).not.toHaveBeenCalled();

    const enriched = await prisma.sighting.findUnique({ where: { id: sighting.id } });
    expect(enriched?.subId).toBe('S456');
  });

  it('should resolve newly covered US and Canada region mappings', async () => {
    await prisma.sighting.createMany({
      data: [
        {
          species: 'Curlew Sandpiper',
          location: 'Pte. Mouillee SGA, Monroe, Michigan',
          date: new Date('2026-07-21T15:40:00Z'),
          observer: 'A',
        },
        {
          species: 'Kelp Gull',
          location: 'stakeout Kelp Gull, Milwaukee, Wisconsin',
          date: new Date('2026-07-22T15:15:00Z'),
          observer: 'B',
        },
        {
          species: 'Rare Bird',
          location: 'Yellowknife, NWT',
          date: new Date('2026-07-22T15:15:00Z'),
          observer: 'C',
        },
        {
          species: 'Christmas Shearwater',
          location: 'Midway Atoll NWR--Eastern Island, Midway Islands',
          date: new Date('2026-07-22T15:15:00Z'),
          observer: 'D',
        },
        {
          species: 'Lesser Frigatebird',
          location: '262 Surfview Ct',
          date: new Date('2026-07-22T15:15:00Z'),
          observer: 'E',
        },
      ],
    });

    (regionService.findSubregionCode as any)
      .mockResolvedValueOnce('US-MI-115')
      .mockResolvedValueOnce('US-WI-079')
      .mockResolvedValueOnce(null);
    (matchEngine.ebirdClient.getNotableObservations as any).mockResolvedValue([]);
    (matchEngine.selectBestMatch as any).mockReturnValue(null);

    await enrichmentService.enrichAllUnenriched();

    expect(regionService.findSubregionCode).toHaveBeenCalledWith('Monroe', 'US-MI', expect.anything());
    expect(regionService.findSubregionCode).toHaveBeenCalledWith('Milwaukee', 'US-WI', expect.anything());
    expect(regionService.findSubregionCode).toHaveBeenCalledWith('Yellowknife', 'CA-NT', expect.anything());
    expect(regionService.findSubregionCode).toHaveBeenCalledWith('Midway Atoll NWR--Eastern Island', 'UM-71', expect.anything());
    expect(matchEngine.ebirdClient.getNotableObservations).toHaveBeenCalledWith('US-MI-115', 30, undefined);
    expect(matchEngine.ebirdClient.getNotableObservations).toHaveBeenCalledWith('US-WI-079', 30, undefined);
    expect(matchEngine.ebirdClient.getNotableObservations).toHaveBeenCalledWith('CA-NT', 30, undefined);
    expect(matchEngine.ebirdClient.getNotableObservations).toHaveBeenCalledWith('UM-71', 30, undefined);

    const unresolved = await prisma.enrichmentAttempt.findFirst({
      where: {
        species: 'Lesser Frigatebird',
        location: '262 Surfview Ct',
      },
    });
    expect(unresolved?.rejectionReason).toBe('region_not_found');
  });
});
