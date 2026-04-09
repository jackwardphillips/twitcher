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
  const uniqueScientificNames = [...new Set(sightings.map(s => s.scientificName))].filter(Boolean) as string[];
  const rarityRecords = await prisma.rarityCode.findMany({
    where: { scientificName: { in: uniqueScientificNames } },
  });

  const rarityMap = new Map(rarityRecords.map(r => [r.scientificName, r.abaCode]));

  for (const sighting of sightings) {
    const rarity = sighting.scientificName ? (rarityMap.get(sighting.scientificName) ?? 0) : 0;

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

  // Automatically trigger background enrichment for all unenriched sightings in the last 3 days
  // We return the promise so callers can wait if they want to
if (enrich) {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const recentUnenriched = await prisma.sighting.findMany({
    where: {
      subId: null,
      date: { gte: threeDaysAgo },
    },
  });

  return enrichmentService.enrichSightings(recentUnenriched).catch(err => {
    console.error('Background enrichment failed:', err);
  });
}
}
