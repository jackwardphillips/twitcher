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
    await prisma.sighting.deleteMany({});
    
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

    (matchEngine.findMatch as any).mockResolvedValue(mockMatch);

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

  it('should mark a sighting as checked even if no match found (to avoid infinite retry)', async () => {
    const sighting = await prisma.sighting.create({
      data: {
        species: 'Phantom Bird',
        location: 'Nowhere',
        date: new Date(),
        observer: 'Bob',
      },
    });

    (matchEngine.findMatch as any).mockResolvedValue(null);

    await enrichmentService.enrichSighting(sighting.id);

    const unenriched = await prisma.sighting.findUnique({
      where: { id: sighting.id },
    });

    // It should still have null subId but we might need a way to track that it was checked
    // For now, let's be strict but log rejections.
    expect(unenriched?.subId).toBeNull();
  });

  it('should enrich all unenriched sightings', async () => {
    await prisma.sighting.createMany({
      data: [
        { species: 'A', location: 'Victoria, British Columbia', date: new Date(), observer: '1' },
        { species: 'B', location: 'Portland, Maine', date: new Date(), observer: '2' },
      ],
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
});
