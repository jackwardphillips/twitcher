import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhotoService } from './photo-service.js';
import { prisma } from './db.js';

describe('PhotoService', () => {
  let photoService: PhotoService;

  beforeEach(async () => {
    await prisma.speciesPhoto.deleteMany({});
    photoService = new PhotoService();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should fetch a photo from iNaturalist and cache it', async () => {
    const mockResponse = {
      results: [
        {
          default_photo: {
            medium_url: 'https://inat.com/photo.jpg',
            attribution: '(c) John Doe',
          },
        },
      ],
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await photoService.fetchSpeciesPhoto('Cyanocitta cristata');

    expect(result).toEqual({
      photoUrl: 'https://inat.com/photo.jpg',
      attribution: '(c) John Doe',
    });

    const cached = await prisma.speciesPhoto.findUnique({
      where: { speciesName: 'Cyanocitta cristata' },
    });
    expect(cached?.photoUrl).toBe('https://inat.com/photo.jpg');
  });

  it('should use cached photo if available and not stale', async () => {
    await prisma.speciesPhoto.create({
      data: {
        speciesName: 'Cyanocitta cristata',
        photoUrl: 'https://cached.com/photo.jpg',
        attribution: '(c) Cached',
        fetchedAt: new Date(),
      },
    });

    const result = await photoService.fetchSpeciesPhoto('Cyanocitta cristata');

    expect(result?.photoUrl).toBe('https://cached.com/photo.jpg');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle no results with negative caching', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    const result = await photoService.fetchSpeciesPhoto('Fake Species');

    expect(result).toBeNull();

    const cached = await prisma.speciesPhoto.findUnique({
      where: { speciesName: 'Fake Species' },
    });
    expect(cached).not.toBeNull();
    expect(cached?.photoUrl).toBeNull();
  });

  it('should refresh stale cache (> 30 days)', async () => {
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    await prisma.speciesPhoto.create({
      data: {
        speciesName: 'Cyanocitta cristata',
        photoUrl: 'https://old.com/photo.jpg',
        attribution: '(c) Old',
        fetchedAt: thirtyOneDaysAgo,
      },
    });

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            default_photo: {
              medium_url: 'https://new.com/photo.jpg',
              attribution: '(c) New',
            },
          },
        ],
      }),
    });

    const result = await photoService.fetchSpeciesPhoto('Cyanocitta cristata');

    expect(result?.photoUrl).toBe('https://new.com/photo.jpg');
    expect(fetch).toHaveBeenCalled();
  });
});
