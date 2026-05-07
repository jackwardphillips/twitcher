import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db.js';
import { createIncident, addSightingToIncident } from './incident-service.js';

describe('IncidentService Concurrency', () => {
  beforeEach(async () => {
    await db.sighting.deleteMany();
    await db.incident.deleteMany();
  });

  it('should correctly update statesCovered with concurrent addSightingToIncident calls', async () => {
    // 1. Create initial sighting and incident
    const initialSighting = await db.sighting.create({
      data: {
        species: 'Common Crane',
        scientificName: 'Grus grus',
        location: 'Ithaca, Tompkins, NY, USA',
        latitude: 42.44,
        longitude: -76.50,
        date: new Date('2026-05-01T10:00:00Z'),
        observer: 'John Doe'
      }
    });

    const incident = await createIncident(db, initialSighting);
    expect(JSON.parse(incident.statesCovered)).toEqual(['NY']);

    // 2. Prepare two concurrent sightings in DIFFERENT states
    const sightingNJ = await db.sighting.create({
      data: {
        species: 'Common Crane',
        scientificName: 'Grus grus',
        location: 'Princeton, Mercer, NJ, USA',
        latitude: 40.35,
        longitude: -74.66,
        date: new Date('2026-05-02T10:00:00Z'),
        observer: 'Jane Doe'
      }
    });

    const sightingPA = await db.sighting.create({
      data: {
        species: 'Common Crane',
        scientificName: 'Grus grus',
        location: 'Philadelphia, Philadelphia, PA, USA',
        latitude: 39.95,
        longitude: -75.16,
        date: new Date('2026-05-03T10:00:00Z'),
        observer: 'Bob Smith'
      }
    });

    // 3. Run concurrent updates. 
    // We pass the SAME 'incident' object (which only has ['NY']) to both calls.
    // If the bug exists, one will overwrite the other, resulting in either ['NY', 'NJ'] or ['NY', 'PA'].
    // If fixed, we should get ['NY', 'NJ', 'PA'] (order doesn't matter).
    
    await Promise.all([
      addSightingToIncident(db, incident, sightingNJ),
      addSightingToIncident(db, incident, sightingPA)
    ]);

    const finalIncident = await db.incident.findUnique({
      where: { id: incident.id }
    });

    const statesCovered = JSON.parse(finalIncident!.statesCovered).sort();
    expect(statesCovered).toEqual(['NJ', 'NY', 'PA']);
    expect(finalIncident!.sightingCount).toBe(3);
  });
});
