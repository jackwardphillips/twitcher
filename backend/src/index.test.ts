import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index';
import { prisma } from './lib/db';

describe('General API Tests', () => {
  beforeEach(async () => {
    await prisma.sighting.deleteMany();
    await prisma.incident.deleteMany();
  });

  it('should return 200 OK for the health endpoint', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('should return a list of sightings with streaks', async () => {
    // 1. Arrange: Create sightings on consecutive days
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.sighting.create({
      data: {
        species: 'Red-tailed Hawk',
        scientificName: 'Buteo jamaicensis',
        location: 'Local Park',
        date: today,
        observer: 'Alice',
        rarity: 1
      }
    });

    await prisma.sighting.create({
      data: {
        species: 'Red-tailed Hawk',
        scientificName: 'Buteo jamaicensis',
        location: 'Local Park',
        date: yesterday,
        observer: 'Bob',
        rarity: 1
      }
    });

    // 2. Act
    const response = await request(app).get('/api/sightings');

    // 3. Assert
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(response.body[0].species).toBe('Red-tailed Hawk');
    expect(response.body[0].streak).toBe(2); // Consecutive days
  });

  it('should return incidents with correct properties', async () => {
    // 1. Arrange: Create an incident
    await prisma.incident.create({
      data: {
        scientificName: 'Gavia immer',
        commonName: 'Common Loon',
        status: 'OPEN',
        minLat: 45, maxLat: 45, minLng: -70, maxLng: -70,
        firstSeen: new Date(),
        lastSeen: new Date(),
        sightingCount: 1,
        statesCovered: '["ME"]'
      }
    });

    // 2. Act
    const response = await request(app).get('/api/incidents');

    // 3. Assert
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].commonName).toBe('Common Loon');
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('scientificName');
  });
});
