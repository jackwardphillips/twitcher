import type { Sighting } from './ebird-parser.js';
import { prisma } from './db.js';
import { EbirdClient } from './ebird-client.js';
import { MatchEngine } from './match-engine.js';
import { EnrichmentService } from './enrichment-service.js';
import 'dotenv/config';

// Initialize services for background enrichment
const ebirdClient = new EbirdClient(process.env.EBIRD_API_KEY || '');
const matchEngine = new MatchEngine(ebirdClient);
const enrichmentService = new EnrichmentService(matchEngine);

export async function saveSightings(sightings: Sighting[]): Promise<void> {
  await prisma.sighting.createMany({
    data: sightings.map(sighting => ({
      species: sighting.species,
      scientificName: sighting.scientificName,
      location: sighting.location,
      date: sighting.date,
      observer: sighting.observer,
      details: sighting.comments,
      mapUrl: sighting.mapUrl,
      checklistUrl: sighting.checklistUrl,
    })),
  });

  // Automatically trigger background enrichment for all unenriched sightings
  // This is a simple 'fire and forget' approach suitable for this stage
  enrichmentService.enrichAllUnenriched().catch(err => {
    console.error('Background enrichment failed:', err);
  });
}
