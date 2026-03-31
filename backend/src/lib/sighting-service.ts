import type { Sighting } from './ebird-parser.js';
import { prisma } from './db.js';

export async function saveSightings(sightings: Sighting[]): Promise<void> {
  await prisma.sighting.createMany({
    data: sightings.map(sighting => ({
      species: sighting.species,
      scientificName: sighting.scientificName,
      location: sighting.location,
      date: sighting.date,
      observer: sighting.observer,
      details: sighting.comments,
      mapUrl: sighting.mapUrl,
      checklistUrl: sighting.checklistUrl,
    })),
  });
}
