import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SightingMap } from './SightingMap.js';
import '@testing-library/jest-dom';

describe('SightingMap', () => {
  it('renders a map container', () => {
    const mockSightings = [
      {
        id: 1,
        species: 'Pink-footed Goose',
        location: 'Corinna, Maine',
        latitude: 44.914,
        longitude: -69.277,
        date: new Date().toISOString(),
        observer: 'Alexander Dabbs',
      },
    ];

    render(<SightingMap sightings={mockSightings} />);
    
    // Check for leaflet container class
    const mapElement = document.querySelector('.leaflet-container');
    expect(mapElement).toBeInTheDocument();
  });
});
