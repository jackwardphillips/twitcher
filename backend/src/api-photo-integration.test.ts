import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index';
import { prisma } from './lib/db.js';

describe('API Photo Integration', () => {
  beforeEach(async () => {
    await prisma.sighting.deleteMany({});
    await prisma.incident.deleteMany({});
    await prisma.speciesPhoto.deleteMany({});
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should trigger background photo fetch for incidents without cached photos', async () => {
    // 1. Arrange: Create an incident
    await prisma.incident.create({
      data: {
        scientificName: 'Cyanocitta cristata',
        commonName: 'Blue Jay',
        status: 'OPEN',
        minLat: 0, maxLat: 0, minLng: 0, maxLng: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
        statesCovered: '[]'
      }
    });

    const mockResponse = {
      results: [
        {
          default_photo: {
            medium_url: 'https://inat.com/bluejay.jpg',
            attribution: '(c) Photographer',
          },
        },
      ],
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    // 2. Act: Call /api/incidents
    const response = await request(app).get('/api/incidents');

    // 3. Assert: Immediate response should have photo: null
    expect(response.status).toBe(200);
    expect(response.body[0].photo).toBeNull();

    // 4. Wait for background fetch to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    expect(fetch).toHaveBeenCalled();

    // 5. Check if DB was updated
    const cached = await prisma.speciesPhoto.findUnique({
      where: { speciesName: 'Cyanocitta cristata' }
    });
    expect(cached?.photoUrl).toBe('https://inat.com/bluejay.jpg');
  });

  it('should return cached photo immediately and NOT fetch again', async () => {
    // 1. Arrange: Create cached photo and incident
    await prisma.speciesPhoto.create({
      data: {
        speciesName: 'Cyanocitta cristata',
        photoUrl: 'https://cached.com/photo.jpg',
        attribution: '(c) Cached',
        fetchedAt: new Date()
      }
    });

    await prisma.incident.create({
      data: {
        scientificName: 'Cyanocitta cristata',
        commonName: 'Blue Jay',
        status: 'OPEN',
        minLat: 0, maxLat: 0, minLng: 0, maxLng: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
        statesCovered: '[]'
      }
    });

    // 2. Act: Call /api/incidents
    const response = await request(app).get('/api/incidents');

    // 3. Assert: Immediate response should have the photo
    expect(response.status).toBe(200);
    expect(response.body[0].photo.url).toBe('https://cached.com/photo.jpg');
    expect(fetch).not.toHaveBeenCalled();
  });
});
