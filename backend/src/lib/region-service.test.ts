import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegionService } from './region-service.js';
import { EbirdClient } from './ebird-client.js';

describe('RegionService', () => {
  let ebirdClientMock: any;
  let regionService: RegionService;

  beforeEach(() => {
    ebirdClientMock = {
      getSubregions: vi.fn(),
    };
    regionService = new RegionService(ebirdClientMock as unknown as EbirdClient);
  });

  it('successfully finds and caches a subregion code', async () => {
    const mockSubregions = [
      { code: 'US-CA-073', name: 'San Diego' },
      { code: 'US-CA-037', name: 'Los Angeles' },
    ];
    ebirdClientMock.getSubregions.mockResolvedValue(mockSubregions);

    const code = await regionService.findSubregionCode('San Diego', 'US-CA');
    
    expect(code).toBe('US-CA-073');
    expect(ebirdClientMock.getSubregions).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const secondCode = await regionService.findSubregionCode('Los Angeles', 'US-CA');
    expect(secondCode).toBe('US-CA-037');
    expect(ebirdClientMock.getSubregions).toHaveBeenCalledTimes(1);
  });

  it('normalizes county names for matching', async () => {
    const mockSubregions = [
      { code: 'US-NY-001', name: 'Albany County' },
    ];
    ebirdClientMock.getSubregions.mockResolvedValue(mockSubregions);

    // Should match "Albany" to "Albany County"
    const code = await regionService.findSubregionCode('Albany', 'US-NY');
    expect(code).toBe('US-NY-001');

    // Should match "Albany County" to "Albany County" (case insensitive)
    const code2 = await regionService.findSubregionCode('ALBANY county', 'US-NY');
    expect(code2).toBe('US-NY-001');
  });

  it('returns null if subregion is not found', async () => {
    ebirdClientMock.getSubregions.mockResolvedValue([]);
    const code = await regionService.findSubregionCode('Unknown', 'US-CA');
    expect(code).toBeNull();
  });

  it('handles API errors gracefully by returning an empty list of subregions', async () => {
    ebirdClientMock.getSubregions.mockRejectedValue(new Error('API Down'));
    const code = await regionService.findSubregionCode('San Diego', 'US-CA');
    expect(code).toBeNull();
  });
});
