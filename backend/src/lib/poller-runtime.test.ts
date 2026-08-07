import { afterEach, describe, expect, it, vi } from 'vitest';
import { hydrateSpeciesPhotos, validateProductionPollerEnvironment } from './poller-runtime.js';

describe('production poller preflight', () => {
  const originalGroqKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqKey;
  });

  it('fails before production work when GROQ_API_KEY is missing', () => {
    delete process.env.GROQ_API_KEY;
    expect(() => validateProductionPollerEnvironment(true))
      .toThrow('GROQ_API_KEY is required for production polling');
  });

  it('does not require Groq for dry-run polling', () => {
    delete process.env.GROQ_API_KEY;
    expect(() => validateProductionPollerEnvironment(false)).not.toThrow();
  });
});

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
