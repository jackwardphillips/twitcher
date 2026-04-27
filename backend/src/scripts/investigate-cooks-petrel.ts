import { prisma } from '../lib/db';
import { calculateDistance } from '../lib/geo-utils';

async function main() {
  const sightings = await prisma.sighting.findMany({
    where: {
      species: "Cook's Petrel",
      date: {
        gte: new Date('2026-04-22T00:00:00Z'),
        lt: new Date('2026-04-23T00:00:00Z'),
      },
    },
    orderBy: {
      date: 'asc',
    },
    include: {
      incident: true,
    },
  });

  console.log(`Found ${sightings.length} sightings for Cook's Petrel on 2026-04-22`);

  for (let i = 0; i < sightings.length; i++) {
    const s = sightings[i];
    console.log(`${i}: Date: ${s.date.toISOString()}, Lat: ${s.latitude}, Lng: ${s.longitude}, IncidentID: ${s.incidentId}`);
    
    if (i > 0) {
      const prev = sightings[i-1];
      const dist = calculateDistance(prev.latitude || 0, prev.longitude || 0, s.latitude || 0, s.longitude || 0);
      const timeDiffHours = (s.date.getTime() - prev.date.getTime()) / (1000 * 60 * 60);
      console.log(`   Distance from prev: ${dist.toFixed(2)}km, Time diff: ${timeDiffHours.toFixed(2)}h`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
