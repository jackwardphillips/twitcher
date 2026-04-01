import { MatchEngine } from './match-engine.js';
import { prisma } from './db.js';

export class EnrichmentService {
  constructor(private matchEngine: MatchEngine) {}

  async enrichSighting(sightingId: number): Promise<void> {
    const sighting = await prisma.sighting.findUnique({
      where: { id: sightingId },
    });

    if (!sighting) return;
    if (sighting.subId) return; // Already enriched

    const match = await this.matchEngine.findMatch(sighting);

    if (match) {
      await prisma.sighting.update({
        where: { id: sightingId },
        data: {
          latitude: match.lat,
          longitude: match.lng,
          subId: match.subId,
          locId: match.locId,
          speciesCode: match.speciesCode,
          howMany: match.howMany,
        },
      });
    }
  }

  async enrichAllUnenriched(): Promise<void> {
    const unenriched = await prisma.sighting.findMany({
      where: {
        subId: null,
      },
    });

    for (const sighting of unenriched) {
      await this.enrichSighting(sighting.id);
    }
  }
}
