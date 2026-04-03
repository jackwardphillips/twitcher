import { prisma } from './backend/src/lib/db.js';

async function checkData() {
  const sightings = await prisma.sighting.findMany({
    take: 5
  });
  console.log('--- Sightings in DB ---');
  console.log(JSON.stringify(sightings, null, 2));
}

checkData();
