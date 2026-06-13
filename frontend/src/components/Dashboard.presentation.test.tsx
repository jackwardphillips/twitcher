import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

describe('Dashboard Presentation Behavioral Tests', () => {
  const mockIncidents = [
    { 
      id: 'incident-1', 
      abaCode: 5, 
      commonName: 'Rare Bird', 
      scientificName: 'Rarus birdus',
      locationName: 'Secret Spot',
      centroidLat: 42, 
      centroidLng: -71,
      firstSeen: '2026-05-10',
      lastSeen: '2026-05-15',
      sightingCount: 10,
      activeDays: 6,
      dailyCounts: [
        { date: '2026-05-10', count: 2 },
        { date: '2026-05-11', count: 8 }
      ],
      photo: { url: 'http://example.com/photo.jpg', attribution: 'Photo by Me' }
    },
    { 
      id: 'incident-2', 
      abaCode: 3, 
      commonName: 'Commonish Bird', 
      scientificName: 'Commonus birdus',
      locationName: 'Public Park',
      centroidLat: 42.1, 
      centroidLng: -71.1,
      firstSeen: '2026-05-20',
      lastSeen: '2026-05-21',
      sightingCount: 2,
      activeDays: 2,
      dailyCounts: [],
      photo: null
    }
  ];

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/api/incidents')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockIncidents
        });
      }
      if (url.endsWith('/api/ingestion-status')) {
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

  it('shows tooltip on histogram bar hover', async () => {
    render(<Dashboard />);
    await screen.findByRole('heading', { name: 'Rare Bird' });

    const bars = screen.getAllByTestId('histogram-bar');
    // Rare Bird is first in mockIncidents and first in displayed list (default sort?)
    // Actually Dashboard.tsx doesn't specify sort, but let's assume first bar of first bird.
    
    fireEvent.mouseEnter(bars[0]);

    const tooltip = await screen.findByTestId('histogram-tooltip');
    expect(tooltip).toHaveTextContent(/May 10: 2 sightings/i);

    fireEvent.mouseLeave(bars[0]);
    await waitFor(() => {
      expect(screen.queryByTestId('histogram-tooltip')).not.toBeInTheDocument();
    });
  });

  it('renders photos and placeholders correctly', async () => {
    render(<Dashboard />);
    await screen.findByRole('heading', { name: 'Rare Bird' });

    const rareBirdCard = screen.getByRole('heading', { name: 'Rare Bird' }).closest('.sighting-card');
    const rareBirdPhoto = rareBirdCard?.querySelector('img');
    expect(rareBirdPhoto).toHaveAttribute('src', 'http://example.com/photo.jpg');
    expect(rareBirdCard).toHaveTextContent('Photo by Me');

    const commonBirdCard = screen.getByRole('heading', { name: 'Commonish Bird' }).closest('.sighting-card');
    const commonBirdPlaceholder = commonBirdCard?.querySelector('.photo-placeholder');
    expect(commonBirdPlaceholder).toBeInTheDocument();
    expect(commonBirdCard?.querySelector('img')).not.toBeInTheDocument();
  });

  it('renders map markers for incidents', async () => {
    render(<Dashboard />);
    await screen.findByRole('heading', { name: 'Rare Bird' });

    const markers = await screen.findAllByTestId('marker');
    expect(markers).toHaveLength(2);
    
    // Check positions
    const positions = markers.map(m => JSON.parse(m.getAttribute('data-position') || '[]'));
    expect(positions).toContainEqual([42, -71]);
    expect(positions).toContainEqual([42.1, -71.1]);
  });

  it('groups cards without summaries together in the layout order', async () => {
    const mixedIncidents = [
      {
        id: 'incident-1',
        abaCode: 5,
        commonName: 'No Summary A',
        scientificName: 'No summaryus a',
        locationName: 'Secret Spot',
        centroidLat: 42,
        centroidLng: -71,
        firstSeen: '2026-05-10',
        lastSeen: '2026-05-15',
        sightingCount: 10,
        activeDays: 6,
        dailyCounts: [],
        photo: null,
        geminiSummary: null
      },
      {
        id: 'incident-2',
        abaCode: 5,
        commonName: 'With Summary A',
        scientificName: 'With summaryus a',
        locationName: 'Secret Spot',
        centroidLat: 42,
        centroidLng: -71,
        firstSeen: '2026-05-10',
        lastSeen: '2026-05-15',
        sightingCount: 10,
        activeDays: 6,
        dailyCounts: [],
        photo: null,
        geminiSummary: 'A concise summary for the bird.'
      },
      {
        id: 'incident-3',
        abaCode: 5,
        commonName: 'No Summary B',
        scientificName: 'No summaryus b',
        locationName: 'Secret Spot',
        centroidLat: 42,
        centroidLng: -71,
        firstSeen: '2026-05-10',
        lastSeen: '2026-05-15',
        sightingCount: 10,
        activeDays: 6,
        dailyCounts: [],
        photo: null,
        geminiSummary: null
      },
      {
        id: 'incident-4',
        abaCode: 5,
        commonName: 'With Summary B',
        scientificName: 'With summaryus b',
        locationName: 'Secret Spot',
        centroidLat: 42,
        centroidLng: -71,
        firstSeen: '2026-05-10',
        lastSeen: '2026-05-15',
        sightingCount: 10,
        activeDays: 6,
        dailyCounts: [],
        photo: null,
        geminiSummary: 'Another concise summary.'
      }
    ];

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.endsWith('/api/incidents')) {
        return Promise.resolve({
          ok: true,
          json: async () => mixedIncidents
        });
      }

      if (url.endsWith('/api/ingestion-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({})
        });
      }

      return Promise.reject(new Error('Unknown API'));
    });

    render(<Dashboard />);
    await screen.findByText('No Summary A');

    const orderedHeadings = Array.from(document.querySelectorAll('.sighting-card h3')).map(
      (node) => node.textContent
    );

    expect(orderedHeadings).toEqual([
      'With Summary A',
      'With Summary B',
      'No Summary A',
      'No Summary B'
    ]);
  });
});
