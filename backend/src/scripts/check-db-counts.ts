import { prisma } from '../lib/db.js';
import { fail, pass, safeErrorMessage } from './ops-utils.js';

async function check() {
  try {
    const counts = await Promise.all([
      prisma.incomingEmail.count(),
      prisma.sighting.count(),
      prisma.incident.count(),
      prisma.speciesPhoto.count(),
      prisma.rarityCode.count(),
      prisma.ingestionRun.count(),
    ]);

    pass('table counts loaded');
    console.log(`IncomingEmail: ${counts[0]}`);
    console.log(`Sighting: ${counts[1]}`);
    console.log(`Incident: ${counts[2]}`);
    console.log(`SpeciesPhoto: ${counts[3]}`);
    console.log(`RarityCode: ${counts[4]}`);
    console.log(`IngestionRun: ${counts[5]}`);
  } catch (error) {
    fail(`table count check failed: ${safeErrorMessage(error)}`);
  } finally {
    await prisma.$disconnect();
  }
}

check();
