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

  const mockSightings = [
    {
      id: 1,
      species: 'Near Bird',
      location: 'Near Location',
      latitude: 45.0,
      longitude: -70.0,
      date: new Date().toISOString(),
      observer: 'Observer 1',
    },
    {
      id: 2,
      species: 'Far Bird',
      location: 'Far Location',
      latitude: 30.0,
      longitude: -110.0,
      date: new Date().toISOString(),
      observer: 'Observer 2',
    },
  ];

  it('renders a list of sightings with streak badges', async () => {
    const sightingsWithStreak = [
      {
        ...mockSightings[0],
        streak: 3,
      },
    ];

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sightingsWithStreak,
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
      expect(screen.getByText(/Seen 3 days in a row/i)).toBeInTheDocument();
      expect(screen.getByText(/Last email ingested:/i)).toBeInTheDocument();
      expect(screen.getByText(/Apr 1, 2026/i)).toBeInTheDocument();
    });
  });

  it('displays connection issue when imap fails', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSightings,
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

  it('filters sightings when "Near Me" is toggled', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSightings,
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
      json: async () => mockSightings,
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
      json: async () => mockSightings,
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
      json: async () => mockSightings,
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
