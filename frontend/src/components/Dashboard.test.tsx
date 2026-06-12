import { render, screen } from '@testing-library/react';
import { Dashboard, type Incident } from './Dashboard.js';
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
    const blockquote = summaryElement.closest('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote?.className).toContain('gemini-summary');
    
    const card = summaryElement.closest('.sighting-card');
    expect(card?.className).toContain('sighting-card-horizontal');
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
    const summaries = document.querySelectorAll('.gemini-summary');
    expect(summaries.length).toBe(0);
  });

  it('does not render geminiSummary when shorter than five trimmed characters', async () => {
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
      geminiSummary: '  abcd  ',
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
    expect(document.querySelectorAll('.gemini-summary').length).toBe(0);
  });

  it('does not render geminiSummary when it contains no useful', async () => {
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
      geminiSummary: 'No useful field notes were available.',
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
    expect(document.querySelectorAll('.gemini-summary').length).toBe(0);
  });
});
