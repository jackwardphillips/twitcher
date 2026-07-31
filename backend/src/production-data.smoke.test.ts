import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './index';
import { prisma } from './lib/db';

describe('production-derived data smoke tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('serves health, sightings, incidents, and statistics without modifying data', async () => {
    const before = await Promise.all([
      prisma.sighting.count(),
      prisma.incident.count(),
      prisma.rarityCode.count(),
    ]);

    const [health, sightings, incidents, statistics] = await Promise.all([
      request(app).get('/api/health'),
      request(app).get('/api/sightings?take=5'),
      request(app).get('/api/incidents'),
      request(app).get('/api/statistics/state-rarities/options'),
    ]);

    expect(health.status).toBe(200);
    expect(health.body.database.ok).toBe(true);
    expect(sightings.status).toBe(200);
    expect(Array.isArray(sightings.body)).toBe(true);
    expect(incidents.status).toBe(200);
    expect(Array.isArray(incidents.body)).toBe(true);
    expect(statistics.status).toBe(200);

    await expect(Promise.all([
      prisma.sighting.count(),
      prisma.incident.count(),
      prisma.rarityCode.count(),
    ])).resolves.toEqual(before);
  });
});
