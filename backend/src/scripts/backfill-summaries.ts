import { prisma } from '../lib/db.js';
import { runSummarizationCycle } from '../lib/summarization-service.js';

/**
 * Script to backfill chase intel summaries for all active incidents.
 * This can be run manually to refresh summaries or catch up on missed processing.
 */
async function main() {
  console.log('--- Starting Chase Intel Summary Backfill ---');
  
  try {
    await runSummarizationCycle(prisma);
    console.log('--- Backfill Complete ---');
  } catch (error) {
    console.error('--- Backfill Failed ---');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
