import type { Sighting } from './ebird-parser.js';
import prisma from './db.js';

export async function saveSightings(sightings: Sighting[]): Promise<void> {
  for (const sighting of sightings) {
    await prisma.sighting.create({
      data: {
        species: sighting.species,
        scientificName: sighting.scientificName,
        location: sighting.location,
        date: sighting.date,
        observer: sighting.observer,
        details: sighting.comments,
        mapUrl: sighting.mapUrl,
        checklistUrl: sighting.checklistUrl,
      },
    });
  }
}
