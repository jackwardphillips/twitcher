import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db.js';
import { saveSightings } from './sighting-service.js';
import { 
  closeInactiveIncidents, 
  getOpenIncidents 
} from './incident-service.js';
import { clearDatabase } from '../test/db-utils.js';

describe('Sighting -> Incident Integration Flow', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  const createSightingData = (species: string, sciName: string, lat: number, lng: number, date: Date) => ({
    species,
    scientificName: sciName,
    count: 1,
    confirmed: true,
    observer: 'Test Observer',
    location: `Test Loc (${lat}, ${lng})`,
    date,
    mapUrl: `http://maps.google.com/?q=${lat},${lng}`,
    checklistUrl: 'http://ebird.org/checklist/S123'
  });

  it('should cluster close sightings into the same incident and merge incidents when bridged', async () => {
    // 1. Save first sighting
    const date1 = new Date('2026-04-01T08:00:00Z');
    const s1 = createSightingData('Common Crane', 'Grus grus', 40.0001, -75.0001, date1);
    await saveSightings([s1], false); // No enrichment to keep it simple

    const incident1 = await db.incident.findFirst({
      where: { scientificName: 'Grus grus' },
      include: { sightings: true }
    });
    expect(incident1).not.toBeNull();
    expect(incident1?.sightings).toHaveLength(1);
    expect(incident1?.sightingCount).toBe(1);

    // 2. Save second sighting (close to first: ~7km)
    const date2 = new Date('2026-04-01T08:15:00Z');
    const s2 = createSightingData('Common Crane', 'Grus grus', 40.0501, -75.0501, date2);
    await saveSightings([s2], false);

    const updatedIncident1 = await db.incident.findUnique({
      where: { id: incident1!.id },
      include: { sightings: true }
    });
    expect(updatedIncident1?.sightings).toHaveLength(2);
    expect(updatedIncident1?.sightingCount).toBe(2);

    // 3. Save third sighting (far away: ~83km)
    // s1 is at 40.0001, -75.0001.
    const date3 = new Date('2026-04-01T08:30:00Z');
    const s3 = createSightingData('Common Crane', 'Grus grus', 40.6001, -75.6001, date3);
    await saveSightings([s3], false);

    const incidents = await db.incident.findMany({
      where: { scientificName: 'Grus grus' },
      orderBy: { createdAt: 'asc' }
    });
    expect(incidents).toHaveLength(2);
    
    // 4. Save fourth sighting (bridge: between s1 and s3)
    // s4 is at 40.3001, -75.3001. 
    // Dist to s1 is ~41.7km. Dist to s3 is ~41.7km.
    // Time is 11:30. 
    // Time diff to inc1 (last seen 08:15) is 3.25h. Radius = min(25 + 32.5, 50) = 50km.
    // Time diff to inc2 (last seen 08:30) is 3h. Radius = min(25 + 30, 50) = 50km.
    const date4 = new Date('2026-04-01T11:30:00Z');
    const s4 = createSightingData('Common Crane', 'Grus grus', 40.3001, -75.3001, date4);
    await saveSightings([s4], false);

    // Should merge incident1 and incident2
    const remainingIncidents = await db.incident.findMany({
      where: { scientificName: 'Grus grus' }
    });
    expect(remainingIncidents).toHaveLength(1);
    
    const finalIncident = remainingIncidents[0]!;
    const finalSightings = await db.sighting.findMany({
      where: { incidentId: finalIncident.id }
    });
    expect(finalSightings).toHaveLength(4);
    expect(finalIncident.sightingCount).toBe(4);
  });

  it('should close incidents inactive for more than 3 days', async () => {
    // 1. Create an active incident (seen today)
    const dateActive = new Date();
    const sActive = createSightingData('Active Bird', 'Bird active', 40.0001, -75.0001, dateActive);
    await saveSightings([sActive], false);

    // 2. Create an inactive incident (seen 5 days ago)
    const dateInactive = new Date();
    dateInactive.setDate(dateInactive.getDate() - 5);
    const sInactive = createSightingData('Inactive Bird', 'Bird inactive', 41.0001, -76.0001, dateInactive);
    await saveSightings([sInactive], false);

    // Verify both are open
    const openBefore = await getOpenIncidents(db);
    expect(openBefore).toHaveLength(2);

    // 3. Close inactive
    await closeInactiveIncidents(db);

    // 4. Verify only one remains open
    const openAfter = await getOpenIncidents(db);
    expect(openAfter).toHaveLength(1);
    expect(openAfter[0].scientificName).toBe('Bird active');

    const closedIncident = await db.incident.findFirst({
      where: { scientificName: 'Bird inactive' }
    });
    expect(closedIncident?.status).toBe('CLOSED');
    expect(closedIncident?.closedAt).not.toBeNull();
  });
});
