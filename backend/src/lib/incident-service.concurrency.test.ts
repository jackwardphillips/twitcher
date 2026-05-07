import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from './db.js';
import { createIncident, addSightingToIncident } from './incident-service.js';

describe('IncidentService Concurrency', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.sighting.deleteMany();
    await db.incident.deleteMany();
  });

  it('should correctly update statesCovered with concurrent addSightingToIncident calls (forcing overlap)', async () => {
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

    // 3. Inject a delay into the FIRST update to force overlap.
    // In the BROKEN version, both will have read ['NY'] before entering the transaction.
    // In the FIXED version (later), the second one will read the updated state inside its transaction.
    
    const originalUpdate = db.incident.update;
    let updateCallCount = 0;
    vi.spyOn(db.incident, 'update').mockImplementation(async (args) => {
        updateCallCount++;
        if (updateCallCount === 1) {
            // First call stalls to let the second call start and potentially use same stale state
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        return originalUpdate.call(db.incident, args);
    });

    // Run concurrent updates
    await Promise.all([
      addSightingToIncident(db, incident, sightingNJ),
      addSightingToIncident(db, incident, sightingPA)
    ]);

    const finalIncident = await db.incident.findUnique({
      where: { id: incident.id }
    });

    const statesCovered = JSON.parse(finalIncident!.statesCovered).sort();
    
    // NOTE: This assertion is expected to FAIL on the BROKEN code because one will overwrite the other.
    // It should receive ['NJ', 'NY'] or ['NY', 'PA'] instead of ['NJ', 'NY', 'PA'].
    expect(statesCovered).toEqual(['NJ', 'NY', 'PA']);
    expect(finalIncident!.sightingCount).toBe(3);
    
    // Exhaustive assertions for Phase 6B
    expect(finalIncident!.lastSeen.toISOString()).toBe(new Date('2026-05-03T10:00:00Z').toISOString());
    expect(finalIncident!.minLat).toBeCloseTo(39.95);
    expect(finalIncident!.maxLat).toBeCloseTo(42.44);
    expect(finalIncident!.minLng).toBeCloseTo(-76.50);
    expect(finalIncident!.maxLng).toBeCloseTo(-74.66);
  });
});
