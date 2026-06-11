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
    expect(response.body.ok).toBe(true);
    expect(response.body.database.ok).toBe(true);
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

  it('should return incidents with full enriched properties', async () => {
    // 1. Arrange: Create a sighting and an incident
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Normalize to noon to avoid DST/timezone edge cases
    
    const sighting = await prisma.sighting.create({
      data: {
        species: 'Common Loon',
        scientificName: 'Gavia immer',
        location: 'Sebago Lake, Cumberland, ME, USA',
        date: today,
        observer: 'Jane Doe',
        latitude: 43.8,
        longitude: -70.5,
        rarity: 2,
        mapUrl: 'http://maps.com/1',
        checklistUrl: 'http://ebird.com/1'
      }
    });

    await prisma.incident.create({
      data: {
        scientificName: 'Gavia immer',
        commonName: 'Common Loon',
        status: 'OPEN',
        minLat: 43.8, maxLat: 43.8, minLng: -70.5, maxLng: -70.5,
        firstSeen: today,
        lastSeen: today,
        sightingCount: 1,
        primaryState: 'ME',
        primaryCountry: 'USA',
        statesCovered: '["ME"]',
        sightings: {
          connect: { id: sighting.id }
        }
      }
    });

    // 2. Act
    const response = await request(app).get('/api/incidents');

    // 3. Assert
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    
    const incident = response.body[0];
    expect(incident.commonName).toBe('Common Loon');
    expect(incident.scientificName).toBe('Gavia immer');
    expect(incident.locationName).toBe('ME, USA');
    expect(incident.centroidLat).toBe(43.8);
    expect(incident.centroidLng).toBe(-70.5);
    expect(incident.activeDays).toBe(1);
    expect(incident.latestMapUrl).toBe('http://maps.com/1');
    expect(incident.latestChecklistUrl).toBe('http://ebird.com/1');
    expect(incident).toHaveProperty('dailyCounts');
    expect(Array.isArray(incident.dailyCounts)).toBe(true);
    expect(incident.dailyCounts.length).toBe(21);
    expect(incident.dailyCounts[20].count).toBe(1); // Today's count
    expect(incident).toHaveProperty('photo');
    expect(incident.sightings.length).toBe(1);
    expect(incident.sightings[0].species).toBe('Common Loon');
  });
});
