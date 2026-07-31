import { describe, expect, it, vi } from 'vitest';

vi.mock('./enrichment-service.js', () => ({
  EnrichmentService: {
    getRegionCode: (name: string) => ({
      Maryland: 'US-MD',
      'New York': 'US-NY',
    })[name as 'Maryland' | 'New York'] ?? null,
  },
}));

import {
  commitCatchupEmailBatch,
  dedupePollTargetDrafts,
  getCatchupEmailBatch,
  getOpenIncidentTargetDrafts,
  markCatchupEmailsHandled,
} from './poller-target-selection';

describe('poller target selection', () => {
  it('deduplicates incident and email targets by normalized species and region', () => {
    expect(dedupePollTargetDrafts([
      { speciesName: 'Ruff', regionName: 'Maryland', regionCode: 'US-MD', expectedReports: 0 },
      { speciesName: ' ruff ', regionName: 'Maryland', regionCode: 'US-MD', expectedReports: 13 },
      { speciesName: 'Ruff', regionName: 'New York', regionCode: 'US-NY', expectedReports: 7 },
    ])).toEqual([
      { speciesName: ' ruff ', regionName: 'Maryland', regionCode: 'US-MD', expectedReports: 13 },
      { speciesName: 'Ruff', regionName: 'New York', regionCode: 'US-NY', expectedReports: 7 },
    ]);
  });

  it('selects only the newest three unhandled processed emails within five days', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 5, date: new Date('2026-07-30T12:00:00Z'), rawBody: 'five' },
      { id: 4, date: new Date('2026-07-29T12:00:00Z'), rawBody: 'four' },
      { id: 3, date: new Date('2026-07-28T12:00:00Z'), rawBody: 'three' },
      { id: 2, date: new Date('2026-07-27T12:00:00Z'), rawBody: 'two' },
    ]);

    const batch = await getCatchupEmailBatch(
      { incomingEmail: { findMany } } as any,
      new Date('2026-07-31T00:00:00Z'),
    );

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: 'processed',
        pollTargetsHandledAt: null,
        date: { gte: new Date('2026-07-26T00:00:00Z') },
      },
    }));
    expect(batch.selected.map(email => email.id)).toEqual([5, 4, 3]);
    expect(batch.observedIds).toEqual([5, 4, 3, 2]);
  });

  it('marks every email observed in the snapshot only after the caller succeeds', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 4 });
    await markCatchupEmailsHandled(
      { incomingEmail: { updateMany } } as any,
      [5, 4, 3, 2],
      new Date('2026-07-31T00:05:00Z'),
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [5, 4, 3, 2] },
        pollTargetsHandledAt: null,
      },
      data: {
        pollTargetsHandledAt: new Date('2026-07-31T00:05:00Z'),
      },
    });
  });

  it('does not broaden the handled snapshot to emails that arrive later', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    await markCatchupEmailsHandled(
      { incomingEmail: { updateMany } } as any,
      [10],
    );
    expect(updateMany.mock.calls[0]![0].where.id.in).toEqual([10]);
  });

  it('does not commit the email snapshot when polling fails', async () => {
    const updateMany = vi.fn();
    await commitCatchupEmailBatch(
      { incomingEmail: { updateMany } } as any,
      [10, 11],
      false,
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('commits the exact email snapshot when polling succeeds', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    await commitCatchupEmailBatch(
      { incomingEmail: { updateMany } } as any,
      [10, 11],
      true,
      new Date('2026-07-31T01:00:00Z'),
    );
    expect(updateMany.mock.calls[0]![0].where.id.in).toEqual([10, 11]);
  });

  it('does nothing on an empty snapshot', async () => {
    const updateMany = vi.fn();
    await markCatchupEmailsHandled({ incomingEmail: { updateMany } } as any, []);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('builds and deduplicates targets only from OPEN incidents', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'open-1',
        commonName: 'Ruff',
        pollRegionName: 'Maryland',
        pollRegionCode: 'US-MD',
        primaryState: 'Maryland',
        primaryCountry: 'United States',
      },
      {
        id: 'open-2',
        commonName: 'Ruff',
        pollRegionName: 'Maryland',
        pollRegionCode: 'US-MD',
        primaryState: 'Maryland',
        primaryCountry: 'United States',
      },
    ]);

    const result = await getOpenIncidentTargetDrafts({ incident: { findMany } } as any);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'OPEN' },
    }));
    expect(result.targets).toEqual([
      { speciesName: 'Ruff', regionName: 'Maryland', regionCode: 'US-MD', expectedReports: 0 },
    ]);
  });

  it('gives a stale but still OPEN incident one final poll before post-poll closure', async () => {
    const findMany = vi.fn().mockResolvedValue([{
      id: 'stale-open',
      commonName: 'Ruff',
      pollRegionName: 'Maryland',
      pollRegionCode: 'US-MD',
      primaryState: 'Maryland',
      primaryCountry: 'United States',
    }]);

    const result = await getOpenIncidentTargetDrafts({ incident: { findMany } } as any);

    expect(result.targets).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'OPEN' },
    }));
  });

  it('produces no eBird target when there are no OPEN incidents and no email targets', async () => {
    const result = await getOpenIncidentTargetDrafts({
      incident: { findMany: vi.fn().mockResolvedValue([]) },
    } as any);
    expect(dedupePollTargetDrafts(result.targets)).toEqual([]);
  });

  it('backfills target selection from a resolvable legacy incident state', async () => {
    const result = await getOpenIncidentTargetDrafts({
      incident: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'legacy',
          commonName: 'Ruff',
          pollRegionName: null,
          pollRegionCode: null,
          primaryState: 'Maryland',
          primaryCountry: 'United States',
        }]),
      },
    } as any);

    expect(result.targets[0]).toMatchObject({ regionName: 'Maryland', regionCode: 'US-MD' });
    expect(result.unresolvedIncidentIds).toEqual([]);
  });

  it('uses legacy primaryCountry when primaryState actually contains a county', async () => {
    const result = await getOpenIncidentTargetDrafts({
      incident: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'legacy-shifted-location',
          commonName: 'Ruff',
          pollRegionName: null,
          pollRegionCode: null,
          primaryState: 'Baltimore',
          primaryCountry: 'Maryland',
        }]),
      },
    } as any);

    expect(result.targets).toEqual([{
      speciesName: 'Ruff',
      regionName: 'Maryland',
      regionCode: 'US-MD',
      expectedReports: 0,
    }]);
    expect(result.unresolvedIncidentIds).toEqual([]);
  });

  it('reports open incidents whose region cannot be resolved instead of polling broadly', async () => {
    const result = await getOpenIncidentTargetDrafts({
      incident: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'unresolved',
          commonName: 'Ruff',
          pollRegionName: null,
          pollRegionCode: null,
          primaryState: null,
          primaryCountry: null,
        }]),
      },
    } as any);

    expect(result.targets).toEqual([]);
    expect(result.unresolvedIncidentIds).toEqual(['unresolved']);
  });
});
