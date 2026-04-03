import { describe, it, expect } from 'vitest';
import { calculateDistance, filterByProximity } from './geo-utils.js';

describe('geo-utils', () => {
  describe('calculateDistance', () => {
    it('calculates the distance between two points correctly (Haversine)', () => {
      // NYC to Philadelphia is roughly 130km
      const nyc = { lat: 40.7128, lng: -74.0060 };
      const philly = { lat: 39.9526, lng: -75.1652 };
      
      const distance = calculateDistance(nyc.lat, nyc.lng, philly.lat, philly.lng);
      expect(distance).toBeGreaterThan(120);
      expect(distance).toBeLessThan(140);
    });

    it('returns 0 for the same point', () => {
      const distance = calculateDistance(45, -90, 45, -90);
      expect(distance).toBe(0);
    });
  });

  describe('filterByProximity', () => {
    const mockSightings = [
      { id: 1, species: 'Near Bird', latitude: 40.7128, longitude: -74.0060 }, // NYC
      { id: 2, species: 'Far Bird', latitude: 34.0522, longitude: -118.2437 }, // LA
      { id: 3, species: 'No Coords', latitude: null, longitude: null },
    ];

    it('filters sightings within a given radius', () => {
      const userLoc = { lat: 40.7306, lng: -73.9352 }; // Near NYC
      const filtered = filterByProximity(mockSightings as any, userLoc.lat, userLoc.lng, 50);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].species).toBe('Near Bird');
    });

    it('excludes sightings without coordinates', () => {
      const userLoc = { lat: 40.7306, lng: -73.9352 };
      const filtered = filterByProximity(mockSightings as any, userLoc.lat, userLoc.lng, 5000);
      
      expect(filtered.map(s => s.species)).not.toContain('No Coords');
    });
  });
});
