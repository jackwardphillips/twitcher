import { db as prisma } from '../lib/db.js';
import { calculateDistance } from '../lib/geo-utils.js';

// Configuration for simulation
const BASE_RADIUS_KM = 10;
const VELOCITY_KM_H = 25;
const MAX_RADIUS_KM = 100;
const TIME_WINDOW_H = 24;

async function simulate() {
  console.log('--- Clustering Simulation Sandbox ---');
  console.log(`Settings: Base=${BASE_RADIUS_KM}km, Velocity=${VELOCITY_KM_H}km/h, Max=${MAX_RADIUS_KM}km, Window=${TIME_WINDOW_H}h`);

  const sightings = await prisma.sighting.findMany({
    orderBy: { date: 'asc' }
  });

  console.log(`Processing ${sightings.length} sightings...`);

  // Group by species
  const bySpecies: Record<string, any[]> = {};
  sightings.forEach(s => {
    if (!bySpecies[s.species]) bySpecies[s.species] = [];
    bySpecies[s.species].push(s);
  });

  const results: any[] = [];

  for (const species in bySpecies) {
    const speciesSightings = bySpecies[species]!;
    const clusters: any[][] = [];

    for (const sighting of speciesSightings) {
      if (!sighting.latitude || !sighting.longitude) continue;

      let matchedClusterIndex = -1;

      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i]!;
        
        // Check if this sighting matches the cluster
        const isMatch = cluster.some(existing => {
          const dist = calculateDistance(
            sighting.latitude!, sighting.longitude!,
            existing.latitude!, existing.longitude!
          );

          const timeDiffHours = Math.abs(sighting.date.getTime() - existing.date.getTime()) / (1000 * 60 * 60);
          
          // Velocity-aware radius logic
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

    if (clusters.length > 0) {
      results.push({
        species,
        clusterCount: clusters.length,
        totalSightings: speciesSightings.length
      });
      
      if (species.includes("Cook's Petrel")) {
        console.log(`\n[Detailed View: ${species}]`);
        clusters.forEach((c, idx) => {
          const first = c[0].date.toISOString().split('T')[0];
          const last = c[c.length - 1].date.toISOString().split('T')[0];
          console.log(`  Cluster ${idx + 1}: ${c.length} sightings, from ${first} to ${last}`);
          if (c.length > 1) {
             const lats = c.map(s => s.latitude);
             const minLat = Math.min(...lats);
             const maxLat = Math.max(...lats);
             console.log(`    Lat Span: ${minLat.toFixed(2)} to ${maxLat.toFixed(2)}`);
          }
        });
      }
    }
  }

  // Final Summary
  console.log('\n--- Simulation Summary ---');
  const speciesOfInterest = ["Cook's Petrel", "Snowy Owl", "Great Gray Owl", "Slaty-backed Gull"];
  results.filter(r => speciesOfInterest.some(s => r.species.includes(s))).forEach(r => {
    console.log(`${r.species.padEnd(25)}: ${r.clusterCount} incidents (${r.totalSightings} sightings)`);
  });

  await prisma.$disconnect();
}

simulate().catch(console.error);
