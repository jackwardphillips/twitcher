import { describe, expect, it } from 'vitest';
import { findExistingSightingForObservation } from './sighting-observation-match';

describe('findExistingSightingForObservation', () => {
  it('matches by species when a checklist contains multiple species', () => {
    const sightings = [
      {
        subId: 'S123',
        speciesCode: 'ruff',
        scientificName: 'Calidris pugnax',
        incidentId: 'ruff-incident',
      },
      {
        subId: 'S123',
        speciesCode: 'lesyel',
        scientificName: 'Tringa flavipes',
        incidentId: 'yellowlegs-incident',
      },
    ];

    expect(findExistingSightingForObservation(sightings, {
      subId: 'S123',
      speciesCode: 'lesyel',
      sciName: 'Tringa flavipes',
    })?.incidentId).toBe('yellowlegs-incident');
  });

  it('uses scientific name only for legacy sightings without a species code', () => {
    const sightings = [
      {
        subId: 'S123',
        speciesCode: 'ruff',
        scientificName: 'Tringa flavipes',
        incidentId: 'coded-other-species',
      },
      {
        subId: 'S123',
        speciesCode: null,
        scientificName: ' Tringa   flavipes ',
        incidentId: 'legacy-yellowlegs',
      },
    ];

    expect(findExistingSightingForObservation(sightings, {
      subId: 'S123',
      speciesCode: 'lesyel',
      sciName: 'Tringa flavipes',
    })?.incidentId).toBe('legacy-yellowlegs');
  });

  it('does not match a different species from the same checklist', () => {
    expect(findExistingSightingForObservation([{
      subId: 'S123',
      speciesCode: 'ruff',
      scientificName: 'Calidris pugnax',
      incidentId: 'ruff-incident',
    }], {
      subId: 'S123',
      speciesCode: 'lesyel',
      sciName: 'Tringa flavipes',
    })).toBeUndefined();
  });
});
