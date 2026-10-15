import { describe, expect, it } from 'vitest';
import { parseStatisticsQuery, StatisticsQueryError } from './statistics-query.js';

describe('statistics query contract', () => {
  it('preserves default and dashboard query formats', () => {
    expect(parseStatisticsQuery(new URLSearchParams())).toEqual({ groupBy: 'county', filters: {} });
    expect(parseStatisticsQuery(new URLSearchParams({ groupBy: 'state', year: 'active' })))
      .toEqual({ groupBy: 'state', filters: { active: true } });
    expect(parseStatisticsQuery(new URLSearchParams({ groupBy: 'county', year: '2026', state: ' Québec ' })))
      .toEqual({ groupBy: 'county', filters: { year: 2026, state: 'Québec' } });
  });

  it.each(['2026junk', '2026.5', '-2026', '0', '10000', '', 'NaN'])('rejects invalid year %j', year => {
    expect(() => parseStatisticsQuery(new URLSearchParams({ year }))).toThrow(StatisticsQueryError);
  });

  it.each(['groupBy=anything', 'year=2025&year=2026', 'state=Maine&state=Ohio', 'limit=999999'])
    ('rejects ambiguous or unsupported parameters: %s', query => {
      expect(() => parseStatisticsQuery(new URLSearchParams(query))).toThrow(StatisticsQueryError);
    });

  it.each(['a'.repeat(101), 'Maine\u0000Ohio'])('rejects malformed state values', state => {
    expect(() => parseStatisticsQuery(new URLSearchParams({ state }))).toThrow(StatisticsQueryError);
  });
});
