import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EbirdClient } from './ebird-client.js';
import { prisma } from './db.js';

describe('EbirdClient', () => {
  const apiKey = 'test-api-key';
  let client: EbirdClient;

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn());
    await prisma.ebirdApiCallLog.deleteMany();
    await prisma.ingestionRun.deleteMany();
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

  it('should log compact API call details when logging context is provided', async () => {
    const run = await prisma.ingestionRun.create({
      data: { status: 'running', trigger: 'test' },
    });
    const mockData = [{ speciesCode: 'ruff', comName: 'Ruff' }];
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    await client.getNotableObservations('US-NE', 30, { ingestionRunId: run.id });

    const log = await prisma.ebirdApiCallLog.findFirst({
      where: { ingestionRunId: run.id },
    });
    expect(log?.endpoint).toBe('/data/obs/US-NE/recent/notable');
    expect(log?.httpStatus).toBe(200);
    expect(log?.responseItemCount).toBe(1);
    expect(log?.paramsJson).toContain('"back":30');
    expect(log?.paramsJson).not.toContain(apiKey);
  });
});
