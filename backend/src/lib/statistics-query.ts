import type { RarityRegionGroup, RarityStatsFilters } from './statistics-service.js';

export class StatisticsQueryError extends Error {}

// Shared by local Express and production Vercel routes.
export function parseStatisticsQuery(params: URLSearchParams): {
  groupBy: RarityRegionGroup;
  filters: RarityStatsFilters;
} {
  for (const key of params.keys()) {
    if (!['groupBy', 'state', 'year'].includes(key) || params.getAll(key).length !== 1) {
      throw new StatisticsQueryError('Unknown or repeated query parameter');
    }
  }
  const groupBy = params.get('groupBy') ?? 'county';
  if (groupBy !== 'county' && groupBy !== 'state') {
    throw new StatisticsQueryError('groupBy must be county or state');
  }
  const filters: RarityStatsFilters = {};
  const state = params.get('state')?.trim();
  if (state) {
    if (state.length > 100 || /[\u0000-\u001f\u007f]/.test(state)) {
      throw new StatisticsQueryError('state must be a name of at most 100 characters without control characters');
    }
    filters.state = state;
  }
  const year = params.get('year');
  if (year === 'active') filters.active = true;
  else if (year !== null) {
    if (!/^[1-9][0-9]{3}$/.test(year)) {
      throw new StatisticsQueryError('year must be a four-digit year or active');
    }
    filters.year = Number(year);
  }
  return { groupBy, filters };
}
