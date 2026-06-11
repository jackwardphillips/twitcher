import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SightingMap } from './SightingMap.js';
import '@testing-library/jest-dom';

describe('SightingMap', () => {
  it('renders a map container', () => {
    const mockIncidents = [
      {
        id: 'inc-1',
        commonName: 'Pink-footed Goose',
        scientificName: 'Anser brachyrhynchus',
        locationName: 'Corinna, Maine',
        centroidLat: 44.914,
        centroidLng: -69.277,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        sightingCount: 1,
        activeDays: 1,
        abaCode: 4,
        latestMapUrl: null,
        latestChecklistUrl: null,
        dailyCounts: [],
        photo: null
      },
    ];

    render(<SightingMap incidents={mockIncidents} />);
    
    // Check for leaflet container class
    const mapElement = document.querySelector('.leaflet-container');
    expect(mapElement).toBeInTheDocument();
  });
});
