import { describe, expect, it, vi } from 'vitest';
import { hydrateSpeciesPhotos } from './poller-runtime.js';

describe('poller photo hydration', () => {
  it('refreshes each unique species that needs a photo', async () => {
    const photoService = {
      needsFetch: vi.fn(async (speciesName: string) => speciesName === 'Missing bird'),
      fetchSpeciesPhoto: vi.fn(async () => null),
    };

    const result = await hydrateSpeciesPhotos(
      ['Missing bird', 'Cached bird', 'Missing bird'],
      photoService,
    );

    expect(photoService.needsFetch).toHaveBeenCalledTimes(2);
    expect(photoService.fetchSpeciesPhoto).toHaveBeenCalledOnce();
    expect(photoService.fetchSpeciesPhoto).toHaveBeenCalledWith('Missing bird');
    expect(result).toEqual({ checked: 2, refreshed: 1, failed: 0 });
  });

  it('isolates photo failures from the rest of the hydration cycle', async () => {
    const photoService = {
      needsFetch: vi.fn(async () => true),
      fetchSpeciesPhoto: vi.fn(async (speciesName: string) => {
        if (speciesName === 'Broken bird') throw new Error('iNaturalist unavailable');
        return null;
      }),
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await hydrateSpeciesPhotos(['Broken bird', 'Healthy bird'], photoService);

    expect(photoService.fetchSpeciesPhoto).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ checked: 2, refreshed: 1, failed: 1 });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Poller photo hydration failed for Broken bird:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
