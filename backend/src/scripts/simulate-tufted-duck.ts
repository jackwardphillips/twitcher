import { db as prisma } from '../lib/db.js';
import { calculateDistance } from '../lib/geo-utils.js';

// Configuration for simulation
const BASE_RADIUS_KM = 25;
const VELOCITY_KM_H = 50;
const MAX_RADIUS_KM = 200;
const TIME_WINDOW_H = 24;

async function simulate() {
  console.log('--- Tufted Duck Clustering Simulation ---');
  
  const sightings = await prisma.sighting.findMany({
    where: { species: { contains: 'Tufted Duck' } },
    orderBy: { date: 'asc' }
  });

  console.log(`Processing ${sightings.length} Tufted Duck sightings...`);

  const clusters: any[][] = [];

  for (const sighting of sightings) {
    if (!sighting.latitude || !sighting.longitude) continue;

    let matchedClusterIndex = -1;

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i]!;
      
      const isMatch = cluster.some(existing => {
        const dist = calculateDistance(
          sighting.latitude!, sighting.longitude!,
          existing.latitude!, existing.longitude!
        );

        const timeDiffHours = Math.abs(sighting.date.getTime() - existing.date.getTime()) / (1000 * 60 * 60);
        
        let allowedRadius = BASE_RADIUS_KM;
        if (timeDiffHours <= TIME_WINDOW_H) {
          allowedRadius = Math.min(MAX_RADIUS_KM, BASE_RADIUS_KM + (timeDiffHours * VELOCITY_KM_H));
        }

        return dist <= allowedRadius;
      });

      if (isMatch) {
        matchedClusterIndex = i;
        break;
      }
    }

    if (matchedClusterIndex >= 0) {
      clusters[matchedClusterIndex]!.push(sighting);
    } else {
      clusters.push([sighting]);
    }
  }

  console.log(`\nResults for Tufted Duck:`);
  clusters.forEach((c, idx) => {
    const first = c[0].date.toISOString().split('T')[0];
    const location = c[0].location.split(',').slice(-2).join(',').trim();
    console.log(`  Incident ${idx + 1}: ${c.length} sightings, started ${first} in ${location}`);
  });

  await prisma.$disconnect();
}

simulate().catch(console.error);
