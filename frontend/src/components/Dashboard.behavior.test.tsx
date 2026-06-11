import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Dashboard Behavioral Tests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows loading state initially', async () => {
    // Mock fetch to never resolve during this test to keep it in loading state
    (global.fetch as any).mockReturnValue(new Promise(() => {}));
    
    render(<Dashboard />);
    expect(screen.getByText(/Loading sightings.../i)).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500
    });
    
    // Mock ingestion status to succeed so it doesn't block
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<Dashboard />);
    
    const errorMsg = await screen.findByText(/Error: Failed to fetch incidents/i);
    expect(errorMsg).toBeInTheDocument();
  });

  it('shows empty state when no incidents match filters', async () => {
    // Return empty list
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<Dashboard />);
    
    const emptyMsg = await screen.findByText(/No rare birds reported/i);
    expect(emptyMsg).toBeInTheDocument();
  });

  it('shows warning icon when ingestion status has imap_error', async () => {
    // Mock incidents to succeed
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });
    
    // Mock ingestion status with error
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lastIngestedEmailDate: new Date().toISOString(),
        lastRun: {
          status: 'imap_error',
          error: 'Connection failed'
        }
      })
    });

    render(<Dashboard />);
    
    const warning = await screen.findByTitle(/Connection failed/i);
    expect(warning).toBeInTheDocument();
    expect(warning.textContent).toContain('⚠️ Connection Issue');
  });

  it('filters by rarity correctly (behavioral)', async () => {
    const mockIncidents = [
      { id: '1', abaCode: 1, commonName: 'Common Bird', dailyCounts: [], photo: null, firstSeen: '', lastSeen: '', centroidLat: 40, centroidLng: -75 },
      { id: '2', abaCode: 4, commonName: 'Rare Bird', dailyCounts: [], photo: null, firstSeen: '', lastSeen: '', centroidLat: 40, centroidLng: -75 }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockIncidents
    });
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<Dashboard />);
    
    // Default filter is [3, 4, 5, 6]. 
    // "Common Bird" (code 1) should be hidden.
    // "Rare Bird" (code 4) should be visible.
    
    await screen.findByText('Rare Bird');
    expect(screen.queryByText('Common Bird')).not.toBeInTheDocument();
  });
});
