import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EbirdClient } from './ebird-client.js';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../test/mocks/server';

describe('EbirdClient Integration', () => {
  const client = new EbirdClient('test-key');

  it('should retry on network errors and eventually succeed', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    
    server.use(
      http.get('*/data/obs/*/recent/notable', () => {
        attempts++;
        if (attempts < 3) {
          // Simulate network error (e.g., connection reset)
          return HttpResponse.error();
        }
        return HttpResponse.json([{ speciesCode: 'test' }]);
      })
    );

    // We need to mock console.warn to avoid cluttering test output and to verify it was called
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const promise = client.getNotableObservations('US-PA', 1);

    // Fast-forward through retries
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toHaveLength(1);
    expect(attempts).toBe(3);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    
    warnSpy.mockRestore();
    vi.useRealTimers();
  });

  it('should fail after maximum retries', async () => {
    server.use(
      http.get('*/data/obs/*/recent/notable', () => {
        return HttpResponse.error();
      })
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(client.getNotableObservations('US-PA', 1)).rejects.toThrow();
    
    warnSpy.mockRestore();
  });

  it('should handle slow network responses without retrying if it eventually succeeds', async () => {
    server.use(
      http.get('*/data/obs/*/recent/notable', async () => {
        await delay(500);
        return HttpResponse.json([{ speciesCode: 'slow-test' }]);
      })
    );

    const result = await client.getNotableObservations('US-PA', 1);
    expect(result[0].speciesCode).toBe('slow-test');
  });

  it('should NOT retry on 401 Unauthorized', async () => {
    let attempts = 0;
    server.use(
      http.get('*/data/obs/*/recent/notable', () => {
        attempts++;
        return new HttpResponse(null, { status: 401 });
      })
    );

    await expect(client.getNotableObservations('US-PA', 1)).rejects.toThrow('401');
    expect(attempts).toBe(1); // Should not retry auth errors
  });
});
