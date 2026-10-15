import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatisticsPage } from './StatisticsPage.js';

describe('StatisticsPage', () => {
  const defaultYear = [2026, 2025].includes(new Date().getFullYear()) ? new Date().getFullYear() : 2026;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/options')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            states: ['NJ', 'PA'],
            years: [2026, 2025],
          }),
        });
      }

      const data = url.includes('groupBy=state')
        ? [
            {
              region: 'PA',
              total: 5,
              counts: { 3: 3, 4: 1, 5: 0, 6: 1 },
              birds: [
                { id: 'active-short', commonName: 'Active Sparrow', rarity: 3, status: 'OPEN', activeDays: 2, sightingCount: 7, firstSeen: '2026-06-01', lastSeen: '2026-06-02' },
                { id: 'closed-long', commonName: 'Long Gull', rarity: 6, status: 'CLOSED', activeDays: 40, sightingCount: 11, firstSeen: '2026-04-01', lastSeen: '2026-05-10' },
              ],
            },
          ]
        : [
            {
              region: 'Allegheny, PA',
              total: 4,
              counts: { 3: 2, 4: 1, 5: 1, 6: 0 },
              birds: [
                { id: 'active-long', commonName: 'Continuing Warbler', rarity: 3, status: 'OPEN', activeDays: 12, sightingCount: 9, firstSeen: '2026-05-01', lastSeen: '2026-05-12' },
                { id: 'closed-long', commonName: 'Historic Vireo', rarity: 5, status: 'CLOSED', activeDays: 30, sightingCount: 14, firstSeen: '2026-03-01', lastSeen: '2026-03-30' },
              ],
            },
            {
              region: 'Cape May, NJ',
              total: 1,
              counts: { 3: 0, 4: 0, 5: 1, 6: 0 },
              birds: [
                { id: 'cape-may-bird', commonName: 'Cape May Rarity', rarity: 5, status: 'OPEN', activeDays: 1, sightingCount: 1, firstSeen: '2026-06-10', lastSeen: '2026-06-10' },
              ],
            },
          ];

      return Promise.resolve({
        ok: true,
        json: async () => data,
      });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders ranked state rarity totals with stacked bar segments', async () => {
    render(<StatisticsPage />);

    expect(screen.getByRole('heading', { name: /states with the most rarities/i })).toBeInTheDocument();
    expect(await screen.findByLabelText('PA: 5 total rarities')).toBeInTheDocument();
    expect(screen.getByTitle('Code 3: 3')).toHaveStyle({ width: '60%' });
    expect(screen.getByTitle('Code 4: 1')).toHaveStyle({ width: '20%' });
    expect(screen.getByTitle('Code 6: 1')).toHaveStyle({ width: '20%' });
    expect(screen.queryByText(/code 3-6 incidents/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/rarity code colors/i)).not.toBeInTheDocument();
  });

  it('switches between county and state rankings', async () => {
    render(<StatisticsPage />);

    expect(await screen.findByLabelText('PA: 5 total rarities')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /county/i }));

    expect(await screen.findByRole('heading', { name: /counties with the most rarities/i })).toBeInTheDocument();
    expect(screen.getByText('Allegheny, PA')).toBeInTheDocument();
    expect(screen.queryByLabelText('PA: 5 total rarities')).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenLastCalledWith(`/api/statistics/state-rarities?groupBy=county&year=${defaultYear}`);
  });

  it('expands a ranking row to show referenced birds', async () => {
    render(<StatisticsPage />);

    const rowButton = await screen.findByRole('button', { name: 'PA' });
    fireEvent.click(rowButton);

    expect(screen.getByText('Active Sparrow')).toBeInTheDocument();
    expect(screen.getByText('Long Gull')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2026-06-01')).toBeInTheDocument();
    expect(document.querySelector('.state-rarity-active-pill')).toHaveTextContent('Active');
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('2026-04-01')).toBeInTheDocument();
    expect(screen.getByText('2026-05-10')).toBeInTheDocument();
  });

  it('filters rankings by state and year', async () => {
    render(<StatisticsPage />);

    expect(await screen.findByLabelText('PA: 5 total rarities')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /county/i }));
    fireEvent.change(screen.getByLabelText(/state/i), { target: { value: 'PA' } });
    fireEvent.change(screen.getByLabelText(/year/i), { target: { value: '2026' } });

    expect(global.fetch).toHaveBeenLastCalledWith('/api/statistics/state-rarities?groupBy=county&state=PA&year=2026');
  });

  it('always offers an active year filter', async () => {
    render(<StatisticsPage />);

    expect(await screen.findByLabelText('PA: 5 total rarities')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/year/i), { target: { value: 'active' } });

    expect(global.fetch).toHaveBeenLastCalledWith('/api/statistics/state-rarities?groupBy=state&year=active');
  });
  it.each(['success', 'failure'])('ignores an older request finishing with %s after a newer filter request', async (outcome) => {
    let resolveOld!: (response: unknown) => void;
    let rejectOld!: (error: Error) => void;
    const oldRequest = new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; });
    const row = (region: string) => [{ region, total: 1, counts: { 3: 1, 4: 0, 5: 0, 6: 0 }, birds: [] }];
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/options')) return Promise.resolve({ ok: true, json: async () => ({ states: ['Maine', 'Ohio'], years: [2026] }) });
      if (url.includes('state=Maine')) return oldRequest;
      return Promise.resolve({ ok: true, json: async () => row(url.includes('state=Ohio') ? 'Ohio' : 'Initial') });
    }));
    render(<StatisticsPage />);
    await screen.findByText('Initial');
    fireEvent.change(screen.getByLabelText('State/Province'), { target: { value: 'Maine' } });
    fireEvent.change(screen.getByLabelText('State/Province'), { target: { value: 'Ohio' } });
    await screen.findByLabelText('Ohio: 1 total rarities');
    await act(async () => {
      if (outcome === 'failure') rejectOld(new Error('Old request failed'));
      else resolveOld({ ok: true, json: async () => row('Maine') });
    });
    expect(screen.getByLabelText('State/Province')).toHaveValue('Ohio');
    expect(screen.getByLabelText('Ohio: 1 total rarities')).toBeInTheDocument();
    expect(screen.queryByLabelText('Maine: 1 total rarities')).not.toBeInTheDocument();
    expect(screen.queryByText(/Old request failed/)).not.toBeInTheDocument();
  });

  it.each([
    { years: [2024, 2025], expected: '2025' },
    { years: [], expected: '' },
    { years: [new Date().getFullYear() + 1, new Date().getFullYear()], expected: String(new Date().getFullYear()) },
  ])('selects an available default from $years', async ({ years, expected }) => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve({
      ok: true,
      json: async () => url.includes('/options') ? { states: [], years } : [],
    })));
    render(<StatisticsPage />);
    await waitFor(() => expect(screen.getByLabelText('Year')).toBeEnabled());
    expect(screen.getByLabelText('Year')).toHaveValue(expected);
    expect(global.fetch).toHaveBeenLastCalledWith('/api/statistics/state-rarities?groupBy=state' + (expected ? `&year=${expected}` : ''));
  });

  it('waits for options and falls back to All when options fail', async () => {
    let failOptions!: (error: Error) => void;
    const optionsRequest = new Promise((_resolve, reject) => { failOptions = reject; });
    vi.stubGlobal('fetch', vi.fn((url: string) => url.includes('/options')
      ? optionsRequest : Promise.resolve({ ok: true, json: async () => [] })));
    render(<StatisticsPage />);
    expect(screen.getByLabelText('Year')).toBeDisabled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await act(async () => { failOptions(new Error('Options unavailable')); });
    expect(screen.getByLabelText('Year')).toBeEnabled();
    expect(screen.getByLabelText('Year')).toHaveValue('');
    expect(global.fetch).toHaveBeenLastCalledWith('/api/statistics/state-rarities?groupBy=state');
  });

});
