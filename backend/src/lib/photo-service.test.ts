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
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ id: 123 }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            uri: 'https://www.inaturalist.org/observations/456',
            photos: [{
              url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/123/square.jpg',
              attribution: '(c) John Doe',
              license_code: 'cc-by',
            }],
          }],
        }),
      });

    const result = await photoService.fetchSpeciesPhoto('Cyanocitta cristata');

    const observationsRequest = new URL((fetch as any).mock.calls[1][0]);
    expect(observationsRequest.searchParams.get('photo_license')).toBe('CC0,CC-BY');
    expect(result).toEqual({
      photoUrl: 'https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg',
      attribution: '(c) John Doe',
      sourceUrl: 'https://www.inaturalist.org/observations/456',
    });

    const cached = await prisma.speciesPhoto.findUnique({
      where: { speciesName: 'Cyanocitta cristata' },
    });
    expect(cached?.photoUrl).toBe('https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg');
  });

  it('should use cached photo if available and not stale', async () => {
    await prisma.speciesPhoto.create({
      data: {
        speciesName: 'Cyanocitta cristata',
        photoUrl: 'https://cached.com/photo.jpg',
        attribution: '(c) Cached',
        sourceUrl: 'https://www.inaturalist.org/observations/456',
        fetchedAt: new Date(),
      },
    });

    const result = await photoService.fetchSpeciesPhoto('Cyanocitta cristata');

    expect(result?.photoUrl).toBe('https://cached.com/photo.jpg');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refreshes a fresh legacy photo that has no source URL', async () => {
    await prisma.speciesPhoto.create({
      data: {
        speciesName: 'Cyanocitta cristata',
        photoUrl: 'https://static.inaturalist.org/photos/123/medium.jpg',
        attribution: '(c) Legacy',
        sourceUrl: null,
        fetchedAt: new Date(),
      },
    });

    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ id: 123 }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

    expect(await photoService.needsFetch('Cyanocitta cristata')).toBe(true);
    expect(await photoService.fetchSpeciesPhoto('Cyanocitta cristata')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
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

  it.each([
    null,
    undefined,
    'cc-by-nc',
    'cc-by-sa',
    'cc-by-nd',
    'cc-by-nc-sa',
    'cc-by-nc-nd',
  ])('rejects a photo with license code %s', async (licenseCode) => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ id: 123 }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            uri: 'https://www.inaturalist.org/observations/456',
            photos: [{
              url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/123/square.jpg',
              attribution: '(c) John Doe',
              license_code: licenseCode,
            }],
          }],
        }),
      });

    expect(await photoService.fetchSpeciesPhoto('Cyanocitta cristata')).toBeNull();
  });

  it('rejects an otherwise allowed photo without an original observation URL', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ id: 123 }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            photos: [{
              url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/123/square.jpg',
              attribution: '(c) John Doe',
              license_code: 'cc-by',
            }],
          }],
        }),
      });

    expect(await photoService.fetchSpeciesPhoto('Cyanocitta cristata')).toBeNull();
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

    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ id: 123 }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            uri: 'https://www.inaturalist.org/observations/789',
            photos: [{
              url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/789/square.jpg',
              attribution: '(c) New',
              license_code: 'cc0',
            }],
          }],
        }),
      });

    const result = await photoService.fetchSpeciesPhoto('Cyanocitta cristata');

    expect(result?.photoUrl).toBe('https://inaturalist-open-data.s3.amazonaws.com/photos/789/medium.jpg');
    expect(fetch).toHaveBeenCalled();
  });
});
