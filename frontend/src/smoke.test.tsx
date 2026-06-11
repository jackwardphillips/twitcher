import { render, screen } from '@testing-library/react';
import { App } from './App.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock Leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
}));

describe('E2E Smoke Test: Main Dashboard Flow', () => {
  const mockIncidents = [
    { 
      id: 'i1', 
      abaCode: 4, 
      commonName: 'Smoke Bird', 
      scientificName: 'Smokus birdus',
      locationName: 'Test Field',
      centroidLat: 45, centroidLng: -90,
      firstSeen: '2026-05-10', lastSeen: '2026-05-15',
      sightingCount: 5, activeDays: 6,
      dailyCounts: [], photo: null
    }
  ];

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url === '/api/incidents') {
        return Promise.resolve({ ok: true, json: async () => mockIncidents });
      }
      if (url === '/api/ingestion-status') {
        return Promise.resolve({ ok: true, json: async () => ({
          lastIngestedEmailDate: '2026-05-20T10:00:00Z',
          lastRun: { status: 'success', ingested: 1 }
        })});
      }
      if (url === '/api/ingest') {
        return Promise.resolve({ ok: true, json: async () => ({ message: 'Ingestion complete' }) });
      }
      return Promise.reject(new Error('Unknown API'));
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('performs full flow: fetch, render, and show ingestion status', async () => {
    render(<App />);

    // Check loading state
    expect(screen.getByText(/Loading sightings.../i)).toBeInTheDocument();

    // Wait for data
    await screen.findByRole('heading', { name: 'Smoke Bird' });

    // Verify incidents list
    expect(screen.getAllByText('Test Field')).not.toHaveLength(0);
    expect(screen.getAllByText(/Active 6 days/i)).not.toHaveLength(0);

    // Verify map
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('marker')).toBeInTheDocument();

    // Verify ingestion status in header
    expect(screen.getByText(/Last email ingested:/i)).toBeInTheDocument();
    expect(screen.getByText(/May 20/i)).toBeInTheDocument();
  });

  it('preserves failure messaging when ingestion dependency degrades (IMAP error)', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/incidents') {
        return Promise.resolve({ ok: true, json: async () => mockIncidents });
      }
      if (url === '/api/ingestion-status') {
        return Promise.resolve({ ok: true, json: async () => ({
          lastIngestedEmailDate: '2026-05-20T10:00:00Z',
          lastRun: { status: 'imap_error', error: 'Connection failed' }
        })});
      }
      return Promise.reject(new Error('Unknown API'));
    });

    render(<App />);
    
    await screen.findByRole('heading', { name: 'Smoke Bird' });
    
    // Verify warning icon/message
    const warning = await screen.findByTitle(/Connection failed/i);
    expect(warning).toBeInTheDocument();
    expect(warning.textContent).toContain('⚠️ Connection Issue');
  });
});
