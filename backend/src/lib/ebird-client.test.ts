import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EbirdClient } from './ebird-client.js';

describe('EbirdClient', () => {
  const apiKey = 'test-api-key';
  let client: EbirdClient;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    client = new EbirdClient(apiKey);
  });

  it('should fetch notable observations for a region', async () => {
    const mockData = [{ speciesCode: 'rarbir', comName: 'Rare Bird' }];
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await client.getNotableObservations('US-NY');
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.ebird.org/v2/data/obs/US-NY/recent/notable'),
      {
        headers: { 'x-ebirdapitoken': apiKey },
      }
    );
    expect(result).toEqual(mockData);
  });

  it('should fetch checklist details', async () => {
    const mockData = { subId: 'S123', obs: [] };
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await client.getChecklist('S123');
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.ebird.org/v2/product/checklist/view/S123'),
      {
        headers: { 'x-ebirdapitoken': apiKey },
      }
    );
    expect(result).toEqual(mockData);
  });

  it('should throw an error if the API request fails', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    await expect(client.getNotableObservations('US-NY'))
      .rejects.toThrow('eBird API error 403: Forbidden');
  });
});
