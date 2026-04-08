import type { Sighting } from './ebird-parser.js';
import { prisma } from './db.js';
import { EbirdClient } from './ebird-client.js';
import { MatchEngine } from './match-engine.js';
import { EnrichmentService } from './enrichment-service.js';
import { RegionService } from './region-service.js';
import 'dotenv/config';

// Initialize services for background enrichment
const ebirdClient = new EbirdClient(process.env.EBIRD_API_KEY || '');
const matchEngine = new MatchEngine(ebirdClient);
const regionService = new RegionService(ebirdClient);
const enrichmentService = new EnrichmentService(matchEngine, regionService);

export async function saveSightings(sightings: Sighting[], enrich = true): Promise<void> {
  // Fetch rarity codes for all species in this batch
  const uniqueSpecies = [...new Set(sightings.map(s => s.species))];
  const rarityRecords = await prisma.rarityCode.findMany({
    where: { commonName: { in: uniqueSpecies } },
  });

  const rarityMap = new Map(rarityRecords.map(r => [r.commonName, r.abaCode]));

  for (const sighting of sightings) {
    const rarity = rarityMap.get(sighting.species) || 0;

    await prisma.sighting.create({
      data: {
        species: sighting.species,
        scientificName: sighting.scientificName,
        location: sighting.location,
        date: sighting.date,
        observer: sighting.observer,
        rarity: rarity,
        details: sighting.comments,
        mapUrl: sighting.mapUrl,
        checklistUrl: sighting.checklistUrl,
      },
    });
  }

  // Automatically trigger background enrichment for all unenriched sightings
  // We return the promise so callers can wait if they want to
  if (enrich) {
    return enrichmentService.enrichAllUnenriched().catch(err => {
      console.error('Background enrichment failed:', err);
    });
  }
}
