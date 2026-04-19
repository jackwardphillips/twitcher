import { render, screen } from '@testing-library/react';
import { Dashboard, Incident } from './Dashboard.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders geminiSummary when present in incident data', async () => {
    const mockIncident: Incident = {
      id: 'inc-1',
      scientificName: 'Turdus migratorius',
      commonName: 'American Robin',
      abaCode: 4,
      centroidLat: 40.0,
      centroidLng: -75.0,
      locationName: 'PA, US',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      sightingCount: 1,
      activeDays: 1,
      latestMapUrl: null,
      latestChecklistUrl: null,
      geminiSummary: 'This bird is often found near lawns and gardens.',
      dailyCounts: [{ date: new Date().toISOString().split('T')[0], count: 1 }],
      photo: null
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockIncident]
    });
    
    // Mock ingestion status
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<Dashboard />);

    const summaryElement = await screen.findByText(/This bird is often found near lawns and gardens/);
    const paragraph = summaryElement.closest('p');
    expect(paragraph).toBeInTheDocument();
    expect(paragraph?.className).toContain('gemini-summary');
  });

  it('does not render geminiSummary when absent', async () => {
    const mockIncident: Incident = {
      id: 'inc-1',
      scientificName: 'Turdus migratorius',
      commonName: 'American Robin',
      abaCode: 4,
      centroidLat: 40.0,
      centroidLng: -75.0,
      locationName: 'PA, US',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      sightingCount: 1,
      activeDays: 1,
      latestMapUrl: null,
      latestChecklistUrl: null,
      geminiSummary: null,
      dailyCounts: [],
      photo: null
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockIncident]
    });
    
    // Mock ingestion status
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<Dashboard />);
    
    await screen.findByText('American Robin');
    const summaries = screen.queryByClassName ? screen.queryByClassName('gemini-summary') : document.querySelectorAll('.gemini-summary');
    expect(summaries.length).toBe(0);
  });
});
