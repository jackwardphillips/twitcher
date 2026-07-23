import 'dotenv/config';
import { EbirdClient } from '../lib/ebird-client.js';
import { MatchEngine } from '../lib/match-engine.js';
import { RegionService } from '../lib/region-service.js';
import { EnrichmentService } from '../lib/enrichment-service.js';
import { prisma } from '../lib/db.js';

async function main() {
  const days = Number.parseInt(process.env.DAYS ?? '7', 10);
  const limit = Number.parseInt(process.env.LIMIT ?? '25', 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (Number.isFinite(days) ? days : 7));
  console.log(`--- Enriching unenriched sightings since ${cutoff.toISOString()} ---`);

  const unenriched = await prisma.sighting.findMany({
    where: {
      subId: null,
      date: { gte: cutoff }
    },
    orderBy: { date: 'desc' },
    take: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 500)) : 25,
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
  const regionService = new RegionService(ebirdClient);
  const enrichmentService = new EnrichmentService(matchEngine, regionService);
  const run = await prisma.ingestionRun.create({
    data: {
      status: 'running',
      trigger: 'local_enrichment',
      emailsFound: 0,
      emailsIngested: 0,
    },
  });

  try {
    const result = await enrichmentService.enrichSightings(unenriched, { ingestionRunId: run.id });
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: result.failed > 0 ? 'partial_failure' : 'success',
        finishedAt: new Date(),
        sightingsAdded: result.succeeded,
      },
    });
    console.log(`Run ID: ${run.id}`);
    console.log(`Attempted: ${result.attempted}, succeeded: ${result.succeeded}, failed: ${result.failed}`);
    console.log('--- Enrichment Complete ---');
  } catch (error) {
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'error',
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    console.error('Enrichment failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
