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

  async function createOpenIncident(scientificName: string, commonName: string) {
    return prisma.incident.create({
      data: {
        scientificName,
        commonName,
        status: 'OPEN',
        minLat: 0, maxLat: 0, minLng: 0, maxLng: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
        statesCovered: '[]',
        sightings: {
          create: {
            species: commonName,
            scientificName,
            location: 'Test location',
            date: new Date(),
            observer: 'Test observer',
          },
        },
      },
    });
  }

  it('should trigger background photo fetch for incidents without cached photos', async () => {
    // 1. Arrange: Create an incident
    await createOpenIncident('Cyanocitta cristata', 'Blue Jay');

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

    await createOpenIncident('Cyanocitta cristata', 'Blue Jay');

    // 2. Act: Call /api/incidents
    const response = await request(app).get('/api/incidents');

    // 3. Assert: Immediate response should have the photo
    expect(response.status).toBe(200);
    expect(response.body[0].photo.url).toBe('https://cached.com/photo.jpg');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should not fail the request if photoService.needsFetch rejects', async () => {
    // 1. Arrange: Create an incident
    await createOpenIncident('Error species', 'Error Bird');

    // Mock PhotoService.needsFetch to reject
    const PhotoService = (await import('./lib/photo-service.js')).PhotoService;
    vi.spyOn(PhotoService.prototype, 'needsFetch').mockRejectedValue(new Error('needsFetch failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 2. Act: Call /api/incidents
    const response = await request(app).get('/api/incidents');

    // 3. Assert: Request succeeds
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    
    // Cleanup
    consoleSpy.mockRestore();
  });

  it('should not fail the request if photoService.fetchSpeciesPhoto rejects', async () => {
    // 1. Arrange: Create an incident
    await createOpenIncident('Fetch error species', 'Fetch Error Bird');

    // Mock PhotoService.needsFetch to succeed, but fetchSpeciesPhoto to reject
    const PhotoService = (await import('./lib/photo-service.js')).PhotoService;
    vi.spyOn(PhotoService.prototype, 'needsFetch').mockResolvedValue(true);
    vi.spyOn(PhotoService.prototype, 'fetchSpeciesPhoto').mockRejectedValue(new Error('fetchSpeciesPhoto failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 2. Act: Call /api/incidents
    const response = await request(app).get('/api/incidents');

    // 3. Assert: Request succeeds
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);

    // Wait for background fetch attempt
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Background photo check/fetch failed'), expect.any(Error));
    
    // Cleanup
    consoleSpy.mockRestore();
  });
});
