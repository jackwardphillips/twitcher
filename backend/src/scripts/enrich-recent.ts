import 'dotenv/config';
import { EbirdClient } from '../lib/ebird-client.js';
import { MatchEngine } from '../lib/match-engine.js';
import { RegionService } from '../lib/region-service.js';
import { EnrichmentService } from '../lib/enrichment-service.js';
import { prisma } from '../lib/db.js';

async function main() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  console.log(`--- Enriching unenriched sightings since ${cutoff.toISOString()} ---`);

  const unenriched = await prisma.sighting.findMany({
    where: {
      subId: null,
      date: { gte: cutoff }
    }
  });

  console.log(`Found ${unenriched.length} unenriched sightings.`);

  if (unenriched.length === 0) {
    console.log('Nothing to enrich. Exiting.');
    await prisma.$disconnect();
    return;
  }

  if (!process.env.EBIRD_API_KEY) {
    console.error('ERROR: EBIRD_API_KEY is not set in backend/.env');
    process.exit(1);
  }
  const ebirdClient = new EbirdClient(process.env.EBIRD_API_KEY);
  const matchEngine = new MatchEngine(ebirdClient);
  const regionService = new RegionService();
  const enrichmentService = new EnrichmentService(matchEngine, regionService);

  try {
    await enrichmentService.enrichSightings(unenriched);
    console.log('--- Enrichment Complete ---');
  } catch (error) {
    console.error('Enrichment failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});