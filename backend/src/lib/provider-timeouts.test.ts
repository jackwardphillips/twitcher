import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EbirdClient } from './ebird-client.js';
import { PhotoService } from './photo-service.js';
import { LocationResolver } from './location-resolver.js';
import type { EbirdObservation } from './ebird-client.js';

vi.mock('./db.js', () => ({ prisma: {
  speciesPhoto: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
} }));

describe('provider deadlines', () => {
  let aborted: number;
  beforeEach(() => {
    vi.useFakeTimers();
    aborted = 0;
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), ms);
      return controller.signal;
    });
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        aborted++;
        reject(options.signal.reason);
      }, { once: true });
    })));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('aborts stalled eBird calls and stops after three attempts', async () => {
    const result = new EbirdClient('test-key').getTaxonomy().catch(error => error);
    await vi.advanceTimersByTimeAsync(100_000);
    expect((await result).name).toBe('TimeoutError');
    expect(aborted).toBe(3);
  });

  it('returns no photo after a stalled lookup and releases its in-flight claim', async () => {
    const photos = new PhotoService();
    const first = photos.fetchSpeciesPhoto('Timeout bird');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await first).toBeNull();
    const retry = photos.fetchSpeciesPhoto('Timeout bird');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await retry).toBeNull();
    expect(aborted).toBe(2);
  });

  it('falls back to the target region after a stalled reverse lookup', async () => {
    const resolver = new LocationResolver(async () => null, 0);
    const result = resolver.resolve({ locName: 'Field', lat: 42, lng: -71 } as EbirdObservation, 'Maine');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await result).toMatchObject({ source: 'target_region', state: 'Maine' });
    expect(aborted).toBe(1);
  });
});
