import { prisma } from '../lib/db.js';

async function check() {
  const rarityCount = await prisma.rarityCode.count();
  const sightingCount = await prisma.sighting.count();
  console.log(`RarityCodes: ${rarityCount}`);
  console.log(`Sightings: ${sightingCount}`);
  await prisma.$disconnect();
}

check().catch(console.error);
