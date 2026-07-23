import { describe, expect, it } from 'vitest';
import { AlertTargetService } from './alert-target-service';
import type { EbirdClient } from './ebird-client';

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
