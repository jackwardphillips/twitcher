import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from './Dashboard.js';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // Mock navigator.geolocation
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn(),
      },
    });
  });

  const mockIncidents = [
    {
      id: 'inc-1',
      scientificName: 'Species 1',
      commonName: 'Near Bird',
      abaCode: 3,
      centroidLat: 45.0,
      centroidLng: -70.0,
      locationName: 'Near Location',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      sightingCount: 5,
      activeDays: 3,
    },
    {
      id: 'inc-2',
      scientificName: 'Species 2',
      commonName: 'Far Bird',
      abaCode: 3,
      centroidLat: 30.0,
      centroidLng: -110.0,
      locationName: 'Far Location',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      sightingCount: 2,
      activeDays: 1,
    },
  ];

  describe('Rarity Filtering', () => {
    it('defaults to showing rarities 3, 4, 5, 6', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          ...mockIncidents,
          { id: 'inc-3', commonName: 'Rarity 4 Bird', abaCode: 4, centroidLat: 0, centroidLng: 0, locationName: 'Loc', firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), sightingCount: 1, activeDays: 1 },
          { id: 'inc-4', commonName: 'Rarity 1 Bird', abaCode: 1, centroidLat: 0, centroidLng: 0, locationName: 'Loc', firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), sightingCount: 1, activeDays: 1 },
          { id: 'inc-5', commonName: 'Rarity 2 Bird', abaCode: 2, centroidLat: 0, centroidLng: 0, locationName: 'Loc', firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), sightingCount: 1, activeDays: 1 },
        ],
      } as Response);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lastIngestedEmailDate: null, lastRun: null }),
      } as Response);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Near Bird')).toBeInTheDocument(); // Rarity 3
        expect(screen.getByText('Rarity 4 Bird')).toBeInTheDocument(); // Rarity 4
        expect(screen.queryByText('Rarity 1 Bird')).not.toBeInTheDocument(); // Rarity 1
        expect(screen.queryByText('Rarity 2 Bird')).not.toBeInTheDocument(); // Rarity 2
      });
    });

    it('filters incidents when rarity toggles are clicked', async () => {
      const incidentsWithRarity1 = [
        ...mockIncidents,
        { id: 'inc-4', commonName: 'Rarity 1 Bird', abaCode: 1, centroidLat: 0, centroidLng: 0, locationName: 'Loc', firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), sightingCount: 1, activeDays: 1 },
      ];
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => incidentsWithRarity1,
      } as Response);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lastIngestedEmailDate: null, lastRun: null }),
      } as Response);

      render(<Dashboard />);

      await waitFor(() => expect(screen.getByText('Near Bird')).toBeInTheDocument());
      expect(screen.queryByText('Rarity 1 Bird')).not.toBeInTheDocument();

      // Enable Rarity 1
      const rarity1Btn = await screen.findByRole('button', { name: /1/ });
      fireEvent.click(rarity1Btn);

      await waitFor(() => {
        expect(screen.getByText('Rarity 1 Bird')).toBeInTheDocument();
      });

      // Disable Rarity 3 (Near Bird)
      const rarity3Btn = await screen.findByRole('button', { name: /3/ });
      fireEvent.click(rarity3Btn);

      await waitFor(() => {
        expect(screen.queryByText('Near Bird')).not.toBeInTheDocument();
      });
    });

    it('prevents deselecting the last active rarity code', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncidents,
      } as Response);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lastIngestedEmailDate: null, lastRun: null }),
      } as Response);

      render(<Dashboard />);

      await waitFor(() => expect(screen.getByText('Near Bird')).toBeInTheDocument());

      // Deselect 4, 5, 6 (only 3 left)
      fireEvent.click(await screen.findByRole('button', { name: /4/ }));
      fireEvent.click(await screen.findByRole('button', { name: /5/ }));
      fireEvent.click(await screen.findByRole('button', { name: /6/ }));

      // Try to deselect 3
      const rarity3Btn = await screen.findByRole('button', { name: /3/ });
      fireEvent.click(rarity3Btn);

      // Should still be visible because it was the last one
      await waitFor(() => {
        expect(screen.getByText('Near Bird')).toBeInTheDocument();
      });
    });
  });

  it('renders a list of incidents with activity badges', async () => {
    const incidentsWithActivity = [
      {
        ...mockIncidents[0],
        activeDays: 5,
      },
    ];

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => incidentsWithActivity,
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lastIngestedEmailDate: '2026-04-01T12:00:00Z',
        lastRun: { status: 'success' }
      }),
    } as Response);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Near Bird')).toBeInTheDocument();
      expect(screen.getByText(/Active 5 days/i)).toBeInTheDocument();
      expect(screen.getByText(/Last email ingested:/i)).toBeInTheDocument();
      expect(screen.getByText(/Apr 1, 2026/i)).toBeInTheDocument();
    });
  });

  it('displays connection issue when imap fails', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIncidents,
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lastIngestedEmailDate: '2026-04-01T12:00:00Z',
        lastRun: { status: 'imap_error', error: 'Connection failed' }
      }),
    } as Response);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/⚠️ Connection Issue/i)).toBeInTheDocument();
    });
  });

  it('filters incidents when "Near Me" is toggled', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIncidents,
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lastIngestedEmailDate: null, lastRun: null }),
    } as Response);

    // Mock geolocation response (Near 'Near Bird')
    const mockGeolocation = vi.mocked(navigator.geolocation.getCurrentPosition);
    mockGeolocation.mockImplementationOnce((success) => 
      success({
        coords: {
          latitude: 45.1,
          longitude: -70.1,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as any)
    );

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText('Near Bird')).toBeInTheDocument());
    expect(screen.getByText('Far Bird')).toBeInTheDocument();

    const toggleBtn = screen.getByText(/Filter Near Me/i);
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText('Near Bird')).toBeInTheDocument();
      expect(screen.queryByText('Far Bird')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing Near Me \(50km\)/i)).toBeInTheDocument();
    });
  });

  it('shows "no results" when no birds are nearby', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIncidents,
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lastIngestedEmailDate: null, lastRun: null }),
    } as Response);

    // Mock geolocation response (Far from both)
    const mockGeolocation = vi.mocked(navigator.geolocation.getCurrentPosition);
    mockGeolocation.mockImplementationOnce((success) => 
      success({
        coords: {
          latitude: 0,
          longitude: 0,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as any)
    );

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText('Near Bird')).toBeInTheDocument());

    const toggleBtn = screen.getByText(/Filter Near Me/i);
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.queryByText('Near Bird')).not.toBeInTheDocument();
      expect(screen.queryByText('Far Bird')).not.toBeInTheDocument();
      expect(screen.getByText(/No rare birds reported within 50km/i)).toBeInTheDocument();
    });
  });

  it('handles fetch error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    // Second fetch will be rejected if first is, but let's be safe
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lastIngestedEmailDate: null, lastRun: null }),
    } as Response);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/i)).toBeInTheDocument();
    });
  });

  it('handles geolocation not supported', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIncidents,
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lastIngestedEmailDate: null, lastRun: null }),
    } as Response);

    // Remove navigator.geolocation
    vi.stubGlobal('navigator', {});

    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Near Bird')).toBeInTheDocument());

    const toggleBtn = screen.getByText(/Filter Near Me/i);
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Geolocation is not supported/i)).toBeInTheDocument();
    });
  });

  it('handles geolocation error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIncidents,
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lastIngestedEmailDate: null, lastRun: null }),
    } as Response);

    // Mock geolocation error
    const mockGeolocation = vi.mocked(navigator.geolocation.getCurrentPosition);
    mockGeolocation.mockImplementationOnce((_success, error) => 
      error!({
        code: 1,
        message: 'Permission denied',
      } as GeolocationPositionError)
    );

    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Near Bird')).toBeInTheDocument());

    const toggleBtn = screen.getByText(/Filter Near Me/i);
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Location access denied: Permission denied/i)).toBeInTheDocument();
    });
  });
});
