import { describe, expect, it, vi } from 'vitest';
import { getRarityStatsOptions, getStateRarityStats } from './statistics-service.js';

describe('getStateRarityStats', () => {
  it('ranks county/state regions by total code 3-6 incidents and groups counts by rarity code', async () => {
    const extraRegions = Array.from({ length: 8 }, (_, index) => ({
      scientificName: 'Birdus five',
      commonName: 'Code Five Bird',
      primaryState: `County ${index + 1}`,
      primaryCountry: 'CA',
      status: 'OPEN',
      firstSeen: new Date('2026-05-01T12:00:00Z'),
      lastSeen: new Date('2026-05-01T12:00:00Z'),
      sightingCount: 1,
    }));

    const prismaMock = {
      incident: {
        findMany: vi.fn().mockResolvedValue([
          {
            scientificName: 'Birdus three',
            commonName: 'Code Three Bird',
            primaryState: 'Allegheny',
            primaryCountry: 'PA',
            status: 'OPEN',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-03T12:00:00Z'),
            sightingCount: 3,
          },
          {
            scientificName: 'Birdus three other',
            commonName: 'Another Code Three Bird',
            primaryState: 'Allegheny',
            primaryCountry: 'PA',
            status: 'OPEN',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-04T12:00:00Z'),
            sightingCount: 4,
          },
          {
            scientificName: 'Birdus four',
            commonName: 'Code Four Bird',
            primaryState: 'Allegheny',
            primaryCountry: 'PA',
            status: 'OPEN',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-02T12:00:00Z'),
            sightingCount: 2,
          },
          {
            scientificName: 'Birdus five',
            commonName: 'Code Five Bird',
            primaryState: 'Allegheny',
            primaryCountry: 'PA',
            status: 'OPEN',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-01T12:00:00Z'),
            sightingCount: 1,
          },
          {
            scientificName: 'Birdus five',
            commonName: 'Code Five Bird',
            primaryState: 'Cape May',
            primaryCountry: 'NJ',
            status: 'OPEN',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-01T12:00:00Z'),
            sightingCount: 1,
          },
          {
            scientificName: 'Birdus common',
            commonName: 'Common Bird',
            primaryState: 'Allegheny',
            primaryCountry: 'PA',
            status: 'OPEN',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-01T12:00:00Z'),
            sightingCount: 1,
          },
          {
            scientificName: 'Birdus six',
            commonName: 'Code Six Bird',
            primaryState: 'York',
            primaryCountry: 'ME',
            status: 'OPEN',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-01T12:00:00Z'),
            sightingCount: 1,
          },
          ...extraRegions,
        ]),
      },
      rarityCode: {
        findMany: vi.fn().mockResolvedValue([
          { scientificName: 'Birdus three', commonName: 'Code Three Bird', abaCode: 3 },
          { scientificName: 'Birdus three other', commonName: 'Another Code Three Bird', abaCode: 3 },
          { scientificName: 'Birdus four', commonName: 'Code Four Bird', abaCode: 4 },
          { scientificName: 'Birdus five', commonName: 'Code Five Bird', abaCode: 5 },
          { scientificName: 'Birdus common', commonName: 'Common Bird', abaCode: 2 },
          { scientificName: 'Birdus six', commonName: 'Code Six Bird', abaCode: 6 },
        ]),
      },
    };

    const stats = await getStateRarityStats(prismaMock as any);

    expect(stats).toHaveLength(10);
    expect(stats.slice(0, 3).map(({ region, total, counts }) => ({ region, total, counts }))).toEqual([
      {
        region: 'Allegheny, PA',
        total: 4,
        counts: { 3: 2, 4: 1, 5: 1, 6: 0 },
      },
      {
        region: 'Cape May, NJ',
        total: 1,
        counts: { 3: 0, 4: 0, 5: 1, 6: 0 },
      },
      {
        region: 'County 1, CA',
        total: 1,
        counts: { 3: 0, 4: 0, 5: 1, 6: 0 },
      },
    ]);
    expect(stats).not.toContainEqual({
      region: 'York, ME',
      total: 1,
      counts: { 3: 0, 4: 0, 5: 0, 6: 1 },
    });
    expect(stats[0]?.birds.map((bird) => bird.commonName)).toEqual([
      'Another Code Three Bird',
      'Code Three Bird',
      'Code Four Bird',
      'Code Five Bird',
    ]);
    expect(stats[0]?.birds[0]).toMatchObject({
      commonName: 'Another Code Three Bird',
      sightingCount: 4,
      firstSeen: '2026-05-01',
      lastSeen: '2026-05-04',
      activeDays: 4,
    });
  });

  it('falls back to state/province when county is unavailable', async () => {
    const prismaMock = {
      incident: {
        findMany: vi.fn().mockResolvedValue([
          {
            scientificName: 'Birdus six',
            commonName: 'Code Six Bird',
            primaryState: null,
            primaryCountry: 'ME',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-01T12:00:00Z'),
            sightingCount: 1,
            status: 'OPEN',
          },
        ]),
      },
      rarityCode: {
        findMany: vi.fn().mockResolvedValue([
          { scientificName: 'Birdus six', commonName: 'Code Six Bird', abaCode: 6 },
        ]),
      },
    };

    const stats = await getStateRarityStats(prismaMock as any);

    expect(stats.map(({ region, total, counts }) => ({ region, total, counts }))).toEqual([
      {
        region: 'ME',
        total: 1,
        counts: { 3: 0, 4: 0, 5: 0, 6: 1 },
      },
    ]);
  });

  it('can rank by state/province instead of county', async () => {
    const prismaMock = {
      incident: {
        findMany: vi.fn().mockResolvedValue([
          {
            scientificName: 'Birdus three',
            commonName: 'Code Three Bird',
            primaryState: 'Allegheny',
            primaryCountry: 'PA',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-02T12:00:00Z'),
            sightingCount: 2,
            status: 'OPEN',
          },
          {
            scientificName: 'Birdus five',
            commonName: 'Code Five Bird',
            primaryState: 'Cape May',
            primaryCountry: 'NJ',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-01T12:00:00Z'),
            sightingCount: 1,
            status: 'OPEN',
          },
          {
            scientificName: 'Birdus six',
            commonName: 'Code Six Bird',
            primaryState: 'York',
            primaryCountry: 'PA',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-03T12:00:00Z'),
            sightingCount: 3,
            status: 'OPEN',
          },
        ]),
      },
      rarityCode: {
        findMany: vi.fn().mockResolvedValue([
          { scientificName: 'Birdus three', commonName: 'Code Three Bird', abaCode: 3 },
          { scientificName: 'Birdus five', commonName: 'Code Five Bird', abaCode: 5 },
          { scientificName: 'Birdus six', commonName: 'Code Six Bird', abaCode: 6 },
        ]),
      },
    };

    const stats = await getStateRarityStats(prismaMock as any, 'state');

    expect(stats.map(({ region, total, counts }) => ({ region, total, counts }))).toEqual([
      {
        region: 'PA',
        total: 2,
        counts: { 3: 1, 4: 0, 5: 0, 6: 1 },
      },
      {
        region: 'NJ',
        total: 1,
        counts: { 3: 0, 4: 0, 5: 1, 6: 0 },
      },
    ]);
  });

  it('filters rankings by state/province and first-seen year', async () => {
    const prismaMock = {
      incident: {
        findMany: vi.fn().mockResolvedValue([
          {
            scientificName: 'Birdus three',
            commonName: 'Code Three Bird',
            primaryState: 'Allegheny',
            primaryCountry: 'PA',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-01T12:00:00Z'),
            sightingCount: 1,
            status: 'OPEN',
          },
          {
            scientificName: 'Birdus five',
            commonName: 'Code Five Bird',
            primaryState: 'Cape May',
            primaryCountry: 'NJ',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-01T12:00:00Z'),
            sightingCount: 1,
            status: 'OPEN',
          },
          {
            scientificName: 'Birdus six',
            commonName: 'Code Six Bird',
            primaryState: 'York',
            primaryCountry: 'PA',
            firstSeen: new Date('2025-05-01T12:00:00Z'),
            lastSeen: new Date('2025-05-01T12:00:00Z'),
            sightingCount: 1,
            status: 'OPEN',
          },
        ]),
      },
      rarityCode: {
        findMany: vi.fn().mockResolvedValue([
          { scientificName: 'Birdus three', commonName: 'Code Three Bird', abaCode: 3 },
          { scientificName: 'Birdus five', commonName: 'Code Five Bird', abaCode: 5 },
          { scientificName: 'Birdus six', commonName: 'Code Six Bird', abaCode: 6 },
        ]),
      },
    };

    const stats = await getStateRarityStats(prismaMock as any, 'county', { state: 'PA', year: 2026 });

    expect(stats.map(({ region, total, counts }) => ({ region, total, counts }))).toEqual([
      {
        region: 'Allegheny, PA',
        total: 1,
        counts: { 3: 1, 4: 0, 5: 0, 6: 0 },
      },
    ]);
  });

  it('filters rankings to active incidents', async () => {
    const prismaMock = {
      incident: {
        findMany: vi.fn().mockResolvedValue([
          {
            scientificName: 'Birdus three',
            commonName: 'Code Three Bird',
            primaryState: 'Allegheny',
            primaryCountry: 'PA',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-01T12:00:00Z'),
            sightingCount: 1,
            status: 'OPEN',
          },
          {
            scientificName: 'Birdus five',
            commonName: 'Code Five Bird',
            primaryState: 'Cape May',
            primaryCountry: 'NJ',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
            lastSeen: new Date('2026-05-01T12:00:00Z'),
            sightingCount: 1,
            status: 'CLOSED',
          },
        ]),
      },
      rarityCode: {
        findMany: vi.fn().mockResolvedValue([
          { scientificName: 'Birdus three', commonName: 'Code Three Bird', abaCode: 3 },
          { scientificName: 'Birdus five', commonName: 'Code Five Bird', abaCode: 5 },
        ]),
      },
    };

    const stats = await getStateRarityStats(prismaMock as any, 'county', { active: true });

    expect(stats.map(({ region, total, counts }) => ({ region, total, counts }))).toEqual([
      {
        region: 'Allegheny, PA',
        total: 1,
        counts: { 3: 1, 4: 0, 5: 0, 6: 0 },
      },
    ]);
  });

  it('returns available state/province and year filter options for code 3-6 incidents', async () => {
    const prismaMock = {
      incident: {
        findMany: vi.fn().mockResolvedValue([
          {
            scientificName: 'Birdus three',
            commonName: 'Code Three Bird',
            primaryCountry: 'PA',
            firstSeen: new Date('2026-05-01T12:00:00Z'),
          },
          {
            scientificName: 'Birdus common',
            commonName: 'Common Bird',
            primaryCountry: 'NJ',
            firstSeen: new Date('2025-05-01T12:00:00Z'),
          },
          {
            scientificName: 'Birdus five',
            commonName: 'Code Five Bird',
            primaryCountry: 'AZ',
            firstSeen: new Date('2025-05-01T12:00:00Z'),
          },
        ]),
      },
      rarityCode: {
        findMany: vi.fn().mockResolvedValue([
          { scientificName: 'Birdus three', commonName: 'Code Three Bird', abaCode: 3 },
          { scientificName: 'Birdus common', commonName: 'Common Bird', abaCode: 2 },
          { scientificName: 'Birdus five', commonName: 'Code Five Bird', abaCode: 5 },
        ]),
      },
    };

    const options = await getRarityStatsOptions(prismaMock as any);

    expect(options).toEqual({
      states: ['AZ', 'PA'],
      years: [2026, 2025],
    });
  });
});
