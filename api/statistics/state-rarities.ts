import { prisma } from '../../backend/src/lib/db.js';
import { getStateRarityStats } from '../../backend/src/lib/statistics-service.js';

import { parseStatisticsQuery, StatisticsQueryError } from '../../backend/src/lib/statistics-query.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url, 'http://localhost');
    const { groupBy, filters } = parseStatisticsQuery(url.searchParams);

    const stats = await getStateRarityStats(prisma, groupBy, filters);
    return Response.json(stats);
  } catch (error) {
    if (error instanceof StatisticsQueryError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to fetch state rarity statistics:', error);
    return Response.json({ error: 'Failed to fetch state rarity statistics' }, { status: 500 });
  }
}
