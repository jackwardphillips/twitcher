import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Dashboard Geolocation Tests', () => {
  const mockIncidents = [
    { 
      id: 'near-1', 
      abaCode: 3, 
      commonName: 'Near Bird', 
      scientificName: 'Nearus birdus',
      locationName: 'Local Park',
      centroidLat: 40.0, 
      centroidLng: -75.0,
      firstSeen: '2026-05-20',
      lastSeen: '2026-05-21',
      sightingCount: 1,
      activeDays: 2,
      dailyCounts: [],
      photo: null
    },
    { 
      id: 'far-1', 
      abaCode: 3, 
      commonName: 'Far Bird', 
      scientificName: 'Farus birdus',
      locationName: 'Distant Forest',
      centroidLat: 45.0, 
      centroidLng: -75.0, // ~555km away from 40.0
      firstSeen: '2026-05-20',
      lastSeen: '2026-05-21',
      sightingCount: 1,
      activeDays: 2,
      dailyCounts: [],
      photo: null
    }
  ];

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url === '/api/incidents') {
        return Promise.resolve({
          ok: true,
          json: async () => mockIncidents
        });
      }
      if (url === '/api/ingestion-status') {
        return Promise.resolve({
          ok: true,
          json: async () => ({})
        });
      }
      return Promise.reject(new Error('Unknown API'));
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows error when geolocation is not supported', async () => {
    // Mock navigator.geolocation as undefined
    // Need to handle property definition because navigator is usually read-only
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      configurable: true
    });

    render(<Dashboard />);
    
    const filterBtn = await screen.findByText(/Filter Near Me/i);
    fireEvent.click(filterBtn);

    expect(screen.getByText(/Geolocation is not supported by your browser/i)).toBeInTheDocument();
  });

  it('shows error when location access is denied', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success, error) => {
        error({ message: 'User denied Geolocation' });
      })
    };
    vi.stubGlobal('navigator', { ...global.navigator, geolocation: mockGeolocation });

    render(<Dashboard />);
    
    const filterBtn = await screen.findByText(/Filter Near Me/i);
    fireEvent.click(filterBtn);

    const errorMsg = await screen.findByText(/Location access denied: User denied Geolocation/i);
    expect(errorMsg).toBeInTheDocument();
  });

  it('filters near-me incidents correctly on success', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({
          coords: {
            latitude: 40.01,
            longitude: -75.01
          }
        });
      })
    };
    vi.stubGlobal('navigator', { ...global.navigator, geolocation: mockGeolocation });

    render(<Dashboard />);
    
    // Both should be visible initially (default filter includes code 3)
    await screen.findByText('Near Bird');
    await screen.findByText('Far Bird');

    const filterBtn = screen.getByText(/Filter Near Me/i);
    fireEvent.click(filterBtn);

    // After filtering, only Near Bird should be visible
    await waitFor(() => {
      expect(screen.queryByText('Far Bird')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Near Bird')).toBeInTheDocument();
    expect(screen.getByText(/Showing Near Me \(50km\)/i)).toBeInTheDocument();

    // Toggle off
    fireEvent.click(filterBtn);
    await waitFor(() => {
      expect(screen.getByText('Far Bird')).toBeInTheDocument();
    });
    expect(screen.getByText('Near Bird')).toBeInTheDocument();
    expect(screen.getByText(/Filter Near Me/i)).toBeInTheDocument();
  });
});
