import { describe, expect, it, vi } from 'vitest';
import { AlertTargetService } from './alert-target-service';
import type { EbirdClient } from './ebird-client';

vi.mock('./db.js', () => ({ prisma: {} }));

describe('AlertTargetService', () => {
  const service = new AlertTargetService({} as EbirdClient);

  it('resolves summary regions with the shared eBird region mapping', () => {
    const targets = service.parseTargetsFromEmail(`
*** Species Summary:

Curlew Sandpiper (97 Michigan)
Christmas Shearwater (2 Midway Atoll)
Tufted Duck (1 NWT)

---------------------------------------------
`);

    expect(targets).toEqual([
      { speciesName: 'Curlew Sandpiper', expectedReports: 97, regionName: 'Michigan', regionCode: 'US-MI' },
      { speciesName: 'Christmas Shearwater', expectedReports: 2, regionName: 'Midway Atoll', regionCode: 'UM-71' },
      { speciesName: 'Tufted Duck', expectedReports: 1, regionName: 'NWT', regionCode: 'CA-NT' },
    ]);
  });
});


describe('provider observation dates', () => {
  const target = {
    id: 'target-1', speciesName: 'Test bird', speciesCode: 'test',
    regionName: 'Michigan', regionCode: 'US-MI', expectedReports: 1,
  };

  it.each(['not-a-date', '', '2026-02-30 12:00', '2026-02-29',
    '2026-13-01', '2026-05-01 24:00', '2026-05-01 12:60'])(
    'reports invalid date %j before writing sightings', async obsDt => {
      const client = { getSpeciesObservations: vi.fn().mockResolvedValue([
        { subId: 'checklist-1', obsDt: '2026-05-01 12:00' },
        { subId: 'checklist-2', obsDt },
      ]) };
      // Any accidental database access would fail against the empty mock.
      const result = await new AlertTargetService(client as unknown as EbirdClient)
        .pollTarget(target, { dryRun: true, writeSightings: true });
      expect(result.status).toBe('error');
      expect(result.errorMessage).toBe('Invalid eBird observation date for checklist checklist-2');
      expect(result.sightingsCreated).toBe(0);
    },
  );

  it.each(['2026-05-01', '2026-05-01 12:00', '2024-02-29 23:59'])(
    'accepts valid provider date %s', async obsDt => {
      const client = { getSpeciesObservations: vi.fn().mockResolvedValue([
        { subId: 'checklist-1', obsDt },
      ]) };
      const result = await new AlertTargetService(client as unknown as EbirdClient).pollTarget(target);
      expect(result.status).toBe('success');
      expect(result.observationsFound).toBe(1);
    },
  );
});
