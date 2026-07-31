export interface ExistingSightingIdentity {
  subId: string | null;
  speciesCode: string | null;
  scientificName: string | null;
  incidentId: string | null;
}

export interface ObservationIdentity {
  subId: string;
  speciesCode: string;
  sciName: string;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function findExistingSightingForObservation(
  sightings: ExistingSightingIdentity[],
  observation: ObservationIdentity,
): ExistingSightingIdentity | undefined {
  return sightings.find(sighting => {
    if (sighting.subId !== observation.subId) return false;
    if (sighting.speciesCode) return sighting.speciesCode === observation.speciesCode;
    return !!sighting.scientificName &&
      normalizeName(sighting.scientificName) === normalizeName(observation.sciName);
  });
}
