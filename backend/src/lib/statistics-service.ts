import type { PrismaClient } from '@prisma/client';
import { formatDate, normalizeScientificName } from './incident-service.js';

type RarityBand = 3 | 4 | 5 | 6;
export type RarityRegionGroup = 'county' | 'state';

export interface StateRarityStat {
  region: string;
  total: number;
  counts: Record<RarityBand, number>;
  birds: RarityRegionBird[];
}

export interface RarityRegionBird {
  id: string;
  commonName: string;
  rarity: RarityBand;
  status: string;
  activeDays: number;
  sightingCount: number;
  firstSeen: string;
  lastSeen: string;
}

export interface RarityStatsFilters {
  state?: string;
  year?: number;
  active?: boolean;
}

export interface RarityStatsOptions {
  states: string[];
  years: number[];
}

const rarityBands: RarityBand[] = [3, 4, 5, 6];

const emptyCounts = (): Record<RarityBand, number> => ({
  3: 0,
  4: 0,
  5: 0,
  6: 0,
});

const formatRegion = (primaryState: string | null, primaryCountry: string | null): string | null => {
  const state = primaryState?.trim();
  const province = primaryCountry?.trim();

  if (state && province) return `${state}, ${province}`;
  if (state) return state;
  if (province) return province;
  return null;
};

const getRegion = (
  incident: { primaryState: string | null; primaryCountry: string | null },
  groupBy: RarityRegionGroup
) => {
  if (groupBy === 'state') return incident.primaryCountry?.trim() || null;
  return formatRegion(incident.primaryState, incident.primaryCountry);
};

const getActiveDays = (firstSeen: Date, lastSeen: Date) => {
  const first = new Date(firstSeen);
  first.setHours(12, 0, 0, 0);
  const last = new Date(lastSeen);
  last.setHours(12, 0, 0, 0);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return 1;

  return Math.floor(Math.abs(last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const sortRegionBirds = (birds: RarityRegionBird[]) => {
  birds.sort((a, b) => {
    const aActive = a.status === 'OPEN';
    const bActive = b.status === 'OPEN';
    if (aActive !== bActive) return Number(bActive) - Number(aActive);
    if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
    return a.commonName.localeCompare(b.commonName);
  });
};

export async function getStateRarityStats(
  prisma: PrismaClient,
  groupBy: RarityRegionGroup = 'county',
  filters: RarityStatsFilters = {}
): Promise<StateRarityStat[]> {
  const [incidents, rarityCodes] = await Promise.all([
    prisma.incident.findMany({
      select: {
        id: true,
        scientificName: true,
        commonName: true,
        primaryState: true,
        primaryCountry: true,
        firstSeen: true,
        lastSeen: true,
        sightingCount: true,
        status: true,
      },
    }),
    prisma.rarityCode.findMany(),
  ]);

  const rarityMap = new Map<string, number>();
  rarityCodes.forEach((rarity) => {
    if (rarity.scientificName) {
      rarityMap.set(normalizeScientificName(rarity.scientificName), rarity.abaCode);
    }
    rarityMap.set(rarity.commonName, rarity.abaCode);
  });

  const statsByRegion = new Map<string, StateRarityStat>();

  incidents.forEach((incident) => {
    const rarity = rarityMap.get(normalizeScientificName(incident.scientificName)) ?? rarityMap.get(incident.commonName);
    if (!rarityBands.includes(rarity as RarityBand)) return;
    if (filters.state && incident.primaryCountry?.trim() !== filters.state) return;
    if (filters.year && incident.firstSeen.getFullYear() !== filters.year) return;
    if (filters.active && incident.status !== 'OPEN') return;

    const region = getRegion(incident, groupBy);
    if (!region) return;

    const stat = statsByRegion.get(region) ?? {
      region,
      total: 0,
      counts: emptyCounts(),
      birds: [],
    };

    stat.total += 1;
    stat.counts[rarity as RarityBand] += 1;
    stat.birds.push({
      id: incident.id,
      commonName: incident.commonName,
      rarity: rarity as RarityBand,
      status: incident.status,
      activeDays: getActiveDays(incident.firstSeen, incident.lastSeen),
      sightingCount: incident.sightingCount,
      firstSeen: formatDate(incident.firstSeen),
      lastSeen: formatDate(incident.lastSeen),
    });
    statsByRegion.set(region, stat);
  });

  statsByRegion.forEach((stat) => sortRegionBirds(stat.birds));

  return Array.from(statsByRegion.values())
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.region.localeCompare(b.region);
    })
    .slice(0, 10);
}

export async function getRarityStatsOptions(prisma: PrismaClient): Promise<RarityStatsOptions> {
  const [incidents, rarityCodes] = await Promise.all([
    prisma.incident.findMany({
      select: {
        scientificName: true,
        commonName: true,
        primaryCountry: true,
        firstSeen: true,
      },
    }),
    prisma.rarityCode.findMany(),
  ]);

  const rarityMap = new Map<string, number>();
  rarityCodes.forEach((rarity) => {
    if (rarity.scientificName) {
      rarityMap.set(normalizeScientificName(rarity.scientificName), rarity.abaCode);
    }
    rarityMap.set(rarity.commonName, rarity.abaCode);
  });

  const states = new Set<string>();
  const years = new Set<number>();

  incidents.forEach((incident) => {
    const rarity = rarityMap.get(normalizeScientificName(incident.scientificName)) ?? rarityMap.get(incident.commonName);
    if (!rarityBands.includes(rarity as RarityBand)) return;

    const state = incident.primaryCountry?.trim();
    if (state) states.add(state);
    years.add(incident.firstSeen.getFullYear());
  });

  return {
    states: Array.from(states).sort((a, b) => a.localeCompare(b)),
    years: Array.from(years).sort((a, b) => b - a),
  };
}
