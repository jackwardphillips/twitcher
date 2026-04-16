import { prisma } from '../lib/db.js';
import { findMatchingIncident, createIncident, addSightingToIncident, normalizeScientificName } from '../lib/incident-service.js';

async function recluster() {
  console.log('Starting re-clustering of all sightings...');

  const sightings = await prisma.sighting.findMany({
    orderBy: { date: 'asc' }
  });

  console.log(`Found ${sightings.length} sightings.`);

  // Use a transaction to ensure integrity
  await prisma.$transaction(async (tx) => {
    // 1. Clear existing incidents
    console.log('Clearing existing incidents...');
    await tx.sighting.updateMany({
      data: { incidentId: null }
    });
    await tx.incident.deleteMany({});

    // 2. Re-cluster each sighting
    let created = 0;
    let added = 0;

    for (const sighting of sightings) {
      const normScientific = normalizeScientificName(sighting.scientificName || '', sighting.species);
      
      const match = await findMatchingIncident(
        tx as any, 
        normScientific, 
        sighting.latitude || 0, 
        sighting.longitude || 0
      );

      if (match) {
        await addSightingToIncident(tx as any, match, sighting);
        added++;
      } else {
        await createIncident(tx as any, sighting);
        created++;
      }
    }

    console.log(`Re-clustering complete: ${created} incidents created, ${added} sightings added to existing incidents.`);
  });
}

recluster()
  .catch(err => {
    console.error('Re-clustering failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
