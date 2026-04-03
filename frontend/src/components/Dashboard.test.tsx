import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from './Dashboard.js';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders a list of sightings', async () => {
    const mockSightings = [
      {
        id: 1,
        species: 'Taiga Bean-Goose',
        location: 'Deering Rd',
        latitude: 45.0,
        longitude: -70.0,
        date: new Date().toISOString(),
        observer: 'Alexander Dabbs',
      },
    ];

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSightings,
    } as Response);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Rare Bird Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText('Taiga Bean-Goose')).toBeInTheDocument();
      expect(screen.getByText(/Deering Rd/i)).toBeInTheDocument();
      expect(screen.getByText(/Discord/i)).toBeInTheDocument();
    });
  });
});
