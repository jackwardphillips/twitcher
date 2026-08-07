import { prisma } from '../../../backend/src/lib/db.js';
import { getRarityStatsOptions } from '../../../backend/src/lib/statistics-service.js';

export async function GET(): Promise<Response> {
  try {
    const options = await getRarityStatsOptions(prisma);
    return Response.json(options);
  } catch (error) {
    console.error('Failed to fetch state rarity statistic options:', error);
    return Response.json({ error: 'Failed to fetch state rarity statistic options' }, { status: 500 });
  }
}
