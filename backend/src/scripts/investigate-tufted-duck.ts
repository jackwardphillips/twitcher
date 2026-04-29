import { prisma } from '../lib/db.js';

async function main() {
  const sightings = await prisma.sighting.findMany({
    where: { 
      species: { contains: 'Tufted Duck' },
      location: { contains: 'Dutchess' }
    },
    include: { incident: true }
  });
  console.log(JSON.stringify(sightings, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
