import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';

describe('Incident Schema', () => {
  it('should have the Incident model in the Prisma client', () => {
    // @ts-expect-error - Incident model should not exist yet
    const incidentFields = Object.values(Prisma.IncidentScalarFieldEnum);

    expect(incidentFields).toContain('id');
    expect(incidentFields).toContain('scientificName');
    expect(incidentFields).toContain('commonName');
    expect(incidentFields).toContain('status');
    expect(incidentFields).toContain('minLat');
    expect(incidentFields).toContain('maxLat');
    expect(incidentFields).toContain('minLng');
    expect(incidentFields).toContain('maxLng');
    expect(incidentFields).toContain('firstSeen');
    expect(incidentFields).toContain('lastSeen');
    expect(incidentFields).toContain('closedAt');
    expect(incidentFields).toContain('sightingCount');
    expect(incidentFields).toContain('primaryCounty');
    expect(incidentFields).toContain('primaryState');
    expect(incidentFields).toContain('primaryCountry');
    expect(incidentFields).toContain('statesCovered');
  });

  it('should have the incidentId field in the Sighting model', () => {
    // @ts-expect-error - incidentId should not exist yet
    const sightingFields = Object.values(Prisma.SightingScalarFieldEnum);

    expect(sightingFields).toContain('incidentId');
  });
});
