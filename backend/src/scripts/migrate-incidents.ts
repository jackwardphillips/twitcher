import { prisma } from '../lib/db.js';
import { findMatchingIncident, createIncident, addSightingToIncident, normalizeScientificName } from '../lib/incident-service.js';

async function migrate() {
  console.log('Starting historical data migration for Incidents...');

  // 1. Fetch all sightings ordered by date (oldest first)
  const sightings = await prisma.sighting.findMany({
    orderBy: { date: 'asc' },
  });

  console.log(`Found ${sightings.length} sightings to process.`);

  let createdCount = 0;
  let clusteredCount = 0;
  let skippedCount = 0;

  for (const sighting of sightings) {
    // Skip if already clustered (though we usually clear incidents before running this)
    if (sighting.incidentId) {
      skippedCount++;
      continue;
    }

    // Only cluster if we have coordinates
    if (sighting.latitude !== null && sighting.longitude !== null) {
      const normScientific = normalizeScientificName(sighting.scientificName || sighting.species);
      const matchingIncidents = await findMatchingIncident(prisma, normScientific, sighting.latitude, sighting.longitude, sighting.date);

      if (matchingIncidents.length > 0) {
        await addSightingToIncident(prisma, matchingIncidents, sighting);
        clusteredCount++;
      } else {
        await createIncident(prisma, sighting);
        createdCount++;
      }
    } else {
      skippedCount++;
    }

    if ((createdCount + clusteredCount + skippedCount) % 50 === 0) {
      console.log(`Processed ${createdCount + clusteredCount + skippedCount} sightings...`);
    }
  }

  console.log('Migration complete!');
  console.log(`Summary:`);
  console.log(`- Created Incidents: ${createdCount}`);
  console.log(`- Clustered into existing: ${clusteredCount}`);
  console.log(`- Skipped (no coords or already clustered): ${skippedCount}`);

  await prisma.$disconnect();
}

migrate().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
