import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SightingMap } from './SightingMap.js';
import { RARITY_COLOR_MAP } from '../lib/rarity-utils.js';
import '@testing-library/jest-dom';

describe('SightingMap', () => {
  it('renders a MapLibre map container with rarity-colored markers', () => {
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
      {
        id: 'inc-2',
        commonName: 'Fallback Bird',
        scientificName: 'Fallbackus birdus',
        locationName: 'Unknown Field',
        centroidLat: 45.1,
        centroidLng: -70.2,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        sightingCount: 2,
        activeDays: 2,
        abaCode: null,
        latestMapUrl: null,
        latestChecklistUrl: null,
        dailyCounts: [],
        photo: null
      },
    ];

    render(<SightingMap incidents={mockIncidents} />);
    
    const mapElement = document.querySelector('.sighting-map');
    expect(mapElement).toBeInTheDocument();

    const markers = document.querySelectorAll('.sighting-map-marker');
    expect(markers).toHaveLength(2);
    expect(markers[0]).toHaveStyle({ '--marker-color': RARITY_COLOR_MAP[4] });
    expect(markers[1]).toHaveStyle({ '--marker-color': RARITY_COLOR_MAP[5] });
  });
});
