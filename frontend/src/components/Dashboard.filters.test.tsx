import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

describe('Dashboard Filter Composition Tests', () => {
  const mockIncidents = [
    { 
      id: 'near-code3', 
      abaCode: 3, 
      commonName: 'Near Bird 3', 
      scientificName: 'Nearus birdus 3',
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
      id: 'far-code3', 
      abaCode: 3, 
      commonName: 'Far Bird 3', 
      scientificName: 'Farus birdus 3',
      locationName: 'Distant Forest',
      centroidLat: 45.0, 
      centroidLng: -75.0,
      firstSeen: '2026-05-20',
      lastSeen: '2026-05-21',
      sightingCount: 1,
      activeDays: 2,
      dailyCounts: [],
      photo: null
    },
    { 
      id: 'near-code1', 
      abaCode: 1, 
      commonName: 'Near Bird 1', 
      scientificName: 'Nearus birdus 1',
      locationName: 'Local Pond',
      centroidLat: 40.0, 
      centroidLng: -75.0,
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('combines rarity and near-me filters correctly', async () => {
    render(<Dashboard />);
    
    // Default filter: [3, 4, 5, 6]. 
    // Initially shows Near Bird 3 and Far Bird 3.
    await screen.findByText('Near Bird 3');
    await screen.findByText('Far Bird 3');
    expect(screen.queryByText('Near Bird 1')).not.toBeInTheDocument();

    // Toggle "Near Me"
    const nearMeBtn = screen.getByText(/Filter Near Me/i);
    fireEvent.click(nearMeBtn);

    // Now only Near Bird 3 should be visible
    await waitFor(() => {
      expect(screen.queryByText('Far Bird 3')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Near Bird 3')).toBeInTheDocument();

    // Now toggle Rarity Code 1 ON
    const code1Btn = screen.getByLabelText('1');
    fireEvent.click(code1Btn);

    // Now Near Bird 3 AND Near Bird 1 should be visible
    await screen.findByText('Near Bird 1');
    expect(screen.getByText('Near Bird 3')).toBeInTheDocument();
    expect(screen.queryByText('Far Bird 3')).not.toBeInTheDocument();
    
    // Toggle Near Me OFF
    fireEvent.click(nearMeBtn);
    await screen.findByText('Far Bird 3');
    expect(screen.getByText('Near Bird 3')).toBeInTheDocument();
    expect(screen.getByText('Near Bird 1')).toBeInTheDocument();
  });

  it('respects empty-state guard (cannot deselect last rarity code)', async () => {
    render(<Dashboard />);
    
    // Wait for initial load
    await screen.findByText('Near Bird 3');

    // Default: 3, 4, 5, 6 selected.
    // Deselect 4, 5, 6
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByLabelText('5'));
    fireEvent.click(screen.getByLabelText('6'));

    // Only 3 remains. Try to deselect 3.
    const code3Btn = screen.getByLabelText('3');
    fireEvent.click(code3Btn);

    // Code 3 should still be active
    expect(code3Btn).toHaveClass('active');
    
    // Near Bird 3 should still be visible
    expect(screen.getByText('Near Bird 3')).toBeInTheDocument();
  });
});
