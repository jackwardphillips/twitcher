import { prisma } from '../backend/src/lib/db.js';
import { getOpenIncidents } from '../backend/src/lib/incident-service.js';

export async function GET(): Promise<Response> {
  try {
    const incidents = await getOpenIncidents(prisma);
    return Response.json(incidents);
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    return Response.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}
