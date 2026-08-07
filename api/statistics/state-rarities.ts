import { prisma } from '../../backend/src/lib/db.js';
import { getStateRarityStats } from '../../backend/src/lib/statistics-service.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url, 'http://localhost');
    const groupBy = url.searchParams.get('groupBy') === 'state' ? 'state' : 'county';
    const requestedState = url.searchParams.get('state')?.trim();
    const requestedYear = url.searchParams.get('year');
    const active = requestedYear === 'active';
    const parsedYear = Number.parseInt(requestedYear ?? '', 10);
    const year = !active && Number.isFinite(parsedYear) ? parsedYear : undefined;
    const filters = {
      ...(requestedState ? { state: requestedState } : {}),
      ...(year ? { year } : {}),
      ...(active ? { active } : {}),
    };

    const stats = await getStateRarityStats(prisma, groupBy, filters);
    return Response.json(stats);
  } catch (error) {
    console.error('Failed to fetch state rarity statistics:', error);
    return Response.json({ error: 'Failed to fetch state rarity statistics' }, { status: 500 });
  }
}
